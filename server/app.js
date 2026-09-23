const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { execFile, execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());                        // Izinkan request dari origin manapun (WebView Android)
app.use(express.json({ limit: '50mb' })); // Parse JSON body, max 50MB (mendukung upload file .ZIP library)
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public'))); // Serve frontend statis

// Path ke folder temp dan libraries (relative ke project root)
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const LIBRARIES_DIR = path.join(__dirname, '..', 'libraries');

// Pastikan folder temp ada
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ── Popular Library Registry (Fast Index) ────────────────────
const POPULAR_LIBRARIES = [
  {
    name: 'LiquidCrystal I2C',
    author: 'Frank de Brabander',
    version: '1.1.2',
    sentence: 'Driver untuk LCD 16x2 / 20x4 berbasis modul PCF8574 I2C (Pin A4 SDA, Pin A5 SCL).',
    category: 'Display',
    header: 'LiquidCrystal_I2C.h',
    exampleInclude: '#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\nLiquidCrystal_I2C lcd(0x27, 16, 2);'
  },
  {
    name: 'Adafruit NeoPixel',
    author: 'Adafruit',
    version: '1.12.0',
    sentence: 'Library pengontrol strip/ring LED RGB & RGBW beralamat berbasis chip WS2812, WS2811, dan SK6812.',
    category: 'Display',
    header: 'Adafruit_NeoPixel.h',
    exampleInclude: '#include <Adafruit_NeoPixel.h>\n#define PIN_LED 6\n#define NUM_LEDS 8\nAdafruit_NeoPixel strip(NUM_LEDS, PIN_LED, NEO_GRB + NEO_KHZ800);'
  },
  {
    name: 'DHT sensor library',
    author: 'Adafruit',
    version: '1.4.6',
    sentence: 'Membaca data suhu dan kelembaban udara dari sensor DHT11, DHT22, dan AM2302.',
    category: 'Sensors',
    header: 'DHT.h',
    exampleInclude: '#include <DHT.h>\n#define DHTPIN 2\n#define DHTTYPE DHT11\nDHT dht(DHTPIN, DHTTYPE);'
  },
  {
    name: 'Servo',
    author: 'Michael Margolis, Arduino',
    version: '1.2.1',
    sentence: 'Library standar untuk mengendalikan sudut servo motor (0 - 180 derajat).',
    category: 'Device Control',
    header: 'Servo.h',
    exampleInclude: '#include <Servo.h>\nServo myServo;'
  },
  {
    name: 'MFRC522',
    author: 'GithubCommunity',
    version: '1.4.10',
    sentence: 'Membaca dan menulis kartu/tag RFID 13.56MHz berbasis modul RC522 SPI.',
    category: 'Communication',
    header: 'MFRC522.h',
    exampleInclude: '#include <SPI.h>\n#include <MFRC522.h>\n#define RST_PIN 9\n#define SS_PIN 10\nMFRC522 rfid(SS_PIN, RST_PIN);'
  },
  {
    name: 'Adafruit SSD1306',
    author: 'Adafruit',
    version: '2.5.9',
    sentence: 'Driver layar OLED grafis monokrom 128x64 / 128x32 I2C dan SPI.',
    category: 'Display',
    header: 'Adafruit_SSD1306.h',
    exampleInclude: '#include <Wire.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>\nAdafruit_SSD1306 display(128, 64, &Wire, -1);'
  },
  {
    name: 'Adafruit GFX Library',
    author: 'Adafruit',
    version: '1.11.9',
    sentence: 'Library grafis inti untuk menggambar garis, lingkaran, teks, dan bitmap pada berbagai layar.',
    category: 'Display',
    header: 'Adafruit_GFX.h',
    exampleInclude: '#include <Adafruit_GFX.h>'
  },
  {
    name: 'RTClib',
    author: 'Adafruit',
    version: '2.1.3',
    sentence: 'Membaca waktu presisi (Jam, Menit, Detik, Tanggal) dari modul Real Time Clock DS1307, DS3231, PCF8523.',
    category: 'Timing',
    header: 'RTClib.h',
    exampleInclude: '#include <Wire.h>\n#include "RTClib.h"\nRTC_DS3231 rtc;'
  },
  {
    name: 'ArduinoJson',
    author: 'Benoit Blanchon',
    version: '7.0.4',
    sentence: 'Parser dan serializer JSON tercepat dan efisien memori untuk mikrokontroler.',
    category: 'Data Processing',
    header: 'ArduinoJson.h',
    exampleInclude: '#include <ArduinoJson.h>'
  },
  {
    name: 'Keypad',
    author: 'Mark Stanley, Alexander Brevig',
    version: '3.1.1',
    sentence: 'Membaca input matriks keypad tombol (3x4, 4x4) pada Arduino.',
    category: 'Input',
    header: 'Keypad.h',
    exampleInclude: '#include <Keypad.h>'
  },
  {
    name: 'MPU6050_tockn',
    author: 'Tockn',
    version: '1.5.2',
    sentence: 'Membaca sudut kemiringan Roll, Pitch, Yaw dan percepatan Gyroscope 6-Axis MPU6050.',
    category: 'Sensors',
    header: 'MPU6050_tockn.h',
    exampleInclude: '#include <Wire.h>\n#include <MPU6050_tockn.h>\nMPU6050 mpu6050(Wire);'
  },
  {
    name: 'DFRobotDFPlayerMini',
    author: 'DFRobot',
    version: '1.0.6',
    sentence: 'Memutar file audio MP3 dari kartu MicroSD menggunakan modul DFPlayer Mini.',
    category: 'Audio',
    header: 'DFRobotDFPlayerMini.h',
    exampleInclude: '#include <SoftwareSerial.h>\n#include <DFRobotDFPlayerMini.h>\nSoftwareSerial mySerial(10, 11);\nDFRobotDFPlayerMini myDFPlayer;'
  },
  {
    name: 'FastLED',
    author: 'Daniel Garcia',
    version: '3.6.0',
    sentence: 'Library animasi LED beralamat berkecepatan tinggi dengan berbagai efek warna matematis.',
    category: 'Display',
    header: 'FastLED.h',
    exampleInclude: '#include <FastLED.h>'
  },
  {
    name: 'PubSubClient',
    author: 'Nick O\'Leary',
    version: '2.8.0',
    sentence: 'Client protokol MQTT untuk komunikasi IoT, dashboard, dan cloud broker.',
    category: 'Communication',
    header: 'PubSubClient.h',
    exampleInclude: '#include <PubSubClient.h>'
  },
  {
    name: 'OneWire',
    author: 'Paul Stoffregen',
    version: '2.3.8',
    sentence: 'Protokol komunikasi 1-Wire untuk sensor suhu digital waterproof Dallas DS18B20.',
    category: 'Sensors',
    header: 'OneWire.h',
    exampleInclude: '#include <OneWire.h>'
  },
  {
    name: 'DallasTemperature',
    author: 'Miles Burton',
    version: '3.9.0',
    sentence: 'Driver sensor suhu digital presisi Dallas DS18B20 berbasis protokol OneWire.',
    category: 'Sensors',
    header: 'DallasTemperature.h',
    exampleInclude: '#include <OneWire.h>\n#include <DallasTemperature.h>'
  }
];

