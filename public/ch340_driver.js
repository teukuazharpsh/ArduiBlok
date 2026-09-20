/**
 * ArduiBlok — Pure JavaScript WebUSB Driver for QinHeng CH340 / CH341 Chips
 * Implements the W3C Web Serial API SerialPort interface for Chrome Android OTG.
 */

(function(root) {
  'use strict';

  var CH341_REQ_WRITE_REG = 0x9A;
  var CH341_REQ_READ_REG = 0x95;
  var CH341_REQ_INIT = 0xA1;
  var CH341_REG_SERIAL = 0xC29C;
  var CH341_REG_MODEM = 0xA4;

  var BAUD_TABLE = {
    300:    { reg1: 0xd980, reg2: 0xeb },
    600:    { reg1: 0x6481, reg2: 0x76 },
    1200:   { reg1: 0xb281, reg2: 0x3b },
    2400:   { reg1: 0xd981, reg2: 0x1e },
    4800:   { reg1: 0x6482, reg2: 0x0f },
    9600:   { reg1: 0xb282, reg2: 0x08 },
    14400:  { reg1: 0xd980, reg2: 0xeb },
    19200:  { reg1: 0xd982, reg2: 0x07 },
    38400:  { reg1: 0x6483, reg2: 0x00 },
    57600:  { reg1: 0x9883, reg2: 0x00 },
    115200: { reg1: 0xcc83, reg2: 0x00 },
    230400: { reg1: 0xe683, reg2: 0x00 },
    460800: { reg1: 0xf383, reg2: 0x00 },
    921600: { reg1: 0xf387, reg2: 0x00 }
  };

  function CH340SerialPort(device) {
    this.device = device;
    this.opened = false;
    this.inEndpointNumber = 2;
    this.outEndpointNumber = 2;
    this.baudRate = 9600;
    this.dtr = false;
    this.rts = false;
    this.readable = null;
    this.writable = null;
    this.keepReading = false;
  }

  CH340SerialPort.prototype.getInfo = function() {
    return {
      usbVendorId: this.device.vendorId,
      usbProductId: this.device.productId
    };
  };

  CH340SerialPort.prototype.setBaudRate = async function(baud) {
    this.baudRate = baud || 9600;
    var params = BAUD_TABLE[this.baudRate] || BAUD_TABLE[9600];
    try {
      await this.device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: CH341_REQ_WRITE_REG,
        value: 0x1312,
        index: params.reg1
      });
      await this.device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: CH341_REQ_WRITE_REG,
        value: 0x0f2c,
        index: params.reg2
      });
    } catch (e) {
      console.warn('[CH340] Gagal set baudrate:', e);
    }
  };

  CH340SerialPort.prototype.setSignals = async function(signals) {
    if (!signals) return;
    if (signals.dataTerminalReady !== undefined) {
      this.dtr = !!signals.dataTerminalReady;
    }
    if (signals.requestToSend !== undefined) {
      this.rts = !!signals.requestToSend;
    }
    // DTR is bit 5 (0x20), RTS is bit 6 (0x40). Active LOW logic on CH340.
    var val = 0;
    if (this.dtr) val |= 0x20;
    if (this.rts) val |= 0x40;
    var regVal = (~val) & 0xFF;
    try {
      await this.device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: CH341_REG_MODEM,
        value: regVal,
        index: 0
      });
    } catch (e) {
      console.warn('[CH340] Gagal setSignals:', e);
    }
  };

  CH340SerialPort.prototype.open = async function(options) {
    if (this.opened) return;
    options = options || {};
    var baud = options.baudRate || 9600;

    await this.device.open();
    if (this.device.configuration === null) {
      await this.device.selectConfiguration(1);
    }

    // Klaim Interface 0
    var iface = this.device.configuration.interfaces[0];
    await this.device.claimInterface(0);

    // Deteksi nomor endpoint IN dan OUT
    if (iface && iface.alternates && iface.alternates[0] && iface.alternates[0].endpoints) {
      var endpoints = iface.alternates[0].endpoints;
      for (var i = 0; i < endpoints.length; i++) {
        var ep = endpoints[i];
        if (ep.type === 'bulk') {
          if (ep.direction === 'in') this.inEndpointNumber = ep.endpointNumber;
          else if (ep.direction === 'out') this.outEndpointNumber = ep.endpointNumber;
        }
      }
    }

    // Inisialisasi Register CH340
    try {
      await this.device.controlTransferOut({
        requestType: 'vendor',
        recipient: 'device',
        request: CH341_REQ_INIT,
        value: CH341_REG_SERIAL,
        index: 0xB2B2
      });
    } catch (e) {
      console.warn('[CH340] Init transfer 1 warning:', e);
    }

    // Set modem aktif
    await this.setSignals({ dataTerminalReady: true, requestToSend: true });

    // Set Baud Rate
    await this.setBaudRate(baud);

    var self = this;
    this.keepReading = true;

    // Stream Readable
    this.readable = new ReadableStream({
      async pull(controller) {
        if (!self.opened || !self.keepReading) return;
        try {
          var res = await self.device.transferIn(self.inEndpointNumber, 64);
          if (res.status === 'ok' && res.data && res.data.byteLength > 0) {
            controller.enqueue(new Uint8Array(res.data.buffer, res.data.byteOffset, res.data.byteLength));
          }
        } catch (err) {
          if (self.keepReading) {
            controller.error(err);
          }
        }
      },
      cancel() {
        self.keepReading = false;
      }
    });

    // Stream Writable
    this.writable = new WritableStream({
      async write(chunk, controller) {
        if (!self.opened) throw new Error('Port CH340 belum terbuka.');
        var data = (chunk instanceof Uint8Array) ? chunk : new Uint8Array(chunk);
        var res = await self.device.transferOut(self.outEndpointNumber, data);
        if (res.status !== 'ok') {
          throw new Error('USB transferOut gagal: ' + res.status);
        }
      }
    });

    this.opened = true;
  };

  CH340SerialPort.prototype.close = async function() {
    this.keepReading = false;
    this.opened = false;
    try {
      await this.setSignals({ dataTerminalReady: false, requestToSend: false });
    } catch (e) {}
    try {
      await this.device.releaseInterface(0);
    } catch (e) {}
    try {
      await this.device.close();
    } catch (e) {}
    this.readable = null;
    this.writable = null;
  };

  // ── Universal Serial API (WebUSB Fallback with CH340 Support) ──
  var UniversalSerial = {
    getPorts: async function() {
      if (!('usb' in navigator) || !navigator.usb) return [];
      try {
        var devices = await navigator.usb.getDevices();
        return devices.map(function(d) {
          if (d.vendorId === 0x1a86) {
            return new CH340SerialPort(d);
          } else if (window.WebSerialPolyfill && window.WebSerialPolyfill.SerialPort) {
            try { return new window.WebSerialPolyfill.SerialPort(d); } catch (e) { return new CH340SerialPort(d); }
          }
          return new CH340SerialPort(d);
        });
      } catch (e) {
        return [];
      }
    },

    requestPort: async function(options) {
      if (!('usb' in navigator) || !navigator.usb) {
        throw new Error('WebUSB tidak didukung di browser ini.');
      }

      // Filter komprehensif agar Chrome TIDAK menyembunyikan board Arduino Uno CH340
      var filters = [
        { vendorId: 0x1a86 }, // QinHeng Electronics (CH340, CH341, CH340G, CH340C)
        { vendorId: 0x2341 }, // Arduino SA (Uno, Mega, Leonardo)
        { vendorId: 0x2a03 }, // Arduino.org
        { vendorId: 0x10c4 }, // Silicon Labs CP210x
        { vendorId: 0x0403 }, // FTDI
        {}                    // Filter kosong agar semua perangkat USB yang dicolokkan ke OTG ditampilkan
      ];

      var device = await navigator.usb.requestDevice({ filters: filters });

      if (device.vendorId === 0x1a86) {
        console.log('[UniversalSerial] Menggunakan driver native CH340 WebUSB untuk:', device.productName);
        return new CH340SerialPort(device);
      } else if (window.WebSerialPolyfill && window.WebSerialPolyfill.SerialPort) {
        try {
          return new window.WebSerialPolyfill.SerialPort(device);
        } catch (e) {
          console.warn('[UniversalSerial] CDC fallback ke generic port:', e);
          return new CH340SerialPort(device);
        }
      } else {
        return new CH340SerialPort(device);
      }
    }
  };

  root.CH340SerialPort = CH340SerialPort;
  root.ArduiBlokUniversalSerial = UniversalSerial;

})(typeof window !== 'undefined' ? window : this);
