/**
 * ArduiBlok — Superadmin Server Panel Controller (public/admin.js)
 * Manages server statistics, database backup downloads, and restore operations.
 */

(function(root) {
  'use strict';

  let modalAdminServer, btnCloseAdminModal, btnCancelAdminModal;
  let btnOpenAdminPanel, btnDownloadBackup, btnRestoreBackup, fileRestoreInput;
  let adminAlertBanner, adminUserSearchInput, adminUsersTableBody;
  let statTotalUsers, statVerifiedUsers, statUnverifiedUsers, statDbSize, statUptime;

  let cachedUsers = [];

  function init() {
    modalAdminServer = document.getElementById('modalAdminServer');
    btnCloseAdminModal = document.getElementById('btnCloseAdminModal');
    btnCancelAdminModal = document.getElementById('btnCancelAdminModal');
    btnOpenAdminPanel = document.getElementById('btnOpenAdminPanel');
    btnDownloadBackup = document.getElementById('btnDownloadBackup');
    btnRestoreBackup = document.getElementById('btnRestoreBackup');
    fileRestoreInput = document.getElementById('fileRestoreInput');
    adminAlertBanner = document.getElementById('adminAlertBanner');
    adminUserSearchInput = document.getElementById('adminUserSearchInput');
    adminUsersTableBody = document.getElementById('adminUsersTableBody');

    statTotalUsers = document.getElementById('statTotalUsers');
    statVerifiedUsers = document.getElementById('statVerifiedUsers');
    statUnverifiedUsers = document.getElementById('statUnverifiedUsers');
    statDbSize = document.getElementById('statDbSize');
    statUptime = document.getElementById('statUptime');

    // Event: Buka Modal Admin dari Dropdown
    if (btnOpenAdminPanel) {
      btnOpenAdminPanel.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const userMenu = document.getElementById('userDropdownMenu');
        if (userMenu) userMenu.classList.add('hidden');
        openAdminModal();
      });
    }

    // Event: Tutup Modal Admin
    if (btnCloseAdminModal) btnCloseAdminModal.addEventListener('click', closeAdminModal);
    if (btnCancelAdminModal) btnCancelAdminModal.addEventListener('click', closeAdminModal);

    // Tutup saat klik di luar kontainer modal
    if (modalAdminServer) {
      modalAdminServer.addEventListener('click', function(e) {
        if (e.target === modalAdminServer) {
          closeAdminModal();
        }
      });
    }

    // Event: Unduh Backup
    if (btnDownloadBackup) {
      btnDownloadBackup.addEventListener('click', handleDownloadBackup);
    }

    // Event: Pulihkan Data (Restore)
    if (btnRestoreBackup) {
      btnRestoreBackup.addEventListener('click', handleRestoreBackup);
    }

    // Event: Filter Pencarian Pengguna
    if (adminUserSearchInput) {
      adminUserSearchInput.addEventListener('input', function() {
        renderUsersTable(adminUserSearchInput.value);
      });
    }
  }

  function getAuthHeader() {
    const token = root.ArduiBlokAuth && root.ArduiBlokAuth.getToken ? root.ArduiBlokAuth.getToken() : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  function showAlert(msg, type = 'success') {
    if (!adminAlertBanner) return;
    adminAlertBanner.className = `admin-alert ${type}`;
    adminAlertBanner.textContent = msg;
    adminAlertBanner.classList.remove('hidden');

    setTimeout(() => {
      if (adminAlertBanner) adminAlertBanner.classList.add('hidden');
    }, 5000);
  }

  function hideAlert() {
    if (adminAlertBanner) adminAlertBanner.classList.add('hidden');
  }

  async function openAdminModal() {
    if (!modalAdminServer) return;
    hideAlert();
    modalAdminServer.classList.remove('hidden');
    await loadServerStats();
    await loadUsersList();
  }

  function closeAdminModal() {
    if (modalAdminServer) {
      modalAdminServer.classList.add('hidden');
    }
  }

  // ── 1. Ambil Statistik Server ────────────────────────────────
  async function loadServerStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: getAuthHeader()
      });
      if (!res.ok) {
        throw new Error('Gagal memuat statistik server (Status ' + res.status + ')');
      }
      const data = await res.json();
      if (!data.success || !data.stats) return;

      const s = data.stats;
      if (statTotalUsers) statTotalUsers.textContent = s.totalUsers || 0;
      if (statVerifiedUsers) statVerifiedUsers.textContent = s.verifiedUsers || 0;
      if (statUnverifiedUsers) statUnverifiedUsers.textContent = s.unverifiedUsers || 0;
      
      const sizeKb = Math.round((s.dbSizeBytes || 0) / 1024 * 10) / 10;
      if (statDbSize) statDbSize.textContent = `${sizeKb} KB`;

      if (statUptime && s.uptimeSeconds !== undefined) {
        const h = Math.floor(s.uptimeSeconds / 3600);
        const m = Math.floor((s.uptimeSeconds % 3600) / 60);
        statUptime.textContent = `Uptime: ${h} jam ${m} mnt`;
      }
    } catch (err) {
      console.warn('[Admin] Load stats failed:', err.message);
    }
  }

  // ── 2. Ambil Daftar Pengguna ─────────────────────────────────
  async function loadUsersList() {
    if (!adminUsersTableBody) return;
    adminUsersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 24px;">Memuat data pengguna...</td></tr>';

    try {
      const res = await fetch('/api/admin/users', {
        headers: getAuthHeader()
      });
      if (!res.ok) {
        throw new Error('Gagal memuat daftar pengguna.');
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        cachedUsers = data.users;
        renderUsersTable(adminUserSearchInput ? adminUserSearchInput.value : '');
      }
    } catch (err) {
      adminUsersTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 24px;">${err.message}</td></tr>`;
    }
  }

  function renderUsersTable(query = '') {
    if (!adminUsersTableBody) return;
    const cleanQ = query.trim().toLowerCase();
    const filtered = cachedUsers.filter(u => {
      if (!cleanQ) return true;
      return (u.username && u.username.toLowerCase().includes(cleanQ)) ||
             (u.email && u.email.toLowerCase().includes(cleanQ));
    });

    if (filtered.length === 0) {
      adminUsersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 24px;">Tidak ada pengguna yang cocok.</td></tr>';
      return;
    }

    const currentUserId = root.ArduiBlokAuth && root.ArduiBlokAuth.getUser() ? root.ArduiBlokAuth.getUser().id : null;

    adminUsersTableBody.innerHTML = filtered.map((u, i) => {
      const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '-';

      const isSelf = u.id === currentUserId;
      const statusBadge = u.isVerified
        ? '<span class="badge-verified">✅ Terverifikasi</span>'
        : '<span class="badge-unverified">⏳ Belum OTP</span>';

      const actionBtn = isSelf
        ? '<span style="color: var(--text-muted); font-size: 11px;">(Akun Anda)</span>'
        : `<button class="btn-del-user" data-id="${u.id}" data-name="${u.username || u.email}">Hapus</button>`;

      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${escapeHtml(u.username || '-')}</strong></td>
          <td>${escapeHtml(u.email || '-')}</td>
          <td>${statusBadge}</td>
          <td style="color: var(--text-secondary); font-size: 11px;">${dateStr}</td>
          <td style="text-align: center;">${actionBtn}</td>
        </tr>
      `;
    }).join('');

    // Pasang listener hapus pengguna
    const delButtons = adminUsersTableBody.querySelectorAll('.btn-del-user');
    delButtons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        const id = this.getAttribute('data-id');
        const name = this.getAttribute('data-name');
        handleDeleteUser(id, name);
      });
    });
  }

  async function handleDeleteUser(userId, name) {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus pengguna.');
      }
      showAlert(`Pengguna "${name}" berhasil dihapus.`, 'success');
      await loadServerStats();
      await loadUsersList();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  }

  // ── 3. Unduh Cadangan Data (Backup) ──────────────────────────
  async function handleDownloadBackup() {
    hideAlert();
    try {
      const res = await fetch('/api/admin/backup', {
        headers: getAuthHeader()
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengunduh file backup server.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const nowStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `arduiblok_db_backup_${nowStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showAlert('Cadangan data berhasil diunduh ke komputer Anda!', 'success');
    } catch (err) {
      showAlert('Gagal backup data: ' + err.message, 'error');
    }
  }

  // ── 4. Pulihkan Data ke Server (Restore) ─────────────────────
  async function handleRestoreBackup() {
    hideAlert();
    if (!fileRestoreInput || !fileRestoreInput.files || fileRestoreInput.files.length === 0) {
      showAlert('Mohon pilih file cadangan (.json) terlebih dahulu sebelum memulihkan.', 'error');
      return;
    }

    const file = fileRestoreInput.files[0];
    if (!file.name.toLowerCase().endsWith('.json')) {
      showAlert('Format file tidak valid. Harap pilih file berekstensi .json.', 'error');
      return;
    }

    const confirmed = confirm(
      '⚠️ PERINGATAN PEMULIHAN DATA:\n\n' +
      'Memulihkan data akan MENIMPA seluruh akun dan database saat ini di server Railway dengan data dari file backup yang dipilih.\n\n' +
      'Apakah Anda benar-benar yakin ingin melanjutkan pemulihan?'
    );

    if (!confirmed) return;

    btnRestoreBackup.disabled = true;
    btnRestoreBackup.textContent = 'Memulihkan...';

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        let parsed;
        try {
          parsed = JSON.parse(e.target.result);
        } catch (jsonErr) {
          throw new Error('File tidak dapat dibaca sebagai format JSON yang valid.');
        }

        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(parsed)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Gagal memulihkan database.');
        }

        showAlert(data.message || 'Data server berhasil dipulihkan!', 'success');
        fileRestoreInput.value = '';
        await loadServerStats();
        await loadUsersList();
      } catch (err) {
        showAlert('Pemulihan gagal: ' + err.message, 'error');
      } finally {
        btnRestoreBackup.disabled = false;
        btnRestoreBackup.textContent = 'Mulai Pulihkan Data';
      }
    };

    reader.onerror = function() {
      showAlert('Gagal membaca file dari komputer.', 'error');
      btnRestoreBackup.disabled = false;
      btnRestoreBackup.textContent = 'Mulai Pulihkan Data';
    };

    reader.readAsText(file);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Inisialisasi
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  root.ArduiBlokAdmin = {
    openAdminModal,
    closeAdminModal
  };

})(typeof window !== 'undefined' ? window : this);