// Helper: Ambil daftar folder library yang sudah terpasang
function getInstalledLibraries() {
  const installed = new Set(['Servo', 'Wire', 'SPI', 'SoftwareSerial', 'EEPROM', 'HID']);
  
  const possiblePaths = [
    LIBRARIES_DIR,
    path.join(process.env.USERPROFILE || '', 'Documents', 'Arduino', 'libraries'),
    path.join(process.env.USERPROFILE || '', 'OneDrive', 'Documents', 'Arduino', 'libraries'),
    path.join(process.env.HOME || '', 'Arduino', 'libraries'),
    path.join(process.env.HOME || '', 'sketchbook', 'libraries'),
    '/root/Arduino/libraries'
  ];

  possiblePaths.forEach(dirPath => {
    if (dirPath && fs.existsSync(dirPath)) {
      try {
        const dirs = fs.readdirSync(dirPath, { withFileTypes: true });
        dirs.forEach(d => {
          if (d.isDirectory()) {
            installed.add(d.name);
            installed.add(d.name.replace(/_/g, ' '));
            installed.add(d.name.replace(/-/g, ' '));
          }
        });
      } catch (e) {}
    }
  });

  return Array.from(installed);
}

// Pastikan konfigurasi arduino-cli mengizinkan instalasi library .zip / git-url
try {
  execSync('arduino-cli config set library.enable_unsafe_install true', { stdio: 'ignore' });
} catch (cfgErr) {
  console.warn('[config] Note enable_unsafe_install:', cfgErr.message);
}

