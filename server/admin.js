/**
 * ArduiBlok — Superadmin Router & Management API (server/admin.js)
 * Secured with SHA-256 cryptographic email fingerprinting and JWT verification.
 */

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const { execSync, spawn } = require('child_process');
const db = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'arduiblok_jwt_secret_key_2026';

// Hash SHA-256 dari email Superadmin (teukuazharpasha@gmail.com)
// Mengamankan identitas admin tanpa menulis email secara plaintext
const ADMIN_EMAIL_HASH = process.env.ADMIN_EMAIL_HASH || '1ce309a535b4f7f27538381ed434ce505570f4b74a40b25ae7647dd1b611d5ea';

/**
 * Memeriksa apakah sebuah alamat email adalah Superadmin melalui pencocokan hash SHA-256
 * @param {string} email
 * @returns {boolean}
 */
function isSuperAdmin(email) {
  if (!email || typeof email !== 'string') return false;
  const hash = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return hash === ADMIN_EMAIL_HASH;
}

/**
 * Middleware: Memastikan hanya Superadmin yang terautentikasi yang dapat mengakses API ini
 */
function requireSuperAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Akses ditolak: Token autentikasi tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !isSuperAdmin(decoded.email)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak: Hanya Superadmin yang diizinkan mengakses panel ini.' });
    }
    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Sesi autentikasi telah kedaluwarsa atau tidak valid.' });
  }
}

// Pasang proteksi superadmin pada seluruh rute di bawah ini
router.use(requireSuperAdmin);

// ── 1. Statistik Server & Database ───────────────────────────
router.get('/stats', (req, res) => {
  try {
    const stats = db.getDbStats();
    return res.json({
      success: true,
      stats: {
        ...stats,
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        serverTime: new Date().toISOString()
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Gagal mengambil statistik server: ' + err.message });
  }
});

// ── 2. Daftar Pengguna Terdaftar ─────────────────────────────
router.get('/users', (req, res) => {
  try {
    const users = db.getAllUsers();
    return res.json({
      success: true,
      total: users.length,
      users: users
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Gagal mengambil daftar pengguna: ' + err.message });
  }
});

// ── 3. Hapus Pengguna (Opsional untuk Moderasi) ───────────────
router.delete('/users/:id', (req, res) => {
  try {
    const userId = req.params.id;
    if (userId === req.adminUser.userId) {
      return res.status(400).json({ success: false, error: 'Tidak dapat menghapus akun Anda sendiri.' });
    }

    const deleted = db.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
    }

    return res.json({ success: true, message: 'Pengguna berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Gagal menghapus pengguna: ' + err.message });
  }
});

// ── 4. Unduh Cadangan Data (Backup db.json) ───────────────────
router.get('/backup', (req, res) => {
  try {
    const rawData = db.getRawDatabaseData();
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `arduiblok_db_backup_${dateStr}.json`;

    const exportPayload = {
      meta: {
        app: 'ArduiBlok Studio',
        version: '2.0.0',
        exportedAt: now.toISOString(),
        exportedBy: req.adminUser.username,
        totalUsers: (rawData.users || []).length
      },
      database: rawData
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(JSON.stringify(exportPayload, null, 2));
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Gagal membuat file backup: ' + err.message });
  }
});

// ── 5. Pulihkan Data ke Server (Restore Data) ────────────────
router.post('/restore', (req, res) => {
  try {
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, error: 'Data backup tidak boleh kosong.' });
    }

    // Mendukung baik format full export { database: { users, otps } } maupun format raw { users, otps }
    const targetData = payload.database || payload.data || payload;

    if (!targetData || !Array.isArray(targetData.users)) {
      return res.status(400).json({
        success: false,
        error: 'Format data backup tidak sesuai. File harus memiliki struktur array "users".'
      });
    }

    const restoreResult = db.restoreDatabase(targetData);

    return res.json({
      success: true,
      message: `Data server berhasil dipulihkan! Total ${restoreResult.totalUsers} pengguna dipulihkan.`,
      stats: db.getDbStats()
    });
  } catch (err) {
    console.error('[Admin Restore Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memulihkan database: ' + err.message });
  }
});

// ── 6. Daftar Seluruh Branch Git Remote & Lokal ─────────────
router.get('/update/branches', (req, res) => {
  try {
    const gitDir = path.join(__dirname, '..');

    // 1. Ambil branch aktif saat ini
    let currentBranch = 'main';
    try {
      currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: gitDir, encoding: 'utf8' }).trim();
    } catch (e) {}

    // 2. Fetch remote branches untuk sinkronisasi daftar terbaru
    try {
      execSync('git fetch --all --prune', { cwd: gitDir, timeout: 15000, stdio: 'pipe' });
    } catch (fErr) {}

    // 3. Ambil seluruh branch remote dari origin
    const branchSet = new Set();
    if (currentBranch) branchSet.add(currentBranch);

    try {
      const rawRemote = execSync('git branch -r --format="%(refname:short)"', { cwd: gitDir, encoding: 'utf8' });
      rawRemote
        .split('\n')
        .map(b => b.trim())
        .filter(b => b && !b.includes('HEAD'))
        .forEach(b => {
          const cleanName = b.replace(/^origin\//, '').trim();
          if (cleanName) branchSet.add(cleanName);
        });
    } catch (rErr) {}

    // Urutkan branch: prioritas branch saat ini dan 'main' di posisi paling atas
    const branches = Array.from(branchSet).sort((a, b) => {
      if (a === currentBranch) return -1;
      if (b === currentBranch) return 1;
      if (a === 'main') return -1;
      if (b === 'main') return 1;
      return a.localeCompare(b);
    });

    return res.json({
      success: true,
      currentBranch,
      branches
    });

  } catch (err) {
    console.error('[Admin Update Branches Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal mengambil daftar branch: ' + err.message });
  }
});


