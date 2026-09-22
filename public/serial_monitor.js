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

  // DOM elements
  var elPortDot = null;
  var elPortLabel = null;
  var elBtnOpenPortModal = null;
  var elBtnOpenSerialMonitor = null;
  var elSerialModal = null;
  var elBtnCloseSerialModal = null;
  var elSerialTerminal = null;
  var elSelectBaud = null;
  var elBtnToggleConnect = null;
  var elBtnResetBoard = null;
  var elBtnClearTerminal = null;
  var elCheckAutoscroll = null;
  var elCheckTimestamp = null;
  var elInputSerialSend = null;
  var elSelectLineEnding = null;
  var elBtnSerialSend = null;
  var elSerialStatusBadge = null;

  function isAndroidDevice() {
    return /Android|Mobile/i.test(navigator.userAgent);
  }

  function getSerialAPI() {
    // Pada HP Android, Chrome 'navigator.serial' hanya mendeteksi Bluetooth RFCOMM,
    // bukan kabel fisik USB OTG! Oleh karena itu, di Android wajib memprioritaskan WebUSB UniversalSerial (CH340 & CDC).
    if (isAndroidDevice() && window.ArduiBlokUniversalSerial && 'usb' in navigator) {
      return window.ArduiBlokUniversalSerial;
    }
    if ('serial' in navigator && navigator.serial) {
      return navigator.serial;
    }
    if (window.ArduiBlokUniversalSerial && 'usb' in navigator) {
      return window.ArduiBlokUniversalSerial;
    }
    if (window.WebSerialPolyfill && window.WebSerialPolyfill.serial && 'usb' in navigator) {
      return window.WebSerialPolyfill.serial;
    }
    return null;
  }

  function isSupported() {
    return !!getSerialAPI();
  }

  function sleep(ms) {
    return new Promise(function(r) { setTimeout(r, ms); });
  }

  function formatTime() {
    var d = new Date();
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    var s = String(d.getSeconds()).padStart(2, '0');
    var ms = String(d.getMilliseconds()).padStart(3, '0');
    return '[' + h + ':' + m + ':' + s + '.' + ms + '] ';
  }

  var pendingTerminalBuffer = '';
  var terminalFrameRequested = false;
  var maxTerminalChars = 40000;
  var isAtLineStart = true;

  function flushTerminalBuffer() {
    terminalFrameRequested = false;
    if (!elSerialTerminal || !pendingTerminalBuffer) return;

    var chunk = pendingTerminalBuffer;
    pendingTerminalBuffer = '';

    // Gunakan TextNode untuk performa DOM rendering maksimal tanpa freeze
    var textNode = document.createTextNode(chunk);
    elSerialTerminal.appendChild(textNode);

    // Batasi jumlah child node dan karakter agar tidak boros RAM & bebas freeze
    if (elSerialTerminal.childNodes.length > 150) {
      while (elSerialTerminal.childNodes.length > 80) {
        elSerialTerminal.removeChild(elSerialTerminal.firstChild);
      }
    }
    if (elSerialTerminal.textContent.length > maxTerminalChars) {
      elSerialTerminal.textContent = elSerialTerminal.textContent.slice(-25000);
    }

    if (elCheckAutoscroll && elCheckAutoscroll.checked) {
      elSerialTerminal.scrollTop = elSerialTerminal.scrollHeight;
    }
  }

  function processTimestampText(rawText) {
    if (!elCheckTimestamp || !elCheckTimestamp.checked) {
      return rawText;
    }

    var result = '';
    for (var i = 0; i < rawText.length; i++) {
      var ch = rawText.charAt(i);

      if (isAtLineStart) {
        if (ch !== '\r' && ch !== '\n') {
          result += formatTime();
          isAtLineStart = false;
        }
      }

      result += ch;

      if (ch === '\n') {
        isAtLineStart = true;
      }
    }
    return result;
  }

  function appendTerminal(text, isError) {
    if (!elSerialTerminal) return;

    if (isError) {
      if (pendingTerminalBuffer) flushTerminalBuffer();
      var span = document.createElement('span');
      span.style.color = '#f87171';
      span.textContent = text;
      elSerialTerminal.appendChild(span);
      isAtLineStart = true;
      if (elCheckAutoscroll && elCheckAutoscroll.checked) {
        elSerialTerminal.scrollTop = elSerialTerminal.scrollHeight;
      }
      return;
    }

    var processed = processTimestampText(text);
    pendingTerminalBuffer += processed;

    if (pendingTerminalBuffer.length > maxTerminalChars) {
      pendingTerminalBuffer = pendingTerminalBuffer.slice(-maxTerminalChars);
    }

    if (!terminalFrameRequested) {
      terminalFrameRequested = true;
      requestAnimationFrame(flushTerminalBuffer);
    }
  }

  function updateBadgeUI() {
    if (!elPortDot || !elPortLabel) return;

    if (currentPort) {
      elPortDot.className = 'board-badge-dot port-dot connected';
      elPortLabel.textContent = isConnected ? 'Port Terhubung' : 'Port Terhubung';
    } else {
      elPortDot.className = 'board-badge-dot port-dot';
      elPortLabel.textContent = 'Pilih Port';
    }

    if (elSerialStatusBadge) {
      if (isConnected) {
        elSerialStatusBadge.textContent = 'Terhubung (' + currentBaudRate + ' bps)';
        elSerialStatusBadge.className = 'info-badge connected';
      } else {
        elSerialStatusBadge.textContent = currentPort ? 'Port Siap (Terputus)' : 'Terputus';
        elSerialStatusBadge.className = 'info-badge disconnected';
      }
    }

    if (elBtnToggleConnect) {
      if (isConnected) {
        elBtnToggleConnect.innerHTML = '<svg class="svg-icon btn-action-icon" viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.2;"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg><span>Putuskan</span>';
        elBtnToggleConnect.className = 'btn btn-disconnect btn-serial-action';
      } else {
        elBtnToggleConnect.innerHTML = '<svg class="svg-icon btn-action-icon" viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.2;"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg><span>Hubungkan</span>';
        elBtnToggleConnect.className = 'btn btn-compile btn-serial-action';
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

      // Assert DTR & RTS to enable active serial transmission
      try {
        await port.setSignals({ dataTerminalReady: true, requestToSend: true });
      } catch (e) {}

      currentPort = port;
      isConnected = true;
      keepReading = true;
      updateBadgeUI();

      appendTerminal('\n--- Port Serial Terhubung (' + currentBaudRate + ' bps) ---\n');
      startReadingLoop();
      return true;
    } catch (err) {
      appendTerminal('Gagal menghubungkan port: ' + err.message + '\n', true);
      isConnected = false;
      updateBadgeUI();
      return false;
    }
  }

  function showAndroidHelp() {
    var modal = document.getElementById('androidOtgModal');
    if (!modal) {
      alert('Perhatian Keamanan Browser:\n\nAkses USB & Serial dimatikan oleh Google Chrome jika website diakses lewat HTTP (bukan HTTPS).\nSilakan buka lewat HTTPS port 3443 atau aktifkan flag di chrome://flags pada Chrome HP Anda.');
      return;
    }
    var originEl = document.getElementById('otgModalCurrentOrigin');
    if (originEl) {
      originEl.textContent = window.location.origin;
    }
    var httpsLink = document.getElementById('otgModalHttpsLink');
    if (httpsLink) {
      var hostname = window.location.hostname || 'localhost';
      httpsLink.href = 'https://' + hostname + ':3443';
    }
    modal.classList.remove('hidden');
  }

  function closeAndroidHelp() {
    var modal = document.getElementById('androidOtgModal');
    if (modal) modal.classList.add('hidden');
  }

  // Memilih port TANPA membuka port dan TANPA mengirim/menerima data
  async function selectPort() {
    var serial = getSerialAPI();
    if (!serial) {
      showAndroidHelp();
      return false;
    }

    try {
      if (isConnected) {
        await disconnectPort();
      }
      var port = await serial.requestPort();
      currentPort = port;
      isConnected = false;
      updateBadgeUI();
      return true;
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        alert('Gagal memilih/membuka port USB: ' + err.message);
        appendTerminal('Peringatan: ' + err.message + '\n', true);
      }
      return false;
    }
  }

  async function disconnectPort() {
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

    isConnected = false;
    updateBadgeUI();
    appendTerminal('\n--- Port Serial Diputus ---\n');
  }

  // Reset board using DTR toggle so setup() runs again
  async function resetBoard() {
    if (!currentPort || !isConnected) {
      alert('Port serial belum terhubung.');
      return;
    }
    try {
      appendTerminal('\n--- Mereset Board Arduino (DTR Toggle) ---\n');
      await currentPort.setSignals({ dataTerminalReady: false });
      await sleep(150);
      await currentPort.setSignals({ dataTerminalReady: true });
      await sleep(100);
    } catch (e) {
      appendTerminal('Gagal reset board: ' + e.message + '\n', true);
    }
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
            var text = decoder.decode(res.value, { stream: true });
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
    await sleep(350); // Allow Windows kernel to release handle
  }

  // Resumes Serial Monitor after upload finishes (hanya jika modal monitor sedang terbuka)
  async function resumeAfterUpload() {
    isPausedForUpload = false;
    if (elSerialModal && !elSerialModal.classList.contains('hidden') && currentPort) {
      await sleep(350);
      try {
        await connectPort(currentPort, currentBaudRate);
      } catch (e) {}
    }
  }

  async function openSerialModal() {
    if (elSerialModal) {
      elSerialModal.classList.remove('hidden');
    }
    if (!isConnected) {
      if (currentPort) {
        await connectPort(currentPort);
      } else {
        var ok = await selectPort();
        if (ok && currentPort) {
          await connectPort(currentPort);
        }
      }
    }
  }

  async function closeSerialModal() {
    if (elSerialModal) {
      elSerialModal.classList.add('hidden');
    }
    // Putuskan koneksi saat modal ditutup agar data serial tidak membanjiri di latar belakang & port siap untuk upload
    if (isConnected) {
      await disconnectPort();
    }
  }

  async function checkExistingPorts() {
    var api = getSerialAPI();
    if (!api) return;
    try {
      var ports = await api.getPorts();
      if (ports && ports.length > 0) {
        currentPort = ports[0];
        updateBadgeUI();
      }
    } catch (e) {}
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
    elBtnResetBoard = document.getElementById('btnResetSerialBoard');
    elBtnClearTerminal = document.getElementById('btnClearSerialTerminal');
    elCheckAutoscroll = document.getElementById('checkSerialAutoscroll');
    elCheckTimestamp = document.getElementById('checkSerialTimestamp');
    elInputSerialSend = document.getElementById('inputSerialSend');
    elSelectLineEnding = document.getElementById('selectSerialLineEnding');
    elBtnSerialSend = document.getElementById('btnSerialSend');
    elSerialStatusBadge = document.getElementById('serialStatusBadge');
    var elBtnSelectNewPort = document.getElementById('btnSelectNewPort');
    var elBtnSerialExportDropdown = document.getElementById('btnSerialExportDropdown');
    var elSerialExportMenu = document.getElementById('serialExportMenu');
    var elBtnCopySerialData = document.getElementById('btnCopySerialData');
    var elBtnDownloadSerialTxt = document.getElementById('btnDownloadSerialTxt');
    var elSerialExportBtnText = document.getElementById('serialExportBtnText');

    // Helper untuk mengambil teks serial yang bersih
    function getTerminalText() {
      if (!elSerialTerminal) return '';
      var text = elSerialTerminal.textContent || '';
      if (text.trim() === 'Menunggu data serial dari Arduino Uno...') {
        return '';
      }
      return text;
    }

    function showExportFeedback(msg) {
      if (!elSerialExportBtnText) return;
      var original = 'Salin / Unduh';
      elSerialExportBtnText.textContent = msg;
      setTimeout(function() {
        if (elSerialExportBtnText) elSerialExportBtnText.textContent = original;
      }, 2000);
    }

    function fallbackCopyText(text) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showExportFeedback('Tersalin!');
      } catch (e) {
        prompt('Salin data serial berikut secara manual:', text);
      }
      document.body.removeChild(textarea);
    }

    // Toggle Dropdown Salin / Unduh
    if (elBtnSerialExportDropdown && elSerialExportMenu) {
      elBtnSerialExportDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
        elSerialExportMenu.classList.toggle('hidden');
      });
      document.addEventListener('click', function(e) {
        if (!elBtnSerialExportDropdown.contains(e.target) && !elSerialExportMenu.contains(e.target)) {
          elSerialExportMenu.classList.add('hidden');
        }
      });
    }

    // Opsi 1: Salin ke Clipboard
    if (elBtnCopySerialData) {
      elBtnCopySerialData.addEventListener('click', function(e) {
        e.stopPropagation();
        if (elSerialExportMenu) elSerialExportMenu.classList.add('hidden');
        var text = getTerminalText();
        if (!text || text.trim().length === 0) {
          alert('Belum ada data serial di terminal untuk disalin.');
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function() {
            showExportFeedback('Tersalin!');
          }).catch(function() {
            fallbackCopyText(text);
          });
        } else {
          fallbackCopyText(text);
        }
      });
    }

    // Opsi 2: Download sebagai .TXT
    if (elBtnDownloadSerialTxt) {
      elBtnDownloadSerialTxt.addEventListener('click', function(e) {
        e.stopPropagation();
        if (elSerialExportMenu) elSerialExportMenu.classList.add('hidden');
        var text = getTerminalText();
        if (!text || text.trim().length === 0) {
          alert('Belum ada data serial di terminal untuk diunduh.');
          return;
        }
        var projectName = 'arduiblok';
        var projInput = document.getElementById('projectNameInput');
        if (projInput && projInput.value.trim()) {
          projectName = projInput.value.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
        }
        var now = new Date();
        var dateStr = now.getFullYear() + '-' +
          String(now.getMonth() + 1).padStart(2, '0') + '-' +
          String(now.getDate()).padStart(2, '0') + '_' +
          String(now.getHours()).padStart(2, '0') +
          String(now.getMinutes()).padStart(2, '0') +
          String(now.getSeconds()).padStart(2, '0');
        var filename = projectName + '_serial_' + dateStr + '.txt';

        try {
          var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showExportFeedback('Terunduh!');
        } catch (err) {
          alert('Gagal mengunduh file .txt: ' + err.message);
        }
      });
    }

    // Klik tombol "Pilih Port": hanya memilih port, tidak membuka port & tidak menerima/mengirim data serial
    if (elBtnOpenPortModal) {
      elBtnOpenPortModal.addEventListener('click', async function() {
        await selectPort();
      });
    }

    if (elBtnSelectNewPort) {
      elBtnSelectNewPort.addEventListener('click', async function() {
        var ok = await selectPort();
        if (ok && currentPort && elSerialModal && !elSerialModal.classList.contains('hidden')) {
          await connectPort(currentPort);
        }
      });
    }

    // Klik tombol "Serial Monitor": baru membuka port dan menerima/mengirim data
    if (elBtnOpenSerialMonitor) {
      elBtnOpenSerialMonitor.addEventListener('click', async function() {
        await openSerialModal();
      });
    }

    if (elBtnCloseSerialModal) {
      elBtnCloseSerialModal.addEventListener('click', async function() {
        await closeSerialModal();
      });
    }

    if (elBtnToggleConnect) {
      elBtnToggleConnect.addEventListener('click', async function() {
        if (isConnected) {
          await disconnectPort();
        } else {
          if (currentPort) {
            await connectPort(currentPort);
          } else {
            var ok = await selectPort();
            if (ok && currentPort) {
              await connectPort(currentPort);
            }
          }
        }
      });
    }

    if (elBtnResetBoard) {
      elBtnResetBoard.addEventListener('click', resetBoard);
    }

    if (elBtnClearTerminal && elSerialTerminal) {
      elBtnClearTerminal.addEventListener('click', function() {
        elSerialTerminal.innerHTML = '';
        pendingTerminalBuffer = '';
        isAtLineStart = true;
      });
    }

    if (elCheckTimestamp) {
      elCheckTimestamp.addEventListener('change', function() {
        isAtLineStart = true;
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

    // Android OTG modal events
    var elBtnCloseOtg = document.getElementById('btnCloseAndroidOtgModal');
    var elBtnGotItOtg = document.getElementById('btnGotItAndroidOtg');
    var elBtnCopyOrigin = document.getElementById('btnCopyOriginUrl');

    if (elBtnCloseOtg) elBtnCloseOtg.addEventListener('click', closeAndroidHelp);
    if (elBtnGotItOtg) elBtnGotItOtg.addEventListener('click', closeAndroidHelp);
    if (elBtnCopyOrigin) {
      elBtnCopyOrigin.addEventListener('click', function() {
        var origin = window.location.origin;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(origin).then(function() {
            elBtnCopyOrigin.textContent = 'Tersalin!';
            setTimeout(function() { elBtnCopyOrigin.textContent = 'Salin URL'; }, 2000);
          }).catch(function() {
            prompt('Salin URL ini secara manual:', origin);
          });
        } else {
          prompt('Salin URL ini secara manual:', origin);
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
    getSerialAPI: getSerialAPI,
    showAndroidHelp: showAndroidHelp,
    closeAndroidHelp: closeAndroidHelp,
    getCurrentPort: function() { return currentPort; },
    isConnected: function() { return isConnected; },
    selectPort: selectPort,
    requestAndConnect: selectPort,
    connectPort: connectPort,
    disconnectPort: disconnectPort,
    resetBoard: resetBoard,
    sendSerialText: sendSerialText,
    prepareForUpload: prepareForUpload,
    resumeAfterUpload: resumeAfterUpload,
    openSerialModal: openSerialModal,
    closeSerialModal: closeSerialModal,
    appendTerminal: appendTerminal
  };

})(typeof window !== 'undefined' ? window : this);