// Sinkronisasi index katalog library resmi Arduino di background saat startup
execFile('arduino-cli', ['lib', 'update-index'], { timeout: 60000 }, (err) => {
  if (err) {
    console.warn('[library] Info: sinkronisasi index library akan menggunakan cache lokal:', err.message);
  } else {
    console.log('[library] Sinkronisasi katalog resmi Arduino (library_index) berhasil.');
  }
});

// ── GET /health ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ArduiBlok server is running' });
});

// ── GET /api/libraries/search ──────────────────────────────
app.get('/api/libraries/search', (req, res) => {
  const rawQuery = (req.query.q || '').trim();
  const category = (req.query.category || req.query.cat || '').trim();
  const query = rawQuery.toLowerCase();
  const installedList = getInstalledLibraries();

  // 1. Ambil kecocokan awal dari katalog cepat bawaan
  let localResults = POPULAR_LIBRARIES.filter(lib => {
    const matchCat = !category || category.toLowerCase() === 'all' || (lib.category || '').toLowerCase() === category.toLowerCase();
    if (!matchCat) return false;
    if (!query) return true;
    return lib.name.toLowerCase().includes(query) ||
           lib.author.toLowerCase().includes(query) ||
           lib.sentence.toLowerCase().includes(query) ||
           lib.category.toLowerCase().includes(query) ||
           lib.header.toLowerCase().includes(query);
  });

  // Tentukan kata kunci pencarian ke arduino-cli
  const searchTerm = rawQuery || (category && category.toLowerCase() !== 'all' ? category : '');

  // Jika tidak ada query dan tidak ada filter kategori khusus, kirim katalog rekomendasi cepat
  if (!searchTerm || (searchTerm.length < 2 && (!category || category.toLowerCase() === 'all'))) {
    const formatted = localResults.map(lib => ({
      ...lib,
      installed: installedList.some(inst =>
        inst.toLowerCase() === lib.name.toLowerCase() ||
        inst.toLowerCase().replace(/_/g, ' ') === lib.name.toLowerCase()
      )
    }));
    return res.json({
      success: true,
      count: formatted.length,
      libraries: formatted
    });
  }

  // 2. Lakukan live search via arduino-cli lib search ke seluruh katalog resmi Arduino (~6000+ library)
  execFile(
    'arduino-cli',
    ['lib', 'search', searchTerm, '--format', 'json'],
    { timeout: 15000, maxBuffer: 25 * 1024 * 1024 },
    (error, stdout, stderr) => {
      let combined = [...localResults];
      const seenNames = new Set(localResults.map(l => l.name.toLowerCase()));

      if (!error && stdout) {
        try {
          const cliData = JSON.parse(stdout);
          if (cliData && Array.isArray(cliData.libraries)) {
            cliData.libraries.forEach(item => {
              const name = item.name || '';
              if (!name || seenNames.has(name.toLowerCase())) return;

              const rel = item.latest || (item.releases ? Object.values(item.releases)[0] : null) || {};
              const libCat = rel.category || 'General';

              // Filter kategori jika ditentukan
              if (category && category.toLowerCase() !== 'all' && libCat.toLowerCase() !== category.toLowerCase()) {
                return;
              }

              seenNames.add(name.toLowerCase());

              const header = (rel.provides_includes && rel.provides_includes.length > 0)
                ? rel.provides_includes[0]
                : (name.replace(/\s+/g, '') + '.h');

              combined.push({
                name: name,
                author: rel.author || rel.maintainer || 'Arduino Contributor',
                version: rel.version || '1.0.0',
                sentence: rel.sentence || rel.paragraph || `Library ${name} untuk Arduino.`,
                category: libCat,
                header: header,
                exampleInclude: `#include <${header}>`
              });
            });
          }
        } catch (parseErr) {
          console.warn('[library] Parse error from CLI search:', parseErr.message);
        }
      }

      // Tandai status installed dan batasi maksimal 200 hasil per query agar browser tetap sangat cepat
      const limitedResults = combined.slice(0, 200).map(lib => ({
        ...lib,
        installed: installedList.some(inst =>
          inst.toLowerCase() === lib.name.toLowerCase() ||
          inst.toLowerCase().replace(/_/g, ' ') === lib.name.toLowerCase()
        )
      }));

      res.json({
        success: true,
        count: limitedResults.length,
        libraries: limitedResults
      });
    }
  );
});

