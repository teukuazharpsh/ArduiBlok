/**
 * ArduiBlok — Real-Time Serial Plotter
 * High-performance HTML5 Canvas multi-channel data graph visualizer for Web Serial API.
 */

(function(root) {
  'use strict';

  // Plotter state
  var isPlotterOpen = false;
  var isPaused = false;
  var maxPoints = 100; // default window sample points
  var scaleMode = 'auto'; // 'auto', '0-1023', '0-255', '0-5v', '-100-100'
  var customMinY = null;
  var customMaxY = null;

  // Multi-channel data series
  // Format: { name: string, color: string, data: number[], currentValue: number }
  var channels = [];
  var channelColorPalette = [
    '#38bdf8', // Light Sky Blue
    '#a855f7', // Vivid Purple
    '#10b981', // Emerald Green
    '#f59e0b', // Amber Orange
    '#f43f5e', // Rose Red
    '#06b6d4', // Cyan
    '#eab308', // Yellow
    '#ec4899', // Pink
    '#8b5cf6', // Indigo
    '#14b8a6'  // Teal
  ];

  // Recorded data history for CSV export: array of { timestamp: string, values: (number|null)[] }
  var historyLog = [];
  var maxHistoryLog = 5000;

  // Line parsing buffer
  var rawLineBuffer = '';

  // Canvas and animation state
  var canvas = null;
  var ctx = null;
  var animFrameId = null;
  var container = null;

  // DOM elements
  var elModal = null;
  var elBtnClose = null;
  var elBtnSwitchToMonitor = null;
  var elBtnTogglePause = null;
  var elBtnClearPlot = null;
  var elSelectWindow = null;
  var elSelectScale = null;
  var elBtnExportCsv = null;
  var elBtnExportPng = null;
  var elLegendContainer = null;
  var elStatusBadge = null;
  var elSelectBaud = null;
  var elBtnToggleConnect = null;
  var elBtnResetBoard = null;

  function getThemeColors() {
    var isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
    return {
      bg: isDark ? '#0f172a' : '#f8fafc',
      grid: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)',
      axis: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)',
      text: isDark ? '#94a3b8' : '#64748b',
      textActive: isDark ? '#f1f5f9' : '#0f172a',
      crosshair: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.35)'
    };
  }

  /**
   * Parse incoming string line into numeric channels
   * Supports:
   * 1) "123.4"
   * 2) "12.3, 45.6, 78.9" or tab/space separated
   * 3) "temp:25.4, hum:60.2" or "Val1=100 Val2=200"
   */
  function parseLineData(line) {
    line = line.trim();
    if (!line) return;

    // Remove any timestamp prefix like [12:34:56.789]
    line = line.replace(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\]\s*/, '').trim();
    if (!line) return;

    var extracted = [];

    // Check if format has labels like "Suhu:25.4, Hum:60.2" or "A0: 512"
    if (line.indexOf(':') !== -1 || line.indexOf('=') !== -1) {
      // Split by comma, tab, or space that precedes next label
      var parts = line.split(/[,;\t]+/);
      if (parts.length === 1 && line.indexOf(' ') !== -1 && (line.match(/:/g) || []).length > 1) {
        parts = line.split(/\s+/);
      }

      for (var i = 0; i < parts.length; i++) {
        var part = parts[i].trim();
        if (!part) continue;
        var sepIdx = part.indexOf(':');
        if (sepIdx === -1) sepIdx = part.indexOf('=');

        if (sepIdx !== -1) {
          var label = part.substring(0, sepIdx).trim();
          var valStr = part.substring(sepIdx + 1).trim();
          var valNum = parseFloat(valStr);
          if (!isNaN(valNum)) {
            extracted.push({ name: label, value: valNum });
          }
        } else {
          var num = parseFloat(part);
          if (!isNaN(num)) {
            extracted.push({ name: 'Channel ' + (extracted.length + 1), value: num });
          }
        }
      }
    }

    // Fallback: Delimited by comma, tab, or space
    if (extracted.length === 0) {
      var tokens = line.split(/[,;\t\s]+/);
      for (var j = 0; j < tokens.length; j++) {
        var token = tokens[j].trim();
        if (!token) continue;
        var val = parseFloat(token);
        if (!isNaN(val)) {
          extracted.push({ name: 'Channel ' + (extracted.length + 1), value: val });
        }
      }
    }

    if (extracted.length > 0) {
      addPlotSample(extracted);
    }
  }

  function addPlotSample(sampleList) {
    if (isPaused) return;

    // Ensure all incoming channels exist in our series
    sampleList.forEach(function(item, idx) {
      var ch = channels.find(function(c) { return c.name === item.name; });
      if (!ch) {
        var color = channelColorPalette[channels.length % channelColorPalette.length];
        ch = {
          name: item.name,
          color: color,
          data: [],
          currentValue: item.value
        };
        // Fill pre-existing points with null or 0 for alignment
        if (channels.length > 0 && channels[0].data.length > 0) {
          var len = channels[0].data.length;
          for (var k = 0; k < len; k++) {
            ch.data.push(null);
          }
        }
        channels.push(ch);
      }
      ch.currentValue = item.value;
      ch.data.push(item.value);
    });

    // Fill missing channels with null for this time slice
    channels.forEach(function(ch) {
      var exists = sampleList.some(function(s) { return s.name === ch.name; });
      if (!exists) {
        ch.data.push(null);
      }
      // Trim to maxPoints for memory & smooth display
      if (ch.data.length > maxPoints * 2) {
        ch.data.shift();
      }
    });

    // Append to CSV history
    var now = new Date();
    var timeStr = String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0') + '.' +
      String(now.getMilliseconds()).padStart(3, '0');

    var historyRow = {
      time: timeStr,
      values: channels.map(function(c) { return c.currentValue; })
    };
    historyLog.push(historyRow);
    if (historyLog.length > maxHistoryLog) {
      historyLog.shift();
    }

    updateLegendUI();
  }

  function processIncomingChunk(chunk) {
    rawLineBuffer += chunk;
    var lines = rawLineBuffer.split(/\r?\n/);
    // Keep incomplete tail
    rawLineBuffer = lines.pop();

    for (var i = 0; i < lines.length; i++) {
      parseLineData(lines[i]);
    }
  }

  function clearPlotData() {
    channels.forEach(function(ch) {
      ch.data = [];
      ch.currentValue = 0;
    });
    channels = [];
    historyLog = [];
    rawLineBuffer = '';
    updateLegendUI();
  }

  function updateLegendUI() {
    if (!elLegendContainer) return;

    if (channels.length === 0) {
      elLegendContainer.innerHTML = '<span class="plotter-legend-empty">Menunggu data numerik dari Arduino (contoh: <code>Serial.println(nilai);</code> atau <code>Serial.print(v1); Serial.print(","); Serial.println(v2);</code>)...</span>';
      return;
    }

    var html = '';
    channels.forEach(function(ch) {
      var valDisplay = (ch.currentValue !== undefined && ch.currentValue !== null)
        ? (Number.isInteger(ch.currentValue) ? ch.currentValue : ch.currentValue.toFixed(2))
        : '--';

      html += '<div class="plotter-legend-item" style="border-left-color: ' + ch.color + ';">';
      html += '<span class="plotter-legend-dot" style="background-color: ' + ch.color + ';"></span>';
      html += '<span class="plotter-legend-name">' + escapeHtml(ch.name) + '</span>';
      html += '<span class="plotter-legend-val" style="color: ' + ch.color + ';">' + valDisplay + '</span>';
      html += '</div>';
    });

    elLegendContainer.innerHTML = html;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function resizeCanvas() {
    if (!canvas || !canvas.parentElement) return;
    var rect = canvas.parentElement.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.max(300, rect.width);
    var h = Math.max(200, rect.height);

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      if (ctx) ctx.scale(dpr, dpr);
    }
  }

  function calculateYRange() {
    if (scaleMode === '0-1023') return { min: 0, max: 1023 };
    if (scaleMode === '0-255') return { min: 0, max: 255 };
    if (scaleMode === '0-5v') return { min: 0, max: 5.0 };
    if (scaleMode === '-100-100') return { min: -100, max: 100 };

    // Auto scale based on current visible window
    var globalMin = Infinity;
    var globalMax = -Infinity;
    var hasData = false;

    channels.forEach(function(ch) {
      var slice = ch.data.slice(-maxPoints);
      for (var i = 0; i < slice.length; i++) {
        var v = slice[i];
        if (v !== null && v !== undefined && !isNaN(v)) {
          if (v < globalMin) globalMin = v;
          if (v > globalMax) globalMax = v;
          hasData = true;
        }
      }
    });

    if (!hasData) {
      return { min: 0, max: 100 };
    }

    if (globalMin === globalMax) {
      return { min: globalMin - 5, max: globalMax + 5 };
    }

    var margin = (globalMax - globalMin) * 0.1;
    return {
      min: Math.floor(globalMin - margin),
      max: Math.ceil(globalMax + margin)
    };
  }

  function renderPlot() {
    if (!ctx || !canvas) return;

    var rect = canvas.getBoundingClientRect();
    var width = rect.width;
    var height = rect.height;

    var theme = getThemeColors();

    // Clear background
    ctx.clearRect(0, 0, width, height);

    var padding = { top: 24, right: 30, bottom: 32, left: 55 };
    var plotW = width - padding.left - padding.right;
    var plotH = height - padding.top - padding.bottom;

    if (plotW <= 0 || plotH <= 0) return;

    // Y Axis Range
    var range = calculateYRange();
    var minY = range.min;
    var maxY = range.max;
    var rangeY = maxY - minY || 1;

    // Draw Plot Background Box
    ctx.fillStyle = theme.bg;
    ctx.fillRect(padding.left, padding.top, plotW, plotH);

    // Draw Grid Lines & Y Axis Labels
    var ySteps = 5;
    ctx.font = '11px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (var i = 0; i <= ySteps; i++) {
      var ratio = i / ySteps;
      var valY = maxY - ratio * (maxY - minY);
      var yPos = padding.top + ratio * plotH;

      // Grid line
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + plotW, yPos);
      ctx.stroke();

      // Label
      ctx.fillStyle = theme.text;
      var textVal = Number.isInteger(valY) ? valY.toString() : valY.toFixed(1);
      ctx.fillText(textVal, padding.left - 8, yPos);
    }

    // Draw Vertical Time Grid Lines
    var xSteps = 6;
    for (var j = 0; j <= xSteps; j++) {
      var xRatio = j / xSteps;
      var xPos = padding.left + xRatio * plotW;

      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xPos, padding.top);
      ctx.lineTo(xPos, padding.top + plotH);
      ctx.stroke();
    }

    // Outer Plot Border
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padding.left, padding.top, plotW, plotH);

    // Bottom Time Axis label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = theme.text;
    ctx.fillText('Data Titik Sampel (Window: ' + maxPoints + ')', padding.left + plotW / 2, padding.top + plotH + 10);

    // If no channels yet, render instruction placeholder
    if (channels.length === 0 || !channels.some(function(c) { return c.data.length > 0; })) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.text;
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText('Grafik Real-Time Siap. Kirim data numerik via Serial untuk memulai visualisasi.', padding.left + plotW / 2, padding.top + plotH / 2 - 12);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('Contoh: Serial.println(analogRead(A0));', padding.left + plotW / 2, padding.top + plotH / 2 + 12);
      return;
    }

    // Draw Multi-Channel Curves
    channels.forEach(function(ch) {
      var dataSlice = ch.data.slice(-maxPoints);
      if (dataSlice.length === 0) return;

      var stepX = plotW / Math.max(maxPoints - 1, 1);
      var startXOffset = padding.left + (maxPoints - dataSlice.length) * stepX;

      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      var isFirst = true;

      for (var pt = 0; pt < dataSlice.length; pt++) {
        var val = dataSlice[pt];
        var x = startXOffset + pt * stepX;

        if (val === null || val === undefined || isNaN(val)) {
          isFirst = true;
          continue;
        }

        // Clamp & Map to canvas Y
        var normalizedY = (val - minY) / rangeY;
        var y = padding.top + plotH - (normalizedY * plotH);

        if (isFirst) {
          ctx.moveTo(x, y);
          isFirst = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw active glow dot at newest point
      if (dataSlice.length > 0) {
        var lastIdx = dataSlice.length - 1;
        var lastVal = dataSlice[lastIdx];
        if (lastVal !== null && !isNaN(lastVal)) {
          var dotX = startXOffset + lastIdx * stepX;
          var normLast = (lastVal - minY) / rangeY;
          var dotY = padding.top + plotH - (normLast * plotH);

          ctx.fillStyle = ch.color;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    });
  }

  function animationLoop() {
    if (isPlotterOpen) {
      renderPlot();
      animFrameId = requestAnimationFrame(animationLoop);
    }
  }

  // Export Captured Plot History as CSV
  function exportCSV() {
    if (historyLog.length === 0) {
      alert('Belum ada data rekaman grafik untuk diekspor ke CSV.');
      return;
    }

    var headers = ['Timestamp'];
    channels.forEach(function(c) {
      headers.push(c.name);
    });

    var rows = [headers.join(',')];

    historyLog.forEach(function(row) {
      var r = [row.time];
      for (var i = 0; i < channels.length; i++) {
        var v = row.values[i];
        r.push(v !== undefined && v !== null ? v : '');
      }
      rows.push(r.join(','));
    });

    var csvContent = rows.join('\r\n');
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);

    var projName = 'arduiblok';
    var projInput = document.getElementById('projectNameInput');
    if (projInput && projInput.value.trim()) {
      projName = projInput.value.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    }

    var now = new Date();
    var dateStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    var a = document.createElement('a');
    a.href = url;
    a.download = projName + '_plot_' + dateStr + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export Chart Canvas as PNG Image
  function exportPNG() {
    if (!canvas) return;
    try {
      var dataUrl = canvas.toDataURL('image/png');
      var projName = 'arduiblok';
      var projInput = document.getElementById('projectNameInput');
      if (projInput && projInput.value.trim()) {
        projName = projInput.value.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
      }

      var now = new Date();
      var dateStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');

      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = projName + '_plot_' + dateStr + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert('Gagal mengambil tangkapan gambar grafik: ' + e.message);
    }
  }

  async function openPlotterModal() {
    if (elModal) {
      elModal.classList.remove('hidden');
    }
    isPlotterOpen = true;

    // Sinkronisasi status koneksi serial
    if (root.ArduiBlokSerial) {
      if (!root.ArduiBlokSerial.isConnected()) {
        var curr = root.ArduiBlokSerial.getCurrentPort();
        if (curr) {
          await root.ArduiBlokSerial.connectPort(curr);
        } else {
          var ok = await root.ArduiBlokSerial.selectPort();
          if (ok) {
            var newPort = root.ArduiBlokSerial.getCurrentPort();
            if (newPort) await root.ArduiBlokSerial.connectPort(newPort);
          }
        }
      }
    }

    setTimeout(function() {
      resizeCanvas();
      if (!animFrameId) {
        animFrameId = requestAnimationFrame(animationLoop);
      }
    }, 50);
  }

  async function closePlotterModal() {
    if (elModal) {
      elModal.classList.add('hidden');
    }
    isPlotterOpen = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    // Jika serial monitor juga tertutup, putuskan port agar siap upload
    var monitorModal = document.getElementById('serialMonitorModal');
    var isMonitorOpen = monitorModal && !monitorModal.classList.contains('hidden');

    if (!isMonitorOpen && root.ArduiBlokSerial && root.ArduiBlokSerial.isConnected()) {
      await root.ArduiBlokSerial.disconnectPort();
    }
  }

  function initUI() {
    elModal = document.getElementById('serialPlotterModal');
    elBtnClose = document.getElementById('btnCloseSerialPlotterModal');
    elBtnSwitchToMonitor = document.getElementById('btnSwitchToPlotterMonitor');
    elBtnTogglePause = document.getElementById('btnTogglePlotPause');
    elBtnClearPlot = document.getElementById('btnClearPlotterData');
    elSelectWindow = document.getElementById('selectPlotterWindow');
    elSelectScale = document.getElementById('selectPlotterScale');
    elBtnExportCsv = document.getElementById('btnExportPlotterCsv');
    elBtnExportPng = document.getElementById('btnExportPlotterPng');
    elLegendContainer = document.getElementById('plotterLegendContainer');
    elStatusBadge = document.getElementById('plotterStatusBadge');
    elSelectBaud = document.getElementById('selectPlotterBaud');
    elBtnToggleConnect = document.getElementById('btnTogglePlotterConnect');
    elBtnResetBoard = document.getElementById('btnResetPlotterBoard');

    canvas = document.getElementById('serialPlotterCanvas');
    if (canvas) {
      ctx = canvas.getContext('2d');
    }

    var btnOpenPlotter = document.getElementById('btnOpenSerialPlotter');
    if (btnOpenPlotter) {
      btnOpenPlotter.addEventListener('click', async function() {
        await openPlotterModal();
      });
    }

    if (elBtnClose) {
      elBtnClose.addEventListener('click', async function() {
        await closePlotterModal();
      });
    }

    // Switch between Monitor & Plotter
    if (elBtnSwitchToMonitor) {
      elBtnSwitchToMonitor.addEventListener('click', async function() {
        await closePlotterModal();
        if (root.ArduiBlokSerial && root.ArduiBlokSerial.openSerialModal) {
          await root.ArduiBlokSerial.openSerialModal();
        }
      });
    }

    var btnSwitchToPlotter = document.getElementById('btnSwitchToSerialPlotter');
    if (btnSwitchToPlotter) {
      btnSwitchToPlotter.addEventListener('click', async function() {
        if (root.ArduiBlokSerial && root.ArduiBlokSerial.closeSerialModal) {
          await root.ArduiBlokSerial.closeSerialModal();
        }
        await openPlotterModal();
      });
    }

    // Play / Pause
    if (elBtnTogglePause) {
      elBtnTogglePause.addEventListener('click', function() {
        isPaused = !isPaused;
        if (isPaused) {
          elBtnTogglePause.innerHTML = '<svg class="svg-icon btn-action-icon" viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.2;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Lanjutkan</span>';
          elBtnTogglePause.classList.add('btn-paused');
        } else {
          elBtnTogglePause.innerHTML = '<svg class="svg-icon btn-action-icon" viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.2;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg><span>Jeda</span>';
          elBtnTogglePause.classList.remove('btn-paused');
        }
      });
    }

    // Clear
    if (elBtnClearPlot) {
      elBtnClearPlot.addEventListener('click', function() {
        clearPlotData();
      });
    }

    // Window size selector
    if (elSelectWindow) {
      elSelectWindow.addEventListener('change', function() {
        maxPoints = parseInt(elSelectWindow.value, 10) || 100;
      });
    }

    // Y Axis Scale selector
    if (elSelectScale) {
      elSelectScale.addEventListener('change', function() {
        scaleMode = elSelectScale.value;
      });
    }

    // Export CSV & PNG
    if (elBtnExportCsv) elBtnExportCsv.addEventListener('click', exportCSV);
    if (elBtnExportPng) elBtnExportPng.addEventListener('click', exportPNG);

    // Baudrate & Connect buttons in plotter
    if (elSelectBaud) {
      elSelectBaud.addEventListener('change', async function() {
        var newBaud = parseInt(elSelectBaud.value, 10);
        if (root.ArduiBlokSerial) {
          var curr = root.ArduiBlokSerial.getCurrentPort();
          if (curr && root.ArduiBlokSerial.isConnected()) {
            await root.ArduiBlokSerial.disconnectPort();
            await root.ArduiBlokSerial.connectPort(curr, newBaud);
          }
        }
      });
    }

    if (elBtnToggleConnect) {
      elBtnToggleConnect.addEventListener('click', async function() {
        if (!root.ArduiBlokSerial) return;
        if (root.ArduiBlokSerial.isConnected()) {
          await root.ArduiBlokSerial.disconnectPort();
        } else {
          var curr = root.ArduiBlokSerial.getCurrentPort();
          if (curr) {
            await root.ArduiBlokSerial.connectPort(curr);
          } else {
            var ok = await root.ArduiBlokSerial.selectPort();
            if (ok) {
              var p = root.ArduiBlokSerial.getCurrentPort();
              if (p) await root.ArduiBlokSerial.connectPort(p);
            }
          }
        }
      });
    }

    if (elBtnResetBoard) {
      elBtnResetBoard.addEventListener('click', async function() {
        if (root.ArduiBlokSerial && root.ArduiBlokSerial.resetBoard) {
          await root.ArduiBlokSerial.resetBoard();
        }
      });
    }

    window.addEventListener('resize', resizeCanvas);
    updateLegendUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  // Export API
  root.ArduiBlokPlotter = {
    openModal: openPlotterModal,
    closeModal: closePlotterModal,
    isOpen: function() { return isPlotterOpen; },
    processChunk: processIncomingChunk,
    parseLine: parseLineData,
    clear: clearPlotData,
    exportCSV: exportCSV,
    exportPNG: exportPNG
  };

})(typeof window !== 'undefined' ? window : this);