// ── 7. Cek Status Pembaruan Git OTA (Dukung Target Branch Dinamis) ──
router.get('/update/status', (req, res) => {
  try {
    const gitDir = path.join(__dirname, '..');

    // 1. Ambil branch aktif saat ini
    let currentBranch = 'main';
    try {
      currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: gitDir, encoding: 'utf8' }).trim();
    } catch (bErr) {
      console.warn('[Admin Update] Gagal membaca branch:', bErr.message);
    }

    // Branch yang ingin diinspeksi (default: branch aktif)
    const targetBranch = (req.query.branch && typeof req.query.branch === 'string' && req.query.branch.trim())
      ? req.query.branch.trim()
      : currentBranch;

    const isSameBranch = targetBranch === currentBranch;

    // 2. Ambil info commit lokal saat ini (HEAD)
    let localHash = '-';
    let localFullHash = '-';
    let localMessage = '-';
    let localDate = '-';
    try {
      localHash = execSync('git rev-parse --short HEAD', { cwd: gitDir, encoding: 'utf8' }).trim();
      localFullHash = execSync('git rev-parse HEAD', { cwd: gitDir, encoding: 'utf8' }).trim();
      localMessage = execSync('git log -1 --pretty=%s', { cwd: gitDir, encoding: 'utf8' }).trim();
      localDate = execSync('git log -1 --pretty=%cd --date=relative', { cwd: gitDir, encoding: 'utf8' }).trim();
    } catch (lErr) {
      console.warn('[Admin Update] Gagal membaca commit lokal:', lErr.message);
    }

    // 3. Cek apakah working tree bersih
    let isClean = true;
    try {
      const porcelain = execSync('git status --porcelain', { cwd: gitDir, encoding: 'utf8' }).trim();
      isClean = porcelain.length === 0;
    } catch (cErr) {}

    // 4. Lakukan fetch dari origin untuk target branch (timeout 15 detik)
    let fetchError = null;
    let remoteHash = localHash;
    let remoteMessage = localMessage;
    let commitsBehind = 0;
    let commitsAhead = 0;
    let hasUpdate = false;

    try {
      execSync(`git fetch origin ${targetBranch}`, { cwd: gitDir, timeout: 15000, stdio: 'pipe' });

      const remoteRef = `origin/${targetBranch}`;
      remoteHash = execSync(`git rev-parse --short ${remoteRef}`, { cwd: gitDir, encoding: 'utf8' }).trim();
      remoteMessage = execSync(`git log -1 --pretty=%s ${remoteRef}`, { cwd: gitDir, encoding: 'utf8' }).trim();

      if (isSameBranch) {
        const behindStr = execSync(`git rev-list --count HEAD..${remoteRef}`, { cwd: gitDir, encoding: 'utf8' }).trim();
        commitsBehind = parseInt(behindStr, 10) || 0;

        const aheadStr = execSync(`git rev-list --count ${remoteRef}..HEAD`, { cwd: gitDir, encoding: 'utf8' }).trim();
        commitsAhead = parseInt(aheadStr, 10) || 0;

        hasUpdate = commitsBehind > 0;
      } else {
        // Target branch berbeda dari branch aktif lokal
        hasUpdate = true; // Perlu switch branch
        try {
          const behindStr = execSync(`git rev-list --count HEAD..${remoteRef}`, { cwd: gitDir, encoding: 'utf8' }).trim();
          commitsBehind = parseInt(behindStr, 10) || 0;
        } catch (e) {}
      }

    } catch (fErr) {
      fetchError = 'Gagal menghubungi GitHub repository (offline atau branch remote tidak ditemukan).';
    }

    return res.json({
      success: true,
      update: {
        currentBranch,
        targetBranch,
        isSameBranch,
        localHash,
        localFullHash,
        localMessage,
        localDate,
        remoteHash,
        remoteMessage,
        commitsBehind,
        commitsAhead,
        hasUpdate,
        isClean,
        fetchError
      }
    });

  } catch (err) {
    console.error('[Admin Update Status Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memeriksa status pembaruan: ' + err.message });
  }
});