// ── GET /api/libraries/installed ───────────────────────────
app.get('/api/libraries/installed', (req, res) => {
  const installed = getInstalledLibraries();
  res.json({
    success: true,
    installed: installed
  });
});

// ── POST /api/libraries/install ────────────────────────────
app.post('/api/libraries/install', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Nama library wajib diisi.' });
  }

  const libName = name.trim();
  console.log(`[library] Menginstall library: "${libName}"...`);

  // Pastikan direktori libraries lokal ada jika dibutuhkan
  if (!fs.existsSync(LIBRARIES_DIR)) {
    fs.mkdirSync(LIBRARIES_DIR, { recursive: true });
  }

  // Jalankan arduino-cli lib install tanpa flag invalid
  execFile(
    'arduino-cli',
    ['lib', 'install', libName],
    { timeout: 120000 },
    (error, stdout, stderr) => {
      const output = (stdout || '') + (stderr || '');
      if (error) {
        console.error(`[library] Error install "${libName}":`, output);
        return res.status(500).json({
          success: false,
          error: `Gagal menginstall library "${libName}": ` + (output || error.message),
          log: output
        });
      }

      console.log(`[library] Sukses install "${libName}":`, stdout);
      res.json({
        success: true,
        message: `Library "${libName}" berhasil dipasang!`,
        log: stdout
      });
    }
  );
});

