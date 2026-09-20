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
      elPortLabel.textContent = currentPort ? 'Port Siap' : 'Pilih Port';
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

  async function requestAndConnect() {
    var serial = getSerialAPI();
    if (!serial) {
      showAndroidHelp();
      return false;
    }

    try {
      // Selalu tampilkan dialog pemilihan port dari browser (Web Serial / WebUSB Polyfill)
      var port = await serial.requestPort();
      if (isConnected) {
        await disconnectPort();
      }
      return await connectPort(port);
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
    await sleep(350); // Allow Windows kernel to release handle
  }

  // Resumes Serial Monitor after upload finishes
  async function resumeAfterUpload() {
    isPausedForUpload = false;
    await sleep(400); // Give bootloader time to restart sketch
    if (currentPort) {
      try {
        await connectPort(currentPort, currentBaudRate);
      } catch (e) {
        // User can manually reconnect
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

    if (elBtnOpenPortModal) {
      elBtnOpenPortModal.addEventListener('click', async function() {
        await requestAndConnect();
      });
    }

    if (elBtnSelectNewPort) {
      elBtnSelectNewPort.addEventListener('click', async function() {
        await requestAndConnect();
      });
    }

    if (elBtnOpenSerialMonitor) {
      elBtnOpenSerialMonitor.addEventListener('click', function() {
        openSerialModal();
        if (!isConnected && currentPort) {
          connectPort(currentPort);
        }
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

    if (elBtnResetBoard) {
      elBtnResetBoard.addEventListener('click', resetBoard);
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
    connectPort: connectPort,
    requestAndConnect: requestAndConnect,
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
