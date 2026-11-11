/**
 * ArduiBlok — User Cloud Projects API Router (server/projects.js)
 * Manages saving, loading, listing, and deleting Blockly cloud sketches per user account.
 */

const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

// Seluruh rute project wajib terautentikasi (JWT)
router.use(requireAuth);

// ── 1. Ambil Seluruh Daftar Proyek Milik Pengguna ──────────────
router.get('/', (req, res) => {
  try {
    const projects = db.getUserProjects(req.user.id);
    return res.json({
      success: true,
      total: projects.length,
      projects: projects
    });
  } catch (err) {
    console.error('[Projects List Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal mengambil daftar proyek: ' + err.message });
  }
});

// ── 2. Simpan / Perbarui Proyek ke Cloud ───────────────────────
router.post('/', (req, res) => {
  try {
    const { id, name, board, xml, cppCode } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nama proyek wajib diisi.' });
    }

    if (!xml || typeof xml !== 'string') {
      return res.status(400).json({ success: false, error: 'Konten XML program Blockly tidak boleh kosong.' });
    }

    const saved = db.saveProject(req.user.id, {
      id: id || null,
      name: name.trim(),
      board: board || 'arduino_uno',
      xml: xml,
      cppCode: cppCode || ''
    });

    return res.json({
      success: true,
      message: `Proyek "${saved.name}" berhasil disimpan di Cloud!`,
      project: saved
    });
  } catch (err) {
    console.error('[Projects Save Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal menyimpan proyek ke cloud: ' + err.message });
  }
});

// ── 3. Ambil Detail Proyek (Termasuk XML Blok) ─────────────────
router.get('/:id', (req, res) => {
  try {
    const projectId = req.params.id;
    const project = db.getProjectById(req.user.id, projectId);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Proyek tidak ditemukan atau Anda tidak memiliki akses.' });
    }

    return res.json({
      success: true,
      project: project
    });
  } catch (err) {
    console.error('[Projects Detail Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memuat proyek: ' + err.message });
  }
});

// ── 4. Hapus Proyek ───────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const projectId = req.params.id;
    const deleted = db.deleteProject(req.user.id, projectId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Proyek tidak ditemukan atau gagal dihapus.' });
    }

    return res.json({
      success: true,
      message: 'Proyek berhasil dihapus dari Cloud.'
    });
  } catch (err) {
    console.error('[Projects Delete Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal menghapus proyek: ' + err.message });
  }
});

module.exports = {
  router
};