// ── POST /api/libraries/upload-zip (Pemasangan Library dari .ZIP) ─
app.post('/api/libraries/upload-zip', async (req, res) => {
  const { filename, base64Data } = req.body;

  if (!base64Data || typeof base64Data !== 'string') {
    return res.status(400).json({ success: false, error: 'Data berkas .zip tidak ditemukan.' });
  }

  const rawFilename = (filename && typeof filename === 'string') ? filename : 'custom_library.zip';
  if (!rawFilename.toLowerCase().endsWith('.zip')) {
    return res.status(400).json({ success: false, error: 'Format berkas harus berupa file .zip!' });
  }

  const tempZipId = 'ziplib_' + uuidv4().replace(/-/g, '').substring(0, 10);
  const tempZipPath = path.join(TEMP_DIR, tempZipId + '.zip');

  try {
    const zipBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(tempZipPath, zipBuffer);

    if (!fs.existsSync(LIBRARIES_DIR)) {
      fs.mkdirSync(LIBRARIES_DIR, { recursive: true });
    }

    console.log(`[library] Upload .zip diterima (${zipBuffer.length} bytes): ${rawFilename}`);

    // Pastikan unsafe_install aktif
    try {
      execSync('arduino-cli config set library.enable_unsafe_install true', { stdio: 'ignore' });
    } catch (e) {}

    // Jalankan instalasi menggunakan arduino-cli lib install --zip-path
    execFile(
      'arduino-cli',
      ['lib', 'install', '--zip-path', tempZipPath],
      { timeout: 120000 },
      (error, stdout, stderr) => {
        const output = (stdout || '') + (stderr || '');

        let detectedLibName = rawFilename
          .replace(/\.zip$/i, '')
          .replace(/[-_]master$/i, '')
          .replace(/[-_]main$/i, '')
          .trim();

        const safeDirName = detectedLibName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const targetExtractDir = path.join(LIBRARIES_DIR, safeDirName);

        // Ekstraksi fallback jika arduino-cli error / gagal
        if (error) {
          console.warn(`[library] Info: Ekstraksi fallback untuk .zip...`);
          if (!fs.existsSync(targetExtractDir)) {
            fs.mkdirSync(targetExtractDir, { recursive: true });
          }

          let extracted = false;
          if (process.platform === 'win32') {
            try {
              execSync(`powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '${tempZipPath}' -DestinationPath '${targetExtractDir}' -Force"`, { timeout: 30000 });
              extracted = true;
            } catch (pErr) {
              try {
                execSync(`tar -xf "${tempZipPath}" -C "${targetExtractDir}"`, { timeout: 30000 });
                extracted = true;
              } catch (tErr) {}
            }
          } else {
            try {
              execSync(`unzip -o "${tempZipPath}" -d "${targetExtractDir}"`, { timeout: 30000 });
              extracted = true;
            } catch (uErr) {
              try {
                execSync(`tar -xf "${tempZipPath}" -C "${targetExtractDir}"`, { timeout: 30000 });
                extracted = true;
              } catch (tErr) {}
            }
          }

          if (!extracted) {
            try { if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath); } catch (e) {}
            return res.status(500).json({
              success: false,
              error: `Gagal mengekstrak berkas .zip library. Pastikan file zip valid dan tidak rusak.`,
              log: output
            });
          }
        }

        // Hapus file zip sementara
        try { if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath); } catch (e) {}

        // Scan direktori library untuk mendeteksi file header (.h) utama
        let detectedHeader = '';
        const searchHeader = (dir, depth) => {
          if (!fs.existsSync(dir) || (depth && depth > 3)) return;
          try {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
              if (item.isFile() && item.name.toLowerCase().endsWith('.h') && !detectedHeader) {
                detectedHeader = item.name;
              } else if (item.isDirectory() && !item.name.startsWith('.')) {
                searchHeader(path.join(dir, item.name), (depth || 0) + 1);
              }
            }
          } catch (e) {}
        };

        // Cari di direktori ekstraksi target terlebih dahulu
        if (fs.existsSync(targetExtractDir)) {
          searchHeader(targetExtractDir, 0);
        }
        if (!detectedHeader) {
          searchHeader(LIBRARIES_DIR, 0);
        }
        if (!detectedHeader) {
          detectedHeader = detectedLibName.replace(/\s+/g, '') + '.h';
        }

        console.log(`[library] Sukses memasang .zip library: "${detectedLibName}" (Header: ${detectedHeader})`);

        res.json({
          success: true,
          message: `Library "${detectedLibName}" berhasil dipasang dari berkas .ZIP!`,
          libraryName: detectedLibName,
          header: detectedHeader,
          exampleInclude: `#include <${detectedHeader}>`,
          log: stdout || 'Installed successfully'
        });
      }
    );
  } catch (err) {
    try { if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath); } catch (e) {}
    console.error(`[library] Exception upload-zip:`, err);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memproses file .zip: ' + err.message
    });
  }
});

