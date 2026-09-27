/**
 * ArduiBlok — In-Browser Arduino HEX Flasher (Web Serial API & STK500 v1)
 * Supports ATmega328P (Arduino Uno, Nano Optiboot) and compatible AVR boards.
 */

(function(root) {
  'use strict';

  // ── Intel HEX Parser ─────────────────────────────────────────
  function parseIntelHex(hexString) {
    if (!hexString) throw new Error('Data HEX kosong.');

    // Auto-decode if the string is Base64 encoded
    var cleanStr = hexString.trim();
    if (cleanStr.charAt(0) !== ':') {
      try {
        var decoded = atob(cleanStr);
        if (decoded.indexOf(':') !== -1) {
          cleanStr = decoded;
        }
      } catch (e) {
        // Not base64, proceed as raw
      }
    }

    var lines = cleanStr.split(/\r?\n/);
    var flashData = [];
    var maxAddress = 0;
    var extendedAddress = 0;
    var recordCount = 0;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.charAt(0) !== ':') continue;

      var byteCount = parseInt(line.substr(1, 2), 16);
      var address = parseInt(line.substr(3, 4), 16) + extendedAddress;
      var recordType = parseInt(line.substr(7, 2), 16);

      if (recordType === 0) { // Data record
        recordCount++;
        for (var b = 0; b < byteCount; b++) {
          var val = parseInt(line.substr(9 + b * 2, 2), 16);
          flashData[address + b] = val;
          if (address + b > maxAddress) {
            maxAddress = address + b;
          }
        }
      } else if (recordType === 1) { // End Of File
        break;
      } else if (recordType === 2) { // Extended Segment Address
        extendedAddress = parseInt(line.substr(9, 4), 16) << 4;
      } else if (recordType === 4) { // Extended Linear Address
        extendedAddress = parseInt(line.substr(9, 4), 16) << 16;
      }
    }

    if (recordCount === 0) {
      throw new Error('Format Intel HEX tidak valid: tidak ada baris data biner.');
    }

    var totalBytes = maxAddress + 1;
    // Pad to multiple of 128 bytes (flash page size for ATmega328P)
    var pageSize = 128;
    var paddedSize = Math.ceil(totalBytes / pageSize) * pageSize;
    var buffer = new Uint8Array(paddedSize);
    buffer.fill(0xFF);

    for (var addr = 0; addr <= maxAddress; addr++) {
      if (flashData[addr] !== undefined) {
        buffer[addr] = flashData[addr];
      }
    }

    return {
      bytes: buffer,
      totalLength: totalBytes,
      pageSize: pageSize,
      pageCount: paddedSize / pageSize
    };
  }

  // ── STK500 v1 Protocol Constants ─────────────────────────────
  var STK = {
    OK: 0x10,
    FAILED: 0x11,
    UNKNOWN: 0x12,
    NODEVICE: 0x13,
    INSYNC: 0x14,
    NOSYNC: 0x15,
    GET_SYNC: 0x30,
    SET_PARAMETER: 0x40,
    GET_PARAMETER: 0x41,
    SET_DEVICE: 0x42,
    SET_DEVICE_EXT: 0x45,
    ENTER_PROGMODE: 0x50,
    LEAVE_PROGMODE: 0x51,
    CHIP_ERASE: 0x52,
    CHECK_AUTOINC: 0x53,
    LOAD_ADDRESS: 0x55,
    PROG_FLASH: 0x60,
    PROG_DATA: 0x61,
    PROG_FUSE: 0x62,
    PROG_LOCK: 0x63,
    PROG_PAGE: 0x64,
    PROG_FUSE_EXT: 0x65,
    READ_FLASH: 0x70,
    READ_DATA: 0x71,
    READ_FUSE: 0x72,
    READ_LOCK: 0x73,
    READ_PAGE: 0x74,
    READ_SIGN: 0x75,
    READ_OSCCAL: 0x76,
    READ_FUSE_EXT: 0x77,
    READ_OSCCAL_EXT: 0x78,
    CRC_EOP: 0x20
  };

  // ── Helper: Delay Promise ────────────────────────────────────
  function sleep(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  // ── Arduino STK500 Flasher ───────────────────────────────────
  function ArduinoFlasher(port, options) {
    this.port = port;
    this.options = Object.assign({
      baudRate: 115200,
      pageSize: 128,
      timeoutMs: 1500,
      maxSyncAttempts: 25,
      onProgress: function(percent, message) {},
      onLog: function(msg) {}
    }, options || {});

    this.reader = null;
    this.writer = null;
    this.rxBuffer = [];
  }

  ArduinoFlasher.prototype.log = function(msg) {
    if (this.options.onLog) this.options.onLog(msg);
  };

  ArduinoFlasher.prototype.progress = function(percent, msg) {
    if (this.options.onProgress) this.options.onProgress(percent, msg);
  };

  // Pulse DTR to reset ATmega328P into bootloader mode (matching avrdude timing)
  ArduinoFlasher.prototype.resetTarget = async function() {
    this.log('Mereset board mikrokontroler via pulsa DTR...');
    try {
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await sleep(100);
      await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
      await sleep(250);
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await sleep(50);
    } catch (e) {
      this.log('Peringatan: Reset sinyal DTR gagal (' + e.message + '), melanjutkan...');
    }
  };

  // Read loop to accumulate incoming bytes
  ArduinoFlasher.prototype.startReading = function() {
    var self = this;
    var readable = this.port.readable;
    if (!readable) return;
    this.reader = readable.getReader();

    (async function() {
      try {
        while (self.reader) {
          var res = await self.reader.read();
          if (res.done) break;
          if (res.value) {
            for (var i = 0; i < res.value.length; i++) {
              self.rxBuffer.push(res.value[i]);
            }
          }
        }
      } catch (e) {
        // Reader cancelled or closed
      }
    })();
  };

  // Write raw bytes to port
  ArduinoFlasher.prototype.write = async function(bytes) {
    var data = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
    if (!this.writer) {
      this.writer = this.port.writable.getWriter();
    }
    await this.writer.write(data);
  };

  // Read N bytes from rx buffer with timeout
  ArduinoFlasher.prototype.readBytes = async function(count, timeoutMs) {
    var timeout = timeoutMs || this.options.timeoutMs;
    var startTime = Date.now();

    while (this.rxBuffer.length < count) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout menunggu respons STK500 (' + count + ' byte)');
      }
      await sleep(5);
    }

    return this.rxBuffer.splice(0, count);
  };

  // Send command and verify STK_INSYNC and STK_OK
  ArduinoFlasher.prototype.executeCommand = async function(cmdBytes, extraResponseLen) {
    extraResponseLen = extraResponseLen || 0;
    this.rxBuffer = []; // Clear previous leftover
    await this.write(cmdBytes);

    var totalExpected = 2 + extraResponseLen; // INSYNC + data + OK
    var resp = await this.readBytes(totalExpected);

    if (resp[0] !== STK.INSYNC) {
      throw new Error('STK500 sinkronisasi gagal: diharapkan 0x14, diterima 0x' + (resp[0] !== undefined ? resp[0].toString(16) : 'null'));
    }
    if (resp[resp.length - 1] !== STK.OK) {
      throw new Error('STK500 status error: diterima 0x' + resp[resp.length - 1].toString(16));
    }

    return resp.slice(1, resp.length - 1);
  };

  // Attempt sync with Optiboot bootloader
  ArduinoFlasher.prototype.sync = async function() {
    this.log('Menghubungkan ke STK500 bootloader...');
    var synced = false;

    // Drain any initial garbage
    await sleep(40);
    this.rxBuffer = [];

    for (var attempt = 1; attempt <= this.options.maxSyncAttempts; attempt++) {
      try {
        await this.write([STK.GET_SYNC, STK.CRC_EOP]);

        var startTime = Date.now();
        while (Date.now() - startTime < 250) {
          if (this.rxBuffer.length >= 2) {
            // Find 0x14 followed by 0x10 in stream
            for (var idx = 0; idx < this.rxBuffer.length - 1; idx++) {
              if (this.rxBuffer[idx] === STK.INSYNC && this.rxBuffer[idx + 1] === STK.OK) {
                this.rxBuffer.splice(0, idx + 2);
                synced = true;
                break;
              }
            }
            if (synced) break;
          }
          await sleep(10);
        }

        if (synced) {
          this.log('Tersambung ke bootloader pada percobaan ke-' + attempt);
          break;
        }
      } catch (e) {
        await sleep(30);
      }
    }

    if (!synced) {
      throw new Error('Gagal sinkronisasi dengan bootloader board. Pastikan port COM benar dan board terhubung.');
    }
  };

  // Main upload routine
  ArduinoFlasher.prototype.flashHex = async function(hexInput) {
    var parsed = parseIntelHex(hexInput);
    this.log('Ukuran binary: ' + parsed.totalLength + ' bytes (' + parsed.pageCount + ' halaman flash)');

    // 1. Open port if not already open
    var portOpenedByFlasher = false;
    if (!this.port.readable || !this.port.writable) {
      this.log('Membuka port serial pada ' + this.options.baudRate + ' baud...');
      await this.port.open({ baudRate: this.options.baudRate });
      portOpenedByFlasher = true;
    }

    try {
      this.startReading();

      // 2. Pulse DTR
      this.progress(5, 'Mereset target board...');
      await this.resetTarget();

      // 3. Sync STK500
      this.progress(15, 'Sinkronisasi bootloader STK500...');
      await this.sync();

      // 4. Enter Programming Mode
      this.progress(25, 'Masuk ke mode pemrograman...');
      try {
        await this.executeCommand([STK.ENTER_PROGMODE, STK.CRC_EOP]);
      } catch (e) {
        this.log('Peringatan enter progmode: ' + e.message + ', melanjutkan...');
      }

      // 5. Write pages
      var pageSize = parsed.pageSize;
      var totalPages = parsed.pageCount;

      for (var pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        var byteAddress = pageIdx * pageSize;
        // STK500 uses word address (2 bytes per word)
        var wordAddress = Math.floor(byteAddress / 2);

        // Load Address (Little Endian word address)
        var addrLow = wordAddress & 0xFF;
        var addrHigh = (wordAddress >> 8) & 0xFF;
        await this.executeCommand([STK.LOAD_ADDRESS, addrLow, addrHigh, STK.CRC_EOP]);

        // Program Page: [0x64, sizeHigh, sizeLow, 'F' (0x46), data..., 0x20]
        var pageBytes = parsed.bytes.slice(byteAddress, byteAddress + pageSize);
        var progCmd = new Uint8Array(5 + pageSize);
        progCmd[0] = STK.PROG_PAGE;
        progCmd[1] = (pageSize >> 8) & 0xFF;
        progCmd[2] = pageSize & 0xFF;
        progCmd[3] = 0x46; // 'F' for Flash
        progCmd.set(pageBytes, 4);
        progCmd[4 + pageSize] = STK.CRC_EOP;

        await this.executeCommand(progCmd);

        var currentPercent = Math.round(25 + ((pageIdx + 1) / totalPages) * 70);
        this.progress(currentPercent, 'Menulis flash: ' + (pageIdx + 1) + '/' + totalPages + ' halaman (' + currentPercent + '%)');
      }

      // 6. Leave Programming Mode
      this.progress(98, 'Menutup mode pemrograman...');
      try {
        await this.executeCommand([STK.LEAVE_PROGMODE, STK.CRC_EOP]);
      } catch (e) {
        // Ignored
      }

      this.progress(100, 'Upload Berhasil! Board me-restart sketch baru.');
      this.log('Flashing selesai dengan sukses.');

    } finally {
      // Clean up reader & writer
      if (this.writer) {
        try { this.writer.releaseLock(); } catch (e) {}
        this.writer = null;
      }
      if (this.reader) {
        try { await this.reader.cancel(); } catch (e) {}
        try { this.reader.releaseLock(); } catch (e) {}
        this.reader = null;
      }
      if (portOpenedByFlasher) {
        try { await this.port.close(); } catch (e) {}
        // Give Windows OS time to release serial handle
        await sleep(300);
      }
    }
  };

  // ── Helper: Base64 to Uint8Array ─────────────────────────────
  function base64ToUint8Array(base64Str) {
    if (!base64Str) throw new Error('Data biner firmware kosong.');
    var cleanStr = base64Str.trim();
    var binaryString;
    try {
      binaryString = atob(cleanStr);
    } catch (e) {
      binaryString = cleanStr;
    }
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // ── ESP8266 / ESP32 Flasher (Web Serial & ROM Bootloader via esptool-js) ──
  function EspFlasher(port, options) {
    this.port = port;
    this.options = Object.assign({
      baudRate: 115200,
      flashMode: 'keep',
      flashFreq: 'keep',
      flashSize: 'keep',
      onProgress: function(percent, message) {},
      onLog: function(msg) {}
    }, options || {});
  }

  EspFlasher.prototype.log = function(msg) {
    if (this.options.onLog) this.options.onLog(msg);
  };

  EspFlasher.prototype.progress = function(percent, msg) {
    if (this.options.onProgress) this.options.onProgress(percent, msg);
  };

  EspFlasher.prototype.flashBin = async function(binData) {
    this.log('Memulai persiapan flashing ESP8266 via Web Serial...');
    this.progress(5, 'Menyiapkan modul ESP Web Flasher...');

    // 1. Dapatkan esptooljs (dari window.esptooljs atau dynamic import)
    var esp = root.esptooljs;
    if (!esp || !esp.ESPLoader || !esp.Transport) {
      try {
        var mod = await import('./esptool_bundle.js');
        esp = (mod && mod.esptooljs) ? mod.esptooljs : mod;
      } catch (err) {
        throw new Error('Gagal memuat modul ESPTool Web Serial: ' + err.message);
      }
    }
    if (!esp || !esp.ESPLoader || !esp.Transport) {
      throw new Error('Modul ESPTool Web Serial belum siap di browser.');
    }

    // 2. Decode biner firmware
    var uint8Data;
    if (binData instanceof Uint8Array) {
      uint8Data = binData;
    } else if (typeof binData === 'string') {
      uint8Data = base64ToUint8Array(binData);
    } else {
      throw new Error('Format data biner tidak valid.');
    }

    if (uint8Data.length === 0) {
      throw new Error('Berkas biner firmware kosong.');
    }

    // Magic byte 0xE9 pengecekan (ESP image magic)
    if (uint8Data[0] !== 0xE9) {
      this.log('Catatan: Byte awal berkas 0x' + uint8Data[0].toString(16) + ' (standar ESP image 0xE9).');
    }

    this.log('Ukuran berkas firmware: ' + uint8Data.length + ' Bytes (' + (uint8Data.length / 1024).toFixed(1) + ' KB)');

    // 3. Inisialisasi Transport & ESPLoader
    var self = this;
    var transport = new esp.Transport(this.port);
    var targetBaud = this.options.baudRate || 115200;

    var esploader = new esp.ESPLoader({
      transport: transport,
      baudrate: targetBaud,
      romBaudrate: 115200,
      terminal: {
        clean: function() {},
        writeLine: function(line) { self.log(line); },
        write: function(line) { self.log(line); }
      }
    });

    try {
      // 4. Hubungkan ke bootloader ROM & sync
      this.progress(15, 'Menghubungkan ke bootloader ESP8266 (sinkronisasi serial)...');
      var chipName = '';
      try {
        chipName = await esploader.main();
      } catch (connErr) {
        throw new Error('Gagal sinkronisasi dengan bootloader ESP8266 (' + connErr.message + '). Tips: Tekan & tahan tombol BOOT/FLASH pada NodeMCU saat menghubungkan.');
      }

      this.log('Board ESP terhubung! Chip: ' + (chipName || 'ESP8266'));
      this.progress(30, 'Terhubung (' + (chipName || 'ESP8266') + '). Menyiapkan memori flash...');

      // 5. Flashing firmware pada offset 0x00000
      this.progress(35, 'Mengunggah program ke flash memory ESP8266...');
      await esploader.writeFlash({
        fileArray: [
          { data: uint8Data, address: 0x00000 }
        ],
        flashSize: self.options.flashSize || 'keep',
        flashMode: self.options.flashMode || 'keep',
        flashFreq: self.options.flashFreq || 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: function(fileIndex, written, total) {
          var pct = Math.min(98, Math.round(35 + ((written / total) * 60)));
          self.progress(pct, 'Mengunggah: ' + Math.round((written / total) * 100) + '% (' + Math.round(written / 1024) + ' KB / ' + Math.round(total / 1024) + ' KB)');
        }
      });

      // 6. Hard Reset ke sketch baru
      this.progress(98, 'Mereset board ke sketch baru...');
      try {
        await esploader.after('hard_reset');
      } catch (rstErr) {
        self.log('Peringatan reset: ' + rstErr.message);
      }

      this.progress(100, 'Upload Berhasil! Board ESP8266 me-restart sketch baru.');
      this.log('Flashing ESP8266 selesai dengan sukses.');

    } finally {
      // Clean up transport & disconnect
      try {
        await transport.disconnect();
      } catch (dcErr) {}
      await sleep(300);
    }
  };

  // Export to global scope
  root.ArduiBlokFlasher = {
    parseIntelHex: parseIntelHex,
    base64ToUint8Array: base64ToUint8Array,
    ArduinoFlasher: ArduinoFlasher,
    EspFlasher: EspFlasher
  };

})(typeof window !== 'undefined' ? window : this);

