/**
 * ArduiBlok — Database Manager (server/db.js)
 * Lightweight, robust, persistent file-based JSON database with atomic writes.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Memory cache
let dbData = {
  users: [],
  otps: []
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load or initialize DB file
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      dbData.users = Array.isArray(parsed.users) ? parsed.users : [];
      dbData.otps = Array.isArray(parsed.otps) ? parsed.otps : [];
    } else {
      saveDatabaseSync();
    }
  } catch (err) {
    console.error('[DB] Gagal memuat db.json, menginisialisasi ulang:', err.message);
    dbData = { users: [], otps: [] };
    saveDatabaseSync();
  }
}

// Atomic file save (write to tmp then rename)
function saveDatabaseSync() {
  try {
    const tmpFile = DB_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(dbData, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('[DB] Gagal menyimpan data ke db.json:', err.message);
  }
}

// Inisialisasi awal
loadDatabase();

// ── User Operations ──────────────────────────────────────────

function getUserById(id) {
  return dbData.users.find(u => u.id === id) || null;
}

function getUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return dbData.users.find(u => u.email.toLowerCase() === normalized) || null;
}

function getUserByUsername(username) {
  if (!username) return null;
  const normalized = username.trim().toLowerCase();
  return dbData.users.find(u => u.username.toLowerCase() === normalized) || null;
}

function getUserByIdentifier(identifier) {
  if (!identifier) return null;
  const normalized = identifier.trim().toLowerCase();
  return dbData.users.find(u => 
    u.email.toLowerCase() === normalized || 
    u.username.toLowerCase() === normalized
  ) || null;
}

function createUser({ username, email, passwordHash, isVerified = false }) {
  const newUser = {
    id: uuidv4(),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: passwordHash,
    isVerified: !!isVerified,
    createdAt: new Date().toISOString(),
    verifiedAt: isVerified ? new Date().toISOString() : null
  };
  dbData.users.push(newUser);
  saveDatabaseSync();
  return newUser;
}

function verifyUser(userId) {
  const user = dbData.users.find(u => u.id === userId);
  if (user) {
    user.isVerified = true;
    user.verifiedAt = new Date().toISOString();
    saveDatabaseSync();
    return user;
  }
  return null;
}

function updateUserPassword(userId, newPasswordHash) {
  const user = dbData.users.find(u => u.id === userId);
  if (user) {
    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date().toISOString();
    saveDatabaseSync();
    return true;
  }
  return false;
}

// ── OTP Operations ───────────────────────────────────────────

function saveOtp({ email, otpCode, expiresAtMs }) {
  const normalizedEmail = email.trim().toLowerCase();
  // Hapus OTP lama untuk email ini
  dbData.otps = dbData.otps.filter(o => o.email !== normalizedEmail);

  const otpEntry = {
    id: uuidv4(),
    email: normalizedEmail,
    code: String(otpCode).trim(),
    createdAt: Date.now(),
    expiresAt: Date.now() + (expiresAtMs || 10 * 60 * 1000), // Default 10 menit
    attempts: 0
  };

  dbData.otps.push(otpEntry);
  saveDatabaseSync();
  return otpEntry;
}

function getLatestOtp(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  // Ambil yang paling baru
  const matches = dbData.otps.filter(o => o.email === normalized);
  if (matches.length === 0) return null;
  return matches[matches.length - 1];
}

function incrementOtpAttempts(email) {
  const otp = getLatestOtp(email);
  if (otp) {
    otp.attempts = (otp.attempts || 0) + 1;
    saveDatabaseSync();
    return otp.attempts;
  }
  return 0;
}

function deleteOtpsForEmail(email) {
  if (!email) return;
  const normalized = email.trim().toLowerCase();
  dbData.otps = dbData.otps.filter(o => o.email !== normalized);
  saveDatabaseSync();
}

function cleanupExpiredOtps() {
  const now = Date.now();
  const initialCount = dbData.otps.length;
  dbData.otps = dbData.otps.filter(o => o.expiresAt > now);
  if (dbData.otps.length !== initialCount) {
    saveDatabaseSync();
  }
}

// Bersihkan OTP kedaluwarsa setiap 15 menit (unref agar tidak mengunci proses exit)
const cleanupInterval = setInterval(cleanupExpiredOtps, 15 * 60 * 1000);
if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

// ── Admin & Backup Operations ──────────────────────────────────

function getAllUsers() {
  return (dbData.users || []).map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    isVerified: !!u.isVerified,
    createdAt: u.createdAt
  }));
}

function deleteUser(id) {
  if (!id) return false;
  const initialCount = dbData.users.length;
  dbData.users = dbData.users.filter(u => u.id !== id);
  if (dbData.users.length !== initialCount) {
    saveDatabaseSync();
    return true;
  }
  return false;
}

function getRawDatabaseData() {
  return JSON.parse(JSON.stringify(dbData));
}

function restoreDatabase(incomingData) {
  if (!incomingData || typeof incomingData !== 'object') {
    throw new Error('Format data backup tidak valid (harus objek JSON).');
  }
  if (!Array.isArray(incomingData.users)) {
    throw new Error('Format data backup tidak memiliki array "users" yang valid.');
  }

  dbData = {
    users: incomingData.users,
    otps: Array.isArray(incomingData.otps) ? incomingData.otps : []
  };

  saveDatabaseSync();
  return {
    totalUsers: dbData.users.length,
    totalOtps: dbData.otps.length
  };
}

function getDbStats() {
  let fileSize = 0;
  let lastModified = null;
  try {
    if (fs.existsSync(DB_FILE)) {
      const stats = fs.statSync(DB_FILE);
      fileSize = stats.size;
      lastModified = stats.mtime;
    }
  } catch (e) {}

  const total = dbData.users.length;
  const verified = dbData.users.filter(u => u.isVerified).length;
  const unverified = total - verified;

  return {
    totalUsers: total,
    verifiedUsers: verified,
    unverifiedUsers: unverified,
    dbSizeBytes: fileSize,
    lastModified: lastModified
  };
}

module.exports = {
  getUserById,
  getUserByEmail,
  getUserByUsername,
  getUserByIdentifier,
  createUser,
  verifyUser,
  updateUserPassword,
  saveOtp,
  getLatestOtp,
  incrementOtpAttempts,
  deleteOtpsForEmail,
  cleanupExpiredOtps,
  getAllUsers,
  deleteUser,
  getRawDatabaseData,
  restoreDatabase,
  getDbStats
};