// ── POST /compile ──────────────────────────────────────────
app.post('/compile', async (req, res) => {
  const { code, fqbn } = req.body;

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Field "code" wajib diisi dan harus berupa string kode Arduino yang valid.'
    });
  }

  // Whitelist FQBN yang didukung
  const allowedFqbns = [
    'arduino:avr:uno',
    'arduino:avr:nano:cpu=atmega328old',
    'arduino:avr:nano:cpu=atmega328',
    'arduino:avr:nano:cpu=atmega168',
    'arduino:avr:mega:cpu=atmega2560',
    'arduino:avr:pro:cpu=16MHzatmega328',
    'arduino:avr:pro:cpu=8MHzatmega328',
    'arduino:avr:leonardo'
  ];
  const targetFqbn = (typeof fqbn === 'string' && allowedFqbns.includes(fqbn.trim()))
    ? fqbn.trim()
    : 'arduino:avr:uno';

  const sketchId = 'sketch_' + uuidv4().replace(/-/g, '').substring(0, 12);
  const sketchDir = path.join(TEMP_DIR, sketchId);
  const sketchFile = path.join(sketchDir, sketchId + '.ino');
  const outputDir = path.join(sketchDir, 'build');

  try {
    fs.mkdirSync(sketchDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(sketchFile, code, 'utf8');

    console.log(`[compile] Sketch created: ${sketchFile} | Target FQBN: ${targetFqbn}`);

    const compileArgs = [
      'compile',
      '--fqbn', targetFqbn,
      '--output-dir', outputDir
    ];

    if (fs.existsSync(LIBRARIES_DIR)) {
      compileArgs.push('--libraries', LIBRARIES_DIR);
    }
    compileArgs.push(sketchDir);

    const compileResult = await new Promise((resolve, reject) => {
      execFile(
        'arduino-cli',
        compileArgs,
        {
          timeout: 120000,
          maxBuffer: 1024 * 1024
        },
        (error, stdout, stderr) => {
          const rawLog = ((stdout || '') + (stderr ? '\n' + stderr : '')).trim();
          if (error) {
            const errorMsg = (stderr || '') + (stdout || '') + (error.message || '');
            console.error(`[compile] ERROR: ${errorMsg}`);
            const compileErr = new Error(errorMsg);
            compileErr.log = rawLog || errorMsg;
            reject(compileErr);
            return;
          }

          console.log(`[compile] SUCCESS: ${stdout}`);

          const files = fs.readdirSync(outputDir);
          const hexFile = files.find(f => f.endsWith('.hex'));

          if (!hexFile) {
            const noHexErr = new Error('Compile berhasil tapi file .hex tidak ditemukan di output directory.');
            noHexErr.log = rawLog;
            reject(noHexErr);
            return;
          }

          resolve({
            hexPath: path.join(outputDir, hexFile),
            log: rawLog
          });
        }
      );
    });

    const hexContent = fs.readFileSync(compileResult.hexPath);
    const hexBase64 = hexContent.toString('base64');

    console.log(`[compile] Hex file size: ${hexContent.length} bytes`);

    res.json({
      success: true,
      hex: hexBase64,
      log: compileResult.log,
      fqbn: targetFqbn
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Terjadi error saat compile.',
      log: err.log || err.message || 'Terjadi error saat compile.'
    });
  } finally {
    try {
      if (fs.existsSync(sketchDir)) {
        fs.rmSync(sketchDir, { recursive: true, force: true });
        console.log(`[compile] Cleanup: ${sketchDir} deleted`);
      }
    } catch (cleanupErr) {
      console.error(`[compile] Cleanup error: ${cleanupErr.message}`);
    }
  }
});

// ── Start HTTP Server ──────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   🤖 ArduiBlok Server is running!       ║');
  console.log(`  ║   📡 HTTP:  http://localhost:${PORT}        ║`);
  console.log('  ╚══════════════════════════════════════════╝');
});

// ── Start HTTPS Server (for Android WebUSB/WebSerial Secure Context) ──
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  try {
    console.log('[HTTPS] Menghasilkan sertifikat SSL mandiri (self-signed)...');
    execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=ArduiBlok"`, { stdio: 'ignore' });
  } catch (e) {
    console.warn('[HTTPS] OpenSSL tidak tersedia untuk auto-generate SSL cert.');
  }
}

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  try {
    const sslOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`  🔒 HTTPS: https://localhost:${HTTPS_PORT}`);
      console.log(`  📱 Android HTTPS (Secure Context): https://[IP-Komputer]:${HTTPS_PORT}`);
      console.log('');
    });
  } catch (sslErr) {
    console.warn(`[HTTPS] Gagal mengaktifkan HTTPS: ${sslErr.message}`);
  }
}
