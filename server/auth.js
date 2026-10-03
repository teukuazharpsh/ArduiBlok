/**
 * ArduiBlok — Authentication Router & Middleware (server/auth.js)
 * Handles registration, OTP email verification, login with email/username, and session validation.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const mailer = require('./mailer');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'arduiblok_jwt_secret_key_2026';
const JWT_EXPIRY = '7d';

// Regex Validasi
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;

// ── Auth Middleware ──────────────────────────────────────────

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Akses ditolak: Token autentikasi tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Sesi tidak valid: Pengguna tidak ditemukan.' });
    }
    req.user = { id: user.id, username: user.username, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Sesi kedaluwarsa atau token tidak valid. Silakan login kembali.' });
  }
}

// ── 1. Registrasi Akun Baru (Sign Up) ────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validasi input
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Semua kolom (Username, Email, Password) wajib diisi.' });
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (!USERNAME_REGEX.test(cleanUsername)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username hanya boleh terdiri dari 3–24 karakter alfanumerik dan garis bawah (_).' 
      });
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Format alamat email tidak valid.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal terdiri dari 6 karakter.' });
    }

    // Periksa apakah username sudah dipakai
    const existingUsername = db.getUserByUsername(cleanUsername);
    if (existingUsername) {
      // Jika username sudah dipakai oleh akun terverifikasi ATAU email berbeda
      if (existingUsername.isVerified || existingUsername.email !== cleanEmail) {
        return res.status(400).json({ success: false, error: 'Username sudah digunakan oleh akun lain. Silakan pilih username lain.' });
      }
    }

    // Periksa apakah email sudah terdaftar
    const existingEmail = db.getUserByEmail(cleanEmail);
    if (existingEmail && existingEmail.isVerified) {
      return res.status(400).json({ success: false, error: 'Alamat email sudah terdaftar. Silakan langsung masuk (Login).' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    let user;
    if (existingEmail && !existingEmail.isVerified) {
      // Perbarui akun yang belum diverifikasi
      existingEmail.username = cleanUsername;
      existingEmail.passwordHash = passwordHash;
      user = existingEmail;
    } else {
      // Buat akun baru dengan status belum terverifikasi
      user = db.createUser({
        username: cleanUsername,
        email: cleanEmail,
        passwordHash: passwordHash,
        isVerified: false
      });
    }

    // Buat kode OTP 6 digit
    const otpCode = mailer.generateOtpCode();
    db.saveOtp({
      email: cleanEmail,
      otpCode: otpCode,
      expiresAtMs: 10 * 60 * 1000 // 10 menit
    });

    // Kirim email OTP
    const mailResult = await mailer.sendOtpEmail(cleanEmail, cleanUsername, otpCode);

    return res.json({
      success: true,
      message: mailResult.mock
        ? `[Mode Lokal / SMTP Belum Diset] Kode verifikasi Anda adalah: ${otpCode}`
        : 'Kode OTP verifikasi telah dikirim ke email Anda. Silakan periksa inbox atau folder spam.',
      email: cleanEmail,
      isMock: mailResult.mock,
      mockOtp: mailResult.mock ? otpCode : undefined
    });

  } catch (err) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan server saat pendaftaran: ' + err.message });
  }
});

// ── 2. Verifikasi Kode OTP (Verify OTP) ──────────────────────

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email dan Kode OTP wajib diisi.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const user = db.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Akun dengan email tersebut tidak ditemukan.' });
    }

    const savedOtp = db.getLatestOtp(cleanEmail);
    if (!savedOtp) {
      return res.status(400).json({ success: false, error: 'Kode OTP tidak ditemukan atau telah kedaluwarsa. Silakan minta kirim ulang OTP.' });
    }

    // Periksa masa berlaku
    if (Date.now() > savedOtp.expiresAt) {
      return res.status(400).json({ success: false, error: 'Kode OTP telah kedaluwarsa. Silakan klik "Kirim Ulang Kode".' });
    }

    // Periksa batas percobaan (maksimal 5 kali salah)
    if (savedOtp.attempts >= 5) {
      return res.status(429).json({ success: false, error: 'Terlalu banyak percobaan salah. Silakan minta kode OTP baru.' });
    }

    // Cek kecocokan kode
    if (savedOtp.code !== cleanOtp) {
      db.incrementOtpAttempts(cleanEmail);
      const remaining = 5 - (savedOtp.attempts + 1);
      return res.status(400).json({ 
        success: false, 
        error: `Kode OTP yang Anda masukkan salah. Sisa kesempatan: ${Math.max(0, remaining)} kali.` 
      });
    }

    // OTP Benar -> Verifikasi akun
    db.verifyUser(user.id);
    db.deleteOtpsForEmail(cleanEmail);

    // Buat token sesi JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.json({
      success: true,
      message: 'Email berhasil diverifikasi! Selamat datang di ArduiBlok Studio.',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('[Auth Verify OTP Error]:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan server saat verifikasi: ' + err.message });
  }
});

// ── 3. Kirim Ulang Kode OTP (Resend OTP) ─────────────────────

router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Alamat email wajib diisi.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Akun dengan email tersebut tidak ditemukan.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, error: 'Akun ini sudah terverifikasi. Silakan langsung login.' });
    }

    // Rate-limiting kirim ulang (minimal selang 45 detik)
    const lastOtp = db.getLatestOtp(cleanEmail);
    if (lastOtp && (Date.now() - lastOtp.createdAt < 45 * 1000)) {
      const waitSeconds = Math.ceil((45 * 1000 - (Date.now() - lastOtp.createdAt)) / 1000);
      return res.status(429).json({ 
        success: false, 
        error: `Mohon tunggu ${waitSeconds} detik sebelum meminta kode OTP baru.` 
      });
    }

    const newOtp = mailer.generateOtpCode();
    db.saveOtp({
      email: cleanEmail,
      otpCode: newOtp,
      expiresAtMs: 10 * 60 * 1000
    });

    const mailResult = await mailer.sendOtpEmail(cleanEmail, user.username, newOtp);

    return res.json({
      success: true,
      message: mailResult.mock
        ? `[Mode Lokal / SMTP Belum Diset] Kode verifikasi baru Anda: ${newOtp}`
        : 'Kode OTP baru berhasil dikirimkan ke email Anda.',
      isMock: mailResult.mock,
      mockOtp: mailResult.mock ? newOtp : undefined
    });

  } catch (err) {
    console.error('[Auth Resend OTP Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal mengirim ulang OTP: ' + err.message });
  }
});

// ── 4. Masuk Akun (Login dengan Email ATAU Username) ─────────

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Username/Email dan Password wajib diisi.' });
    }

    const cleanIdentifier = String(identifier).trim();
    const user = db.getUserByIdentifier(cleanIdentifier);

    if (!user) {
      return res.status(400).json({ success: false, error: 'Username atau Password salah.' });
    }

    // Cek password
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      return res.status(400).json({ success: false, error: 'Username atau Password salah.' });
    }

    // Periksa status verifikasi email
    if (!user.isVerified) {
      // Buat dan kirim OTP baru secara otomatis
      const newOtp = mailer.generateOtpCode();
      db.saveOtp({
        email: user.email,
        otpCode: newOtp,
        expiresAtMs: 10 * 60 * 1000
      });
      const mailRes = await mailer.sendOtpEmail(user.email, user.username, newOtp);

      return res.status(403).json({
        success: false,
        requireVerification: true,
        email: user.email,
        username: user.username,
        mockOtp: mailRes.mock ? newOtp : undefined,
        error: mailRes.mock
          ? `Akun belum terverifikasi. [Mode Lokal] Kode OTP Anda: ${newOtp}`
          : 'Akun Anda belum diverifikasi. Kode OTP baru telah dikirimkan ke email Anda.'
      });
    }

    // Buat JWT Token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.json({
      success: true,
      message: 'Login berhasil! Selamat datang kembali, ' + user.username + '.',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan server saat login: ' + err.message });
  }
});

// ── 5. Cek Sesi Pengguna Aktif (Get Current User Profile) ─────

router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

module.exports = {
  router,
  requireAuth
};