// ── 8. Terapkan Pembaruan Git Pull OTA / Beralih Branch & Muat Ulang ────
router.post('/update/apply', (req, res) => {
  try {
    const gitDir = path.join(__dirname, '..');
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: gitDir, encoding: 'utf8' }).trim();

    const { targetBranch } = req.body || {};
    const branch = (targetBranch && typeof targetBranch === 'string' && targetBranch.trim())
      ? targetBranch.trim()
      : currentBranch;

    let checkoutOutput = '';

    // Jika admin memilih branch yang berbeda dari branch aktif
    if (branch !== currentBranch) {
      console.log(`[OTA Updater] Beralih dari branch "${currentBranch}" ke "${branch}"...`);

      // Cek apakah branch sudah ada di lokal
      const localBranches = execSync('git branch --format="%(refname:short)"', { cwd: gitDir, encoding: 'utf8' })
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      if (localBranches.includes(branch)) {
        checkoutOutput = execSync(`git checkout ${branch}`, { cwd: gitDir, encoding: 'utf8', timeout: 30000 });
      } else {
        checkoutOutput = execSync(`git checkout -b ${branch} origin/${branch}`, { cwd: gitDir, encoding: 'utf8', timeout: 30000 });
      }
    }

    console.log(`[OTA Updater] Menarik pembaruan dari branch "${branch}"...`);

    // 1. Eksekusi git pull
    const pullOutput = execSync(`git pull origin ${branch}`, { cwd: gitDir, encoding: 'utf8', timeout: 60000 });
    console.log('[OTA Updater] Git pull output:\n', pullOutput);

    // 2. Baca commit baru setelah pull / checkout
    const newHash = execSync('git rev-parse --short HEAD', { cwd: gitDir, encoding: 'utf8' }).trim();
    const newMessage = execSync('git log -1 --pretty=%s', { cwd: gitDir, encoding: 'utf8' }).trim();
    const activeBranchAfter = execSync('git rev-parse --abbrev-ref HEAD', { cwd: gitDir, encoding: 'utf8' }).trim();

    // 3. Pasang dependency jika package.json terbarui
    let npmOutput = 'Dependencies up-to-date';
    try {
      npmOutput = execSync('npm install --omit=dev', { cwd: gitDir, encoding: 'utf8', timeout: 120000 });
    } catch (npmErr) {
      npmOutput = npmErr.message;
    }

    // 4. Balas ke browser admin terlebih dahulu sebelum server mati/reboot
    res.json({
      success: true,
      message: `Pembaruan berhasil diterapkan pada branch "${activeBranchAfter}" (${newHash})! Server sedang memuat ulang sistem...`,
      branch: activeBranchAfter,
      newHash,
      newMessage,
      checkoutLog: checkoutOutput,
      pullLog: pullOutput,
      npmLog: npmOutput
    });

    // 5. Jadwalkan restart otomatis proses Node.js
    setTimeout(() => {
      console.log('[OTA Updater] Memuat ulang proses server ArduiBlok sekarang...');
      try {
        const child = spawn(process.argv[0], process.argv.slice(1), {
          detached: true,
          stdio: 'inherit',
          cwd: gitDir
        });
        child.unref();
      } catch (spawnErr) {
        console.warn('[OTA Updater] Gagal auto-spawn child:', spawnErr.message);
      }
      process.exit(0);
    }, 1200);

  } catch (err) {
    console.error('[OTA Apply Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal menerapkan pembaruan: ' + err.message });
  }
});

module.exports = {
  router,
  isSuperAdmin
};
