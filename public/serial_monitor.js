/**
 * ArduiBlok — Web Serial Manager & Floating Serial Monitor
 * Coordinates Web Serial API connection, terminal I/O, and flasher handoff.
 */

(function(root) {
  'use strict';

  var currentPort = null;
  var isConnected = false;
  var currentBaudRate = 9600;
  var reader = null;
  var writer = null;
  var keepReading = false;
  var isPausedForUpload = false;

  // DOM elements (initialized on DOM ready)
  var elPortDot = null;
  var elPortLabel = null;
  var elBtnOpenPortModal = null;
  var elBtnOpenSerialMonitor = null;
  var elSerialModal = null;
  var elBtnCloseSerialModal = null;
  var elSerialTerminal = null;
  var elSelectBaud = null;
  var elBtnToggleConnect = null;
  var elBtnClearTerminal = null;
  var elCheckAutoscroll = null;
  var elCheckTimestamp = null;
  var elInputSerialSend = null;
  var elSelectLineEnding = null;
  var elBtnSerialSend = null;
  var elSerialStatusBadge = null;

  function isSupported() {
    return 'serial' in navigator;
  }

  function formatTime() {
    var d = new Date();
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    var s = String(d.getSeconds()).padStart(2, '0');
    var ms = String(d.getMilliseconds()).padStart(3, '0');
    return '[' + h + ':' + m + ':' + s + '.' + ms + '] ';
  }

  function appendTerminal(text, isError) {
    if (!elSerialTerminal) return;
    var showTimestamp = elCheckTimestamp && elCheckTimestamp.checked;
    var line = text;

    if (showTimestamp && line.trim().length > 0) {
      line = formatTime() + line;
    }

    var span = document.createElement('span');
    if (isError) span.style.color = '#f87171';
    span.textContent = line;
    elSerialTerminal.appendChild(span);

    if (elCheckAutoscroll && elCheckAutoscroll.checked) {
      elSerialTerminal.scrollTop = elSerialTerminal.scrollHeight;
    }
  }

  function updateBadgeUI() {
    if (!elPortDot || !elPortLabel) return;

    if (isConnected) {
      elPortDot.className = 'board-badge-dot port-dot connected';
      elPortLabel.textContent = 'Port Terhubung';
      if (elSerialStatusBadge) {
        elSerialStatusBadge.textContent = 'Terhubung (' + currentBaudRate + ' bps)';
        elSerialStatusBadge.className = 'info-badge connected';
      }
      if (elBtnToggleConnect) {
        elBtnToggleConnect.textContent = 'Putuskan Port';
        elBtnToggleConnect.className = 'btn btn-secondary btn-disconnect';
      }
    } else {
      elPortDot.className = 'board-badge-dot port-dot';
      elPortLabel.textContent = 'Pilih Port';
      if (elSerialStatusBadge) {
        elSerialStatusBadge.textContent = 'Terputus';
        elSerialStatusBadge.className = 'info-badge disconnected';
      }
      if (elBtnToggleConnect) {
        elBtnToggleConnect.textContent = 'Hubungkan Port';
        elBtnToggleConnect.className = 'btn btn-compile';
      }
    }
  }

  async function connectPort(port, baudRate) {
    if (!isSupported()) {
      alert('Browser Anda belum mendukung Web Serial API.\nSilakan gunakan Google Chrome atau Microsoft Edge di Desktop, atau Chrome di Android dengan kabel OTG.');
      return false;
    }

    try {
      baudRate = baudRate || (elSelectBaud ? parseInt(elSelectBaud.value, 10) : 9600);
      currentBaudRate = baudRate;

      if (!port.readable || !port.writable) {
        await port.open({ baudRate: currentBaudRate });
      }

      currentPort = port;
      isConnected = true;
      keepReading = true;
      updateBadgeUI();

      appendTerminal('\n--- Port Serial Terhubung pada ' + currentBaudRate + ' bps ---\n');
      startReadingLoop();
      return true;
    } catch (err) {
      appendTerminal('Gagal menghubungkan port: ' + err.message + '\n', true);
      isConnected = false;
      updateBadgeUI();
      return false;
    }
  }

  async function requestAndConnect() {
    if (!isSupported()) {
      alert('Browser Anda belum mendukung Web Serial API.\nGunakan browser Google Chrome / Microsoft Edge.');
      return false;
    }

    try {
      var port = await navigator.serial.requestPort();
      return await connectPort(port);
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        appendTerminal('Peringatan: ' + err.message + '\n', true);
      }
      return false;
    }
  }

  async function disconnectPort() {
    keepReading = false;
    if (reader) {
      try {
        await reader.cancel();
      } catch (e) {}
      try {
        reader.releaseLock();
      } catch (e) {}
      reader = null;
    }

    if (writer) {
      try {
        writer.releaseLock();
      } catch (e) {}
      writer = null;
    }

    if (currentPort) {
      try {
        await currentPort.close();
      } catch (e) {}
    }

    isConnected = false;
    updateBadgeUI();
    appendTerminal('\n--- Port Serial Diputus ---\n');
  }

  async function startReadingLoop() {
    if (!currentPort || !currentPort.readable) return;

    var decoder = new TextDecoder();
    while (keepReading && currentPort && currentPort.readable && !isPausedForUpload) {
      try {
        reader = currentPort.readable.getReader();
        while (keepReading && !isPausedForUpload) {
          var res = await reader.read();
          if (res.done) break;
          if (res.value) {
            var text = decoder.decode(res.value);
            appendTerminal(text);
          }
        }
      } catch (err) {
        if (keepReading && !isPausedForUpload) {
          appendTerminal('\nError membaca serial: ' + err.message + '\n', true);
        }
        break;
      } finally {
        if (reader) {
          try { reader.releaseLock(); } catch (e) {}
          reader = null;
        }
      }
    }
  }

  async function sendSerialText(text) {
    if (!isConnected || !currentPort || !currentPort.writable) {
      alert('Port serial belum terhubung. Hubungkan port terlebih dahulu.');
      return;
    }

    var lineEnding = elSelectLineEnding ? elSelectLineEnding.value : 'nl';
    var payload = text;
    if (lineEnding === 'nl') payload += '\n';
    else if (lineEnding === 'cr') payload += '\r';
    else if (lineEnding === 'both') payload += '\r\n';

    var encoder = new TextEncoder();
    var data = encoder.encode(payload);

    try {
      if (!writer) {
        writer = currentPort.writable.getWriter();
      }
      await writer.write(data);
      appendTerminal('>> ' + payload);
    } catch (err) {
      appendTerminal('Gagal mengirim data serial: ' + err.message + '\n', true);
    } finally {
      if (writer) {
        try { writer.releaseLock(); } catch (e) {}
        writer = null;
      }
    }
  }

  // Prepares the active port for HEX flashing by pausing the monitor loop and releasing locks
  async function prepareForUpload() {
    isPausedForUpload = true;
    keepReading = false;

    if (reader) {
      try { await reader.cancel(); } catch (e) {}
      try { reader.releaseLock(); } catch (e) {}
      reader = null;
    }
    if (writer) {
      try { writer.releaseLock(); } catch (e) {}
      writer = null;
    }
    if (currentPort) {
      try { await currentPort.close(); } catch (e) {}
    }
    await new Promise(function(r) { setTimeout(r, 150); });
  }

  // Resumes Serial Monitor after upload finishes
  async function resumeAfterUpload() {
    isPausedForUpload = false;
    if (currentPort) {
      try {
        await connectPort(currentPort, currentBaudRate);
      } catch (e) {
        // Can be reconnected manually by user
      }
    }
  }

  function openSerialModal() {
    if (elSerialModal) {
      elSerialModal.classList.remove('hidden');
    }
  }

  function closeSerialModal() {
    if (elSerialModal) {
      elSerialModal.classList.add('hidden');
    }
  }

  function initUI() {
    elPortDot = document.getElementById('portStatusDot');
    elPortLabel = document.getElementById('currentPortLabel');
    elBtnOpenPortModal = document.getElementById('btnOpenPortModal');
    elBtnOpenSerialMonitor = document.getElementById('btnOpenSerialMonitor');
    elSerialModal = document.getElementById('serialMonitorModal');
    elBtnCloseSerialModal = document.getElementById('btnCloseSerialModal');
    elSerialTerminal = document.getElementById('serialTerminalBody');
    elSelectBaud = document.getElementById('selectSerialBaud');
    elBtnToggleConnect = document.getElementById('btnToggleSerialConnect');
    elBtnClearTerminal = document.getElementById('btnClearSerialTerminal');
    elCheckAutoscroll = document.getElementById('checkSerialAutoscroll');
    elCheckTimestamp = document.getElementById('checkSerialTimestamp');
    elInputSerialSend = document.getElementById('inputSerialSend');
    elSelectLineEnding = document.getElementById('selectSerialLineEnding');
    elBtnSerialSend = document.getElementById('btnSerialSend');
    elSerialStatusBadge = document.getElementById('serialStatusBadge');

    if (elBtnOpenPortModal) {
      elBtnOpenPortModal.addEventListener('click', function() {
        if (!isConnected) {
          requestAndConnect();
        } else {
          openSerialModal();
        }
      });
    }

    if (elBtnOpenSerialMonitor) {
      elBtnOpenSerialMonitor.addEventListener('click', function() {
        openSerialModal();
      });
    }

    if (elBtnCloseSerialModal) {
      elBtnCloseSerialModal.addEventListener('click', closeSerialModal);
    }

    if (elBtnToggleConnect) {
      elBtnToggleConnect.addEventListener('click', function() {
        if (isConnected) {
          disconnectPort();
        } else {
          requestAndConnect();
        }
      });
    }

    if (elBtnClearTerminal && elSerialTerminal) {
      elBtnClearTerminal.addEventListener('click', function() {
        elSerialTerminal.innerHTML = '';
      });
    }

    if (elSelectBaud) {
      elSelectBaud.addEventListener('change', async function() {
        var newBaud = parseInt(elSelectBaud.value, 10);
        if (isConnected && currentPort) {
          appendTerminal('\nMengganti baudrate ke ' + newBaud + ' bps...\n');
          await disconnectPort();
          await connectPort(currentPort, newBaud);
        } else {
          currentBaudRate = newBaud;
        }
      });
    }

    function doSend() {
      if (!elInputSerialSend) return;
      var text = elInputSerialSend.value;
      if (text) {
        sendSerialText(text);
        elInputSerialSend.value = '';
        elInputSerialSend.focus();
      }
    }

    if (elBtnSerialSend) {
      elBtnSerialSend.addEventListener('click', doSend);
    }

    if (elInputSerialSend) {
      elInputSerialSend.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSend();
        }
      });
    }

    updateBadgeUI();
  }

  // Auto initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  // Export API
  root.ArduiBlokSerial = {
    isSupported: isSupported,
    getCurrentPort: function() { return currentPort; },
    isConnected: function() { return isConnected; },
    connectPort: connectPort,
    requestAndConnect: requestAndConnect,
    disconnectPort: disconnectPort,
    sendSerialText: sendSerialText,
    prepareForUpload: prepareForUpload,
    resumeAfterUpload: resumeAfterUpload,
    openSerialModal: openSerialModal,
    closeSerialModal: closeSerialModal,
    appendTerminal: appendTerminal
  };

})(typeof window !== 'undefined' ? window : this);
