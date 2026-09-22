// ============================================================
// library_manager.js — Arduino External Library Manager for ArduiBlok
// ============================================================

(function(window) {
  'use strict';

  var installedCache = new Set(['Servo', 'Wire', 'SPI', 'SoftwareSerial', 'EEPROM', 'HID']);
  var currentSearchQuery = '';
  var currentCategory = 'all';

  var ArduiBlokLibraries = {
    /**
     * Inisialisasi event listener dan state Library Manager
     */
    init: function() {
      this.bindEvents();
      this.fetchInstalledLibraries();
    },

    /**
     * Ambil daftar library yang sudah terpasang dari server
     */
    fetchInstalledLibraries: async function() {
      try {
        var res = await fetch('/api/libraries/installed');
        var data = await res.json();
        if (data && data.success && Array.isArray(data.installed)) {
          installedCache = new Set(data.installed);
        }
      } catch (e) {
        console.warn('[LibraryManager] Gagal memuat daftar library terpasang:', e.message);
      }
    },

    /**
     * Cari library dari server / registry
     */
    searchLibraries: async function(query) {
      try {
        var url = '/api/libraries/search?q=' + encodeURIComponent(query || '');
        var res = await fetch(url);
        var data = await res.json();
        if (data && data.success && Array.isArray(data.libraries)) {
          return data.libraries;
        }
        return [];
      } catch (e) {
        console.error('[LibraryManager] Error pencarian library:', e);
        return [];
      }
    },

    /**
     * Install library via server backend
     */
    installLibrary: async function(libName, btnElement) {
      if (!libName) return;

      var originalText = '';
      if (btnElement) {
        originalText = btnElement.innerHTML;
        btnElement.disabled = true;
        btnElement.innerHTML = '<div class="btn-spinner-inline"></div> Memasang...';
      }

      try {
        var res = await fetch('/api/libraries/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: libName })
        });

        var data = await res.json();
        if (data && data.success) {
          installedCache.add(libName);
          installedCache.add(libName.replace(/_/g, ' '));
          alert('Berhasil! Library "' + libName + '" siap digunakan.');
          this.renderList();
        } else {
          alert('Gagal memasang library: ' + (data.error || 'Terjadi kesalahan'));
        }
      } catch (e) {
        alert('Gagal menghubungi server untuk install library: ' + e.message);
      } finally {
        if (btnElement) {
          btnElement.disabled = false;
          btnElement.innerHTML = originalText;
        }
      }
    },

    /**
     * Render daftar library ke dalam modal #libraryModal
     */
    renderList: async function() {
      var grid = document.getElementById('librariesGrid');
      var emptyState = document.getElementById('librariesEmptyState');
      var countInfo = document.getElementById('librariesCountInfo');
      if (!grid) return;

      grid.innerHTML = '<div class="library-loading"><div class="loading-spinner"></div><span>Mencari library...</span></div>';
      if (emptyState) emptyState.classList.add('hidden');

      var libraries = await this.searchLibraries(currentSearchQuery);

      // Filter kategori
      if (currentCategory !== 'all') {
        libraries = libraries.filter(function(lib) {
          return (lib.category || '').toLowerCase() === currentCategory.toLowerCase();
        });
      }

      if (libraries.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        if (countInfo) countInfo.textContent = 'Tidak ada library ditemukan';
        return;
      }

      if (emptyState) emptyState.classList.add('hidden');
      if (countInfo) countInfo.textContent = 'Menampilkan ' + libraries.length + ' library';

      var html = '';
      var self = this;

      libraries.forEach(function(lib) {
        var isInstalled = lib.installed || installedCache.has(lib.name) || installedCache.has(lib.name.replace(/_/g, ' '));
        
        var statusBadge = isInstalled 
          ? '<span class="lib-badge-installed">✓ Terpasang</span>'
          : '<span class="lib-badge-available">Tersedia</span>';

        var actionButtons = '';
        if (isInstalled) {
          actionButtons = 
            '<button class="btn btn-include-lib" data-header="' + self.escapeAttr(lib.exampleInclude || ('#include <' + lib.header + '>')) + '" title="Sisipkan #include ke kode">' +
              '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
              'Sertakan (#include)' +
            '</button>';
        } else {
          actionButtons = 
            '<button class="btn btn-install-lib" data-name="' + self.escapeAttr(lib.name) + '" title="Download dan pasang library ke compiler">' +
              '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' +
              'Pasang (Install)' +
            '</button>';
        }

        html += 
          '<div class="library-card ' + (isInstalled ? 'card-installed' : '') + '">' +
            '<div class="library-card-header">' +
              '<div>' +
                '<h3 class="library-title">' + self.escapeHtml(lib.name) + '</h3>' +
                '<div class="library-author">Oleh: <b>' + self.escapeHtml(lib.author || 'Arduino Community') + '</b> &bull; v' + self.escapeHtml(lib.version || '1.0.0') + '</div>' +
              '</div>' +
              statusBadge +
            '</div>' +
            '<p class="library-desc">' + self.escapeHtml(lib.sentence || 'Library Arduino.') + '</p>' +
            '<div class="library-card-footer">' +
              '<span class="library-category-tag">' + self.escapeHtml(lib.category || 'General') + '</span>' +
              '<div class="library-actions">' + actionButtons + '</div>' +
            '</div>' +
          '</div>';
      });

      grid.innerHTML = html;

      // Event listener tombol install
      grid.querySelectorAll('.btn-install-lib').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var name = this.getAttribute('data-name');
          self.installLibrary(name, this);
        });
      });

      // Event listener tombol include
      grid.querySelectorAll('.btn-include-lib').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var header = this.getAttribute('data-header');
          if (window.ArduiBlokEditor) {
            var added = window.ArduiBlokEditor.insertInclude(header);
            if (added) {
              alert('Header library telah disisipkan ke baris atas editor!');
            } else {
              alert('Header library ini sudah ada di dalam kode editor.');
            }
            self.closeModal();
          }
        });
      });
    },

    bindEvents: function() {
      var self = this;
      var modal = document.getElementById('libraryModal');
      var btnClose = document.getElementById('btnCloseLibraryModal');
      var btnCancel = document.getElementById('btnCancelLibraryModal');
      var searchInput = document.getElementById('librarySearchInput');
      var clearSearch = document.getElementById('btnClearLibrarySearch');
      var categoryChips = document.getElementById('libraryCategoryChips');

      if (btnClose) btnClose.addEventListener('click', function() { self.closeModal(); });
      if (btnCancel) btnCancel.addEventListener('click', function() { self.closeModal(); });

      if (modal) {
        modal.addEventListener('click', function(e) {
          if (e.target === modal) self.closeModal();
        });
      }

      if (searchInput) {
        searchInput.addEventListener('input', function() {
          currentSearchQuery = this.value;
          if (clearSearch) clearSearch.classList.toggle('hidden', !this.value);
          self.renderList();
        });
      }

      if (clearSearch) {
        clearSearch.addEventListener('click', function() {
          if (searchInput) {
            searchInput.value = '';
            currentSearchQuery = '';
            this.classList.add('hidden');
            searchInput.focus();
            self.renderList();
          }
        });
      }

      if (categoryChips) {
        categoryChips.querySelectorAll('.category-chip').forEach(function(chip) {
          chip.addEventListener('click', function() {
            categoryChips.querySelectorAll('.category-chip').forEach(function(c) {
              c.classList.remove('active');
            });
            this.classList.add('active');
            currentCategory = this.getAttribute('data-category') || 'all';
            self.renderList();
          });
        });
      }
    },

    openModal: function() {
      var modal = document.getElementById('libraryModal');
      if (modal) {
        modal.classList.remove('hidden');
        this.renderList();
        var searchInput = document.getElementById('librarySearchInput');
        if (searchInput) setTimeout(function() { searchInput.focus(); }, 100);
      }
    },

    closeModal: function() {
      var modal = document.getElementById('libraryModal');
      if (modal) {
        modal.classList.add('hidden');
      }
    },

    escapeHtml: function(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    escapeAttr: function(str) {
      if (!str) return '';
      return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  };

  window.ArduiBlokLibraries = ArduiBlokLibraries;

})(window);
