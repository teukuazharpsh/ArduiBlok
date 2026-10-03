/**
 * ArduiBlok — Superadmin Router & Management API (server/admin.js)
 * Secured with SHA-256 cryptographic email fingerprinting and JWT verification.
 */

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_arduiblok_jwt_key_2026';

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

module.exports = {
  router,
  isSuperAdmin
};
