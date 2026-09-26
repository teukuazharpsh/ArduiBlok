/**
 * ArduiBlok — Device Connection Hub & Smart Port Assistant
 * Manages interactive port selection, chip vendor detection, auto-reconnect,
 * and guided troubleshooting for Web Serial / WebUSB Arduino boards.
 */

(function(root) {
  'use strict';

  var elDeviceModal = null;
  var elBtnCloseDeviceModal = null;
  var elBtnCancelDeviceModal = null;
  var elDevicePortsList = null;
  var elBtnTriggerNativeScan = null;
  var elDeviceTargetBoardLabel = null;
  var elDeviceTargetBaudLabel = null;
  var elDeviceConnectionStatusBadge = null;
  var elBtnDisconnectCurrentDevice = null;
  var elDeviceAutoScanDot = null;
  var elDeviceAutoScanText = null;

  // Known USB Vendor IDs and Product IDs mapping
  var KNOWN_VENDORS = {
    0x1a86: {
      name: 'WCH (WCH.CN)',
      chips: {
        0x7523: 'CH340 / CH340G USB-Serial (Arduino Uno/Nano Clone)',
        0x5523: 'CH341 USB-Serial',
        0x7522: 'CH340K / CH340N',
        0x5512: 'CH341A SPI/I2C/UART'
      },
      defaultChip: 'CH340 Series USB-Serial (Arduino Clone)'
    },
    0x10c4: {
      name: 'Silicon Labs',
      chips: {
        0xea60: 'CP2102 / CP2104 USB to UART Bridge (NodeMCU / ESP / Nano)',
        0xea70: 'CP2105 Dual USB to UART',
        0xea71: 'CP2108 Quad USB to UART'
      },
      defaultChip: 'CP210x USB to UART Bridge'
    },
    0x0403: {
      name: 'FTDI',
      chips: {
        0x6001: 'FT232R USB UART (Arduino Nano / Duemilanove)',
        0x6010: 'FT2232D/H Dual USB UART',
        0x6014: 'FT232H Hi-Speed USB UART',
        0x6015: 'FT230X / FT231X Basic UART'
      },
      defaultChip: 'FTDI USB Serial'
    },
    0x2341: {
      name: 'Arduino SA (Official)',
      chips: {
        0x0043: 'Arduino Uno R3 (ATmega16U2)',
        0x0001: 'Arduino Uno (ATmega8U2)',
        0x0042: 'Arduino Mega 2560 R3',
        0x0010: 'Arduino Mega 2560',
        0x0036: 'Arduino Leonardo (ATmega32U4)',
        0x8036: 'Arduino Leonardo (Bootloader)',
        0x0037: 'Arduino Micro',
        0x003e: 'Arduino Due',
        0x0058: 'Arduino Nano Every'
      },
      defaultChip: 'Official Arduino Board'
    },
    0x2e8a: {
      name: 'Raspberry Pi',
      chips: {
        0x0003: 'Raspberry Pi Pico (RP2040 CDC UART)',
        0x0005: 'Raspberry Pi Pico W',
        0x000a: 'Raspberry Pi Pico 2 (RP2350)'
      },
      defaultChip: 'Raspberry Pi RP2040 Board'
    },
    0x303a: {
      name: 'Espressif Systems',
      chips: {
        0x1001: 'ESP32-S2 / S3 / C3 Native USB JTAG/Serial',
        0x0002: 'ESP32-S2 Native CDC',
        0x1002: 'ESP32-C6 / H2 CDC'
      },
      defaultChip: 'Espressif Native USB Controller'
    }
  };

  function formatHex(num) {
    if (typeof num !== 'number') return '0x????';
    return '0x' + num.toString(16).toUpperCase().padStart(4, '0');
  }

  function identifyChip(info) {
    if (!info) return { vendorName: 'Generic USB Device', chipName: 'Port Serial USB', isKnownArduino: false };

    var vid = info.usbVendorId;
    var pid = info.usbProductId;

    if (!vid) {
      return {
        vendorName: 'Port Serial Standar',
        chipName: 'USB Serial Device (CDC-ACM)',
        isKnownArduino: true,
        vidHex: 'N/A',
        pidHex: 'N/A'
      };
    }

    var vendor = KNOWN_VENDORS[vid];
    if (vendor) {
      var chipTitle = (vendor.chips && pid && vendor.chips[pid]) ? vendor.chips[pid] : vendor.defaultChip;
      return {
        vendorName: vendor.name,
        chipName: chipTitle,
        isKnownArduino: true,
        vidHex: formatHex(vid),
        pidHex: formatHex(pid)
      };
    }

    return {
      vendorName: 'Vendor ' + formatHex(vid),
      chipName: 'USB Serial Controller (' + formatHex(pid) + ')',
      isKnownArduino: false,
      vidHex: formatHex(vid),
      pidHex: formatHex(pid)
    };
  }

  function getSerialAPI() {
    if (root.ArduiBlokSerial && root.ArduiBlokSerial.getSerialAPI) {
      return root.ArduiBlokSerial.getSerialAPI();
    }
    if ('serial' in navigator && navigator.serial) {
      return navigator.serial;
    }
    return null;
  }

  function updateStatusStrip() {
    var isConnected = root.ArduiBlokSerial ? root.ArduiBlokSerial.isConnected() : false;
    var currentPort = root.ArduiBlokSerial ? root.ArduiBlokSerial.getCurrentPort() : null;

    if (elDeviceConnectionStatusBadge) {
      if (isConnected) {
        elDeviceConnectionStatusBadge.className = 'info-badge connected';
        elDeviceConnectionStatusBadge.innerHTML = '<span class="status-live-pulse"></span> Terhubung';
      } else if (currentPort) {
        elDeviceConnectionStatusBadge.className = 'info-badge ready';
        elDeviceConnectionStatusBadge.innerHTML = 'Port Dipilih (Siap)';
      } else {
        elDeviceConnectionStatusBadge.className = 'info-badge disconnected';
        elDeviceConnectionStatusBadge.innerHTML = 'Belum Terhubung';
      }
    }

    if (elBtnDisconnectCurrentDevice) {
      elBtnDisconnectCurrentDevice.style.display = (isConnected || currentPort) ? 'inline-flex' : 'none';
    }

    if (elDeviceTargetBoardLabel && root.currentBoardConfig) {
      elDeviceTargetBoardLabel.textContent = root.currentBoardConfig.displayName || 'Arduino Uno (ATmega328P)';
    }

    if (elDeviceTargetBaudLabel && root.currentBoardConfig) {
      var baud = root.currentBoardConfig.baud || 115200;
      elDeviceTargetBaudLabel.textContent = baud + ' bps';
    }
  }

  async function renderAuthorizedPorts() {
    if (!elDevicePortsList) return;
    updateStatusStrip();

    var serial = getSerialAPI();
    if (!serial) {
      elDevicePortsList.innerHTML =
        '<div class="device-empty-card">' +
          '<div class="device-empty-icon">⚠️</div>' +
          '<div class="device-empty-title">Web Serial API Belum Didukung</div>' +
          '<div class="device-empty-desc">Browser Anda belum mendukung Web Serial API. Gunakan Google Chrome, Microsoft Edge, atau browser Chromium desktop.</div>' +
        '</div>';
      return;
    }

    try {
      var ports = await serial.getPorts();
      var currentActivePort = root.ArduiBlokSerial ? root.ArduiBlokSerial.getCurrentPort() : null;
      var isCurrentlyConnected = root.ArduiBlokSerial ? root.ArduiBlokSerial.isConnected() : false;

      if (!ports || ports.length === 0) {
        elDevicePortsList.innerHTML =
          '<div class="device-empty-card">' +
            '<div class="device-radar-scanner">' +
              '<div class="radar-circle circle-1"></div>' +
              '<div class="radar-circle circle-2"></div>' +
              '<div class="radar-circle circle-3"></div>' +
              '<svg class="svg-icon radar-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 1 9 9"></path><polyline points="12 12 16 14"></polyline></svg>' +
            '</div>' +
            '<div class="device-empty-title">Belum Ada Port yang Diizinkan</div>' +
            '<div class="device-empty-desc">Klik tombol <strong>"Pindai &amp; Tambah Port Baru"</strong> di bawah untuk memilih port USB Arduino Anda pertama kali.</div>' +
          '</div>';
        return;
      }

      var html = '<div class="device-ports-grid">';
      for (var i = 0; i < ports.length; i++) {
        var p = ports[i];
        var info = (typeof p.getInfo === 'function') ? p.getInfo() : null;
        var chip = identifyChip(info);
        var isThisSelected = (p === currentActivePort);
        var isThisConnected = isThisSelected && isCurrentlyConnected;

        var cardClass = 'device-port-card';
        if (isThisConnected) cardClass += ' active-connected';
        else if (isThisSelected) cardClass += ' active-selected';

        var statusTag = '<span class="device-badge-tag tag-ready">Pernah Diizinkan</span>';
        if (isThisConnected) {
          statusTag = '<span class="device-badge-tag tag-connected">🟢 Sedang Aktif</span>';
        } else if (isThisSelected) {
          statusTag = '<span class="device-badge-tag tag-selected">⚡ Siap Sambung</span>';
        }

        var hardwareIconSvg =
          '<svg class="svg-icon device-chip-icon" viewBox="0 0 24 24">' +
            '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>' +
            '<rect x="9" y="9" width="6" height="6"></rect>' +
            '<line x1="9" y1="1" x2="9" y2="4"></line>' +
            '<line x1="15" y1="1" x2="15" y2="4"></line>' +
            '<line x1="9" y1="20" x2="9" y2="23"></line>' +
            '<line x1="15" y1="20" x2="15" y2="23"></line>' +
            '<line x1="20" y1="9" x2="23" y2="9"></line>' +
            '<line x1="20" y1="14" x2="23" y2="14"></line>' +
            '<line x1="1" y1="9" x2="4" y2="9"></line>' +
            '<line x1="1" y1="14" x2="4" y2="14"></line>' +
          '</svg>';

        var buttonLabel = isThisConnected ? 'Buka Monitor' : (isThisSelected ? '⚡ Sambungkan' : 'Pilih Port Ini');
        var buttonClass = isThisConnected ? 'btn-device-open-monitor' : 'btn-device-connect';

        html +=
          '<div class="' + cardClass + '" data-port-index="' + i + '">' +
            '<div class="device-card-left">' +
              '<div class="device-icon-container">' + hardwareIconSvg + '</div>' +
              '<div class="device-card-info">' +
                '<div class="device-card-title-row">' +
                  '<h4 class="device-card-title">' + escapeHtml(chip.chipName) + '</h4>' +
                  statusTag +
                '</div>' +
                '<div class="device-card-meta">' +
                  '<span>Vendor: <strong>' + escapeHtml(chip.vendorName) + '</strong></span>' +
                  (chip.vidHex && chip.vidHex !== 'N/A' ? '<span class="meta-sep">&bull;</span><span>VID: <code>' + chip.vidHex + '</code> PID: <code>' + chip.pidHex + '</code></span>' : '') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="device-card-actions">' +
              '<button type="button" class="btn ' + buttonClass + '" data-port-index="' + i + '">' +
                buttonLabel +
              '</button>' +
            '</div>' +
          '</div>';
      }
      html += '</div>';

      elDevicePortsList.innerHTML = html;

      // Attach click events
      elDevicePortsList.querySelectorAll('.device-port-card').forEach(function(card) {
        var idx = parseInt(card.getAttribute('data-port-index'), 10);
        var targetPort = ports[idx];

        var btnAction = card.querySelector('.btn-device-connect, .btn-device-open-monitor');
        if (btnAction) {
          btnAction.addEventListener('click', async function(e) {
            e.stopPropagation();
            await handlePortSelection(targetPort);
          });
        }

        card.addEventListener('click', async function() {
          await handlePortSelection(targetPort);
        });
      });

    } catch (err) {
      elDevicePortsList.innerHTML =
        '<div class="device-empty-card">' +
          '<div class="device-empty-icon">⚠️</div>' +
          '<div class="device-empty-title">Gagal Membaca Port Terdaftar</div>' +
          '<div class="device-empty-desc">' + escapeHtml(err.message) + '</div>' +
        '</div>';
    }
  }

  async function handlePortSelection(port) {
    if (!port || !root.ArduiBlokSerial) return;
    try {
      var isAlreadySelected = (root.ArduiBlokSerial.getCurrentPort() === port);
      var isConnected = root.ArduiBlokSerial.isConnected();

      if (isAlreadySelected && isConnected) {
        closeDeviceModal();
        root.ArduiBlokSerial.openSerialModal();
        return;
      }

      // Hubungkan langsung tanpa memunculkan popup browser
      await root.ArduiBlokSerial.connectPort(port);
      renderAuthorizedPorts();
      updateStatusStrip();

      // Berikan umpan balik suara klik
      if (typeof root.playSnapSound === 'function') {
        root.playSnapSound();
      }

      // Tutup modal secara halus setelah 300ms
      setTimeout(function() {
        closeDeviceModal();
      }, 350);

    } catch (err) {
      alert('Gagal menyambungkan ke port: ' + err.message);
      renderAuthorizedPorts();
    }
  }

  async function triggerNewPortScan() {
    var serial = getSerialAPI();
    if (!serial) {
      if (root.ArduiBlokSerial && root.ArduiBlokSerial.showAndroidHelp) {
        root.ArduiBlokSerial.showAndroidHelp();
      } else {
        alert('Browser Anda belum mendukung Web Serial API.');
      }
      return;
    }

    try {
      if (elBtnTriggerNativeScan) {
        elBtnTriggerNativeScan.classList.add('scanning');
      }

      // Panggil pemilih port bawaan browser
      var port = await serial.requestPort();
      if (port && root.ArduiBlokSerial) {
        await root.ArduiBlokSerial.connectPort(port);
        if (typeof root.playSnapSound === 'function') {
          root.playSnapSound();
        }
      }

      await renderAuthorizedPorts();
      updateStatusStrip();

      setTimeout(function() {
        closeDeviceModal();
      }, 350);

    } catch (err) {
      if (err.name !== 'NotFoundError') {
        alert('Gagal memindai port: ' + err.message);
      }
      await renderAuthorizedPorts();
    } finally {
      if (elBtnTriggerNativeScan) {
        elBtnTriggerNativeScan.classList.remove('scanning');
      }
    }
  }

  function openDeviceModal() {
    if (!elDeviceModal) return;
    elDeviceModal.classList.remove('hidden');
    renderAuthorizedPorts();
    updateStatusStrip();
  }

  function closeDeviceModal() {
    if (!elDeviceModal) return;
    elDeviceModal.classList.add('hidden');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initUI() {
    elDeviceModal = document.getElementById('deviceConnectionModal');
    elBtnCloseDeviceModal = document.getElementById('btnCloseDeviceModal');
    elBtnCancelDeviceModal = document.getElementById('btnCancelDeviceModal');
    elDevicePortsList = document.getElementById('devicePortsList');
    elBtnTriggerNativeScan = document.getElementById('btnTriggerNativeScan');
    elDeviceTargetBoardLabel = document.getElementById('deviceTargetBoardLabel');
    elDeviceTargetBaudLabel = document.getElementById('deviceTargetBaudLabel');
    elDeviceConnectionStatusBadge = document.getElementById('deviceConnectionStatusBadge');
    elBtnDisconnectCurrentDevice = document.getElementById('btnDisconnectCurrentDevice');
    elDeviceAutoScanDot = document.getElementById('deviceAutoScanDot');
    elDeviceAutoScanText = document.getElementById('deviceAutoScanText');

    var btnOpenPortModal = document.getElementById('btnOpenPortModal');
    if (btnOpenPortModal) {
      // Ganti listener bawaan agar membuka Modal Device Connection Hub
      btnOpenPortModal.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openDeviceModal();
      });
    }

    // Hubungkan tombol Ganti Port pada Serial Monitor agar juga membuka Device Hub
    var btnSelectNewPort = document.getElementById('btnSelectNewPort');
    if (btnSelectNewPort) {
      btnSelectNewPort.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openDeviceModal();
      });
    }

    if (elBtnCloseDeviceModal) {
      elBtnCloseDeviceModal.addEventListener('click', closeDeviceModal);
    }
    if (elBtnCancelDeviceModal) {
      elBtnCancelDeviceModal.addEventListener('click', closeDeviceModal);
    }

    if (elDeviceModal) {
      elDeviceModal.addEventListener('click', function(e) {
        if (e.target === elDeviceModal) {
          closeDeviceModal();
        }
      });
    }

    if (elBtnTriggerNativeScan) {
      elBtnTriggerNativeScan.addEventListener('click', function() {
        triggerNewPortScan();
      });
    }

    if (elBtnDisconnectCurrentDevice) {
      elBtnDisconnectCurrentDevice.addEventListener('click', async function() {
        if (root.ArduiBlokSerial) {
          await root.ArduiBlokSerial.disconnectPort();
          renderAuthorizedPorts();
          updateStatusStrip();
        }
      });
    }

    // Toggle Troubleshooting Accordion (Buka / Tutup Panduan Bantuan)
    var btnToggleTroubleshoot = document.getElementById('btnToggleTroubleshoot');
    var deviceTroubleshootBox = document.getElementById('deviceTroubleshootBox');
    var deviceTroubleshootContent = document.getElementById('deviceTroubleshootContent');
    var troubleshootHintText = document.getElementById('troubleshootHintText');

    if (btnToggleTroubleshoot && deviceTroubleshootBox && deviceTroubleshootContent) {
      btnToggleTroubleshoot.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = deviceTroubleshootBox.classList.toggle('open');
        deviceTroubleshootContent.classList.toggle('hidden', !isOpen);
        if (troubleshootHintText) {
          troubleshootHintText.textContent = isOpen ? 'Tutup Panduan' : 'Buka Panduan';
        }
        if (isOpen) {
          setTimeout(function() {
            var container = document.querySelector('#deviceConnectionModal .device-modal-container');
            if (container && deviceTroubleshootBox) {
              var boxRect = deviceTroubleshootBox.getBoundingClientRect();
              var containerRect = container.getBoundingClientRect();
              var scrollOffset = boxRect.top - containerRect.top + container.scrollTop - 60;
              container.scrollTo({
                top: Math.max(0, scrollOffset),
                behavior: 'smooth'
              });
            }
          }, 80);
        }
      });
    }

    // Web Serial dynamic connect/disconnect hardware event listeners
    if ('serial' in navigator && navigator.serial) {
      try {
        navigator.serial.addEventListener('connect', function(e) {
          if (elDeviceModal && !elDeviceModal.classList.contains('hidden')) {
            renderAuthorizedPorts();
          }
          if (root.ArduiBlokSerial && root.ArduiBlokSerial.appendTerminal) {
            root.ArduiBlokSerial.appendTerminal('\n[USB] Perangkat serial terhubung.\n');
          }
        });

        navigator.serial.addEventListener('disconnect', function(e) {
          if (elDeviceModal && !elDeviceModal.classList.contains('hidden')) {
            renderAuthorizedPorts();
          }
          if (root.ArduiBlokSerial && root.ArduiBlokSerial.appendTerminal) {
            root.ArduiBlokSerial.appendTerminal('\n[USB] Perangkat serial dicabut.\n');
          }
        });
      } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  root.ArduiBlokDeviceManager = {
    openModal: openDeviceModal,
    closeModal: closeDeviceModal,
    renderPorts: renderAuthorizedPorts,
    triggerScan: triggerNewPortScan
  };

})(typeof window !== 'undefined' ? window : this);
