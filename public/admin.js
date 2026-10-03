/**
 * ArduiBlok — Superadmin Server Panel Controller (public/admin.js)
 * Manages server statistics, database backup downloads, and restore operations.
 */

(function(root) {
  'use strict';

  let modalAdminServer, btnCloseAdminModal, btnCancelAdminModal, btnMaximizeAdminModal;
  let btnOpenAdminPanel, btnDownloadBackup, btnRestoreBackup, fileRestoreInput;
  let adminAlertBanner, adminUserSearchInput, adminUsersTableBody;
  let statTotalUsers, statOnlineUsers, statVerifiedUsers, statUnverifiedUsers, statDbSize, statUptime;
  let adminRefreshInterval = null;

  let cachedUsers = [];

  function init() {
    modalAdminServer = document.getElementById('modalAdminServer');
    btnCloseAdminModal = document.getElementById('btnCloseAdminModal');
    btnCancelAdminModal = document.getElementById('btnCancelAdminModal');
    btnMaximizeAdminModal = document.getElementById('btnMaximizeAdminModal');
    btnOpenAdminPanel = document.getElementById('btnOpenAdminPanel');
    btnDownloadBackup = document.getElementById('btnDownloadBackup');
    btnRestoreBackup = document.getElementById('btnRestoreBackup');
    fileRestoreInput = document.getElementById('fileRestoreInput');
    adminAlertBanner = document.getElementById('adminAlertBanner');
    adminUserSearchInput = document.getElementById('adminUserSearchInput');
    adminUsersTableBody = document.getElementById('adminUsersTableBody');

    statTotalUsers = document.getElementById('statTotalUsers');
    statOnlineUsers = document.getElementById('statOnlineUsers');
    statVerifiedUsers = document.getElementById('statVerifiedUsers');
    statUnverifiedUsers = document.getElementById('statUnverifiedUsers');
    statDbSize = document.getElementById('statDbSize');
    statUptime = document.getElementById('statUptime');

    // Event: Maximize / Restore Layar Panel
    if (btnMaximizeAdminModal) {
      btnMaximizeAdminModal.addEventListener('click', toggleMaximizeAdminModal);
    }
    restoreMaximizeState();

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

  function toggleMaximizeAdminModal() {
    if (!modalAdminServer) return;
    const container = modalAdminServer.querySelector('.admin-modal-container');
    if (!container) return;
    const isMax = container.classList.toggle('is-maximized');
    updateMaximizeIcons(isMax);
    try {
      localStorage.setItem('arduiblok_admin_maximized', isMax ? 'true' : 'false');
    } catch (e) {}
  }

  function updateMaximizeIcons(isMax) {
    if (!btnMaximizeAdminModal) return;
    const iconMax = btnMaximizeAdminModal.querySelector('.admin-icon-maximize');
    const iconRes = btnMaximizeAdminModal.querySelector('.admin-icon-restore');
    if (iconMax && iconRes) {
      if (isMax) {
        iconMax.classList.add('hidden');
        iconRes.classList.remove('hidden');
        btnMaximizeAdminModal.title = 'Kecilkan Tampilan Panel';
      } else {
        iconMax.classList.remove('hidden');
        iconRes.classList.add('hidden');
        btnMaximizeAdminModal.title = 'Perbesar Layar Penuh (Maximize)';
      }
    }
  }

  function restoreMaximizeState() {
    try {
      const saved = localStorage.getItem('arduiblok_admin_maximized') === 'true';
      if (!modalAdminServer) return;
      const container = modalAdminServer.querySelector('.admin-modal-container');
      if (container) {
        if (saved) {
          container.classList.add('is-maximized');
        } else {
          container.classList.remove('is-maximized');
        }
        updateMaximizeIcons(saved);
      }
    } catch (e) {}
  }

  function formatRelativeTime(isoString) {
    if (!isoString) return 'Belum pernah';
    const timeMs = new Date(isoString).getTime();
    if (isNaN(timeMs)) return '-';
    const diffSec = Math.floor((Date.now() - timeMs) / 1000);
    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    if (diffSec < 172800) return 'Kemarin';
    return new Date(isoString).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  async function openAdminModal() {
    if (!modalAdminServer) return;
    hideAlert();
    restoreMaximizeState();
    modalAdminServer.classList.remove('hidden');
    await loadServerStats();
    await loadUsersList();

    // Auto-refresh data setiap 20 detik selama modal admin terbuka
    if (adminRefreshInterval) clearInterval(adminRefreshInterval);
    adminRefreshInterval = setInterval(async () => {
      if (modalAdminServer && !modalAdminServer.classList.contains('hidden')) {
        await loadServerStats();
        await loadUsersList(true);
      }
    }, 20000);
  }

  function closeAdminModal() {
    if (adminRefreshInterval) {
      clearInterval(adminRefreshInterval);
      adminRefreshInterval = null;
    }
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
      if (statOnlineUsers) statOnlineUsers.textContent = s.onlineUsers || 0;
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
  async function loadUsersList(isSilent = false) {
    if (!adminUsersTableBody) return;
    if (!isSilent) {
      adminUsersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 24px;">Memuat data pengguna...</td></tr>';
    }

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
      if (!isSilent) {
        adminUsersTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 24px;">${err.message}</td></tr>`;
      }
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
      adminUsersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 24px;">Tidak ada pengguna yang cocok.</td></tr>';
      return;
    }

    const currentUserId = root.ArduiBlokAuth && root.ArduiBlokAuth.getUser() ? root.ArduiBlokAuth.getUser().id : null;

    adminUsersTableBody.innerHTML = filtered.map((u, i) => {
      const isSelf = u.id === currentUserId;
      const onlineBadge = u.isOnline
        ? '<span class="badge-online"><span class="online-indicator-dot pulsing"></span> Online</span>'
        : '<span class="badge-offline"><span class="offline-dot"></span> Offline</span>';

      const statusBadge = u.isVerified
        ? '<span class="badge-verified">✅ Terverifikasi</span>'
        : '<span class="badge-unverified">⏳ Belum OTP</span>';

      const lastActiveFormatted = u.isOnline
        ? '<span style="color: #34d399; font-weight: 600; font-size: 11px;">Sedang aktif</span>'
        : (u.lastActiveAt ? `<span style="color: #94a3b8; font-size: 11px;">${formatRelativeTime(u.lastActiveAt)}</span>` : '<span style="color: #64748b; font-size: 11px;">Belum aktif</span>');

      const actionBtn = isSelf
        ? '<span style="color: #64748b; font-size: 11px; font-weight: 600; font-style: italic;">(Akun Anda)</span>'
        : `<button class="btn-del-user" data-id="${u.id}" data-name="${u.username || u.email}">Hapus</button>`;

      return `
        <tr>
          <td style="text-align: center; color: #64748b; font-weight: 600;">${i + 1}</td>
          <td><span style="font-weight: 600; color: #ffffff;">${escapeHtml(u.username || '-')}</span></td>
          <td><span style="font-family: 'JetBrains Mono', Consolas, monospace; font-size: 12px; color: #93c5fd;">${escapeHtml(u.email || '-')}</span></td>
          <td style="text-align: center;">${onlineBadge}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td>${lastActiveFormatted}</td>
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
