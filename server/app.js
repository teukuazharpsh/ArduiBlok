const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());                        // Izinkan request dari origin manapun (WebView Android)
app.use(express.json({ limit: '1mb' })); // Parse JSON body, max 1MB
app.use(express.static(path.join(__dirname, '..', 'public'))); // Serve frontend statis

// Path ke folder temp dan libraries (relative ke project root)
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const LIBRARIES_DIR = path.join(__dirname, '..', 'libraries');

// Pastikan folder temp ada
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ── GET /health ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ArduiBlok server is running' });
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

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   🤖 ArduiBlok Server is running!       ║');
  console.log(`  ║   📡 http://localhost:${PORT}              ║`);
  console.log('  ║   Press Ctrl+C to stop                  ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
