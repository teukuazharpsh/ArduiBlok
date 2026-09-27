/**
 * ArduiBlok — Native Toolbox Block Search
 * 
 * Menempatkan kotak pencarian langsung di atas kategori pertama "Setup & Loop"
 * pada toolbox Blockly. Ketika pengguna mengetik kata kunci (misal: "motor"),
 * blok-blok yang cocok langsung ditampilkan pada Flyout samping kanan bawaan Blockly.
 * 
 * - 100% Native Flyout Blockly (Drag & drop asli, snap otomatis, suara, undo/redo).
 * - Tanpa modal, tanpa popup, tanpa teks penjelasan tambahan.
 * - Desain presisi selaras tema terang & gelap.
 */
(function(window) {
  'use strict';

  // ── Database Metadata Kata Kunci Blok ──
  const BLOCK_KEYWORDS = {
    'arduino_setup': 'setup awal start inisialisasi booting boot run once void pertama',
    'arduino_loop': 'loop perulangan putar ulang terus repeat forever void berulang',
    'motor_dc': 'motor dc l298n l298 dinamo maju mundur speed pwm rotasi in1 in2 ena arah kecepatan gerak driver',
    'servo_write': 'servo motor sudut derajat angle sg90 mg995 mg996 rotasi pin lengan robot',
    'motor_driver_shield': 'motor driver shield l293d afmotor adafruit robot roda dinamo m1 m2 m3 m4',
    'digital_write': 'digital write tulis output pin led lampu hidup mati nyala relay high low bakar',
    'digital_read': 'digital read baca input tombol button switch saklar sensor pir limit touch sentuh',
    'pin_digital': 'pin digital nomor port kaki d13 d2 a0',
    'digital_level': 'high low level boolean 1 0 tegangan hidup mati logika',
    'analog_read': 'analog read baca adc a0 a1 a2 a3 a4 a5 potensiometer ldr ntc sensor cahaya suhu',
    'analog_write': 'analog write tulis pwm duty cycle redup terang kecerahan kecepatan 255 getar dac',
    'pin_mode': 'pinmode mode input output pullup konfigurasi arah kaki',
    'controls_if': 'if else jika kalau kondisi condition branching percabangan apakah maka',
    'controls_switch': 'switch case pilihan opsi cabang kondisi kondisi bertingkat',
    'controls_break': 'break continue hentikan lompat stop selesai keluar loop putus',
    'controls_repeat_arduino': 'repeat ulangi count hitung kali for loop iterasi perulangan',
    'controls_while_arduino': 'while loop selama ulangi do until kondisi perulangan berulang',
    'delay_ms': 'delay tunggu jeda waktu sleep ms milidetik pause stop wait berhenti sebentar',
    'compare_op': 'compare banding sama lebih kecil besar != == <= >= relasi kesamaan beda',
    'logic_boolean': 'boolean true false benar salah logika ya tidak',
    'logic_not': 'not bukan negasi kebalikan logika lawan ingkar !',
    'logic_operation': 'and or dan atau logika gabung operator && || hubungan',
    'math_number': 'number angka nilai digit hitung desimal int float 0 1 2 3 bilangan',
    'math_op': 'math tambah kurang kali bagi + - * / modulo modulus aritmatika hitungan',
    'map_value': 'map pemetaan skala rentang konversi adc pwm range petakan ubah skala',
    'serial_begin': 'serial begin monitor komunikasi baud baudrate 9600 115200 usb port komunikasi',
    'serial_available_do': 'serial available masuk terima buffer rx event do jika ada serial',
    'serial_available': 'serial available cek byte ready data masuk serial',
    'serial_read': 'serial read baca char karakter byte masukan input rx',
    'serial_read_string': 'serial readstring baca kalimat teks string pesan baca teks serial',
    'serial_parse_int': 'serial parseint parse int angka bilangan bilangan bulat serial',
    'serial_print': 'serial print println kirim cetak monitor terminal enter newline cetak baris baru',
    'serial_print_inline': 'serial print cetak kirim satu baris inline sambung tanpa enter',
    'text_string': 'text string teks kalimat kata huruf petik petik dua tulisan',
    'char_character': 'char character karakter huruf simbol ascii tanda',
    'text_join': 'text join gabung susun rangkai kalimat tambah string rangkai kata gabungkan',
    'variables_declare_arduino': 'variable variabel declare deklarasi int float string tipe buat baru simpan',
    'variables_set_arduino': 'variable variabel set atur simpan isi ubah nilai tetapkan',
    'variables_set_simple': 'variable variabel set ubah nilai singkat',
    'variables_get_arduino': 'variable variabel get ambil baca nilai value panggil variabel',
    'comment_block': 'comment komentar catatan note penjelasan garis keterangan //',
    'comment_group_block': 'comment komentar grup kelompok catatan section wrap blok keterangan /* */'
  };

  let blockCatalog = [];
  let isSearchActive = false;
  let searchInputEl = null;
  let clearBtnEl = null;
  let searchWrapperEl = null;

  /**
   * Bangun katalog blok dari DOM <xml id="toolbox">
   */
  function buildBlockCatalog() {
    const toolboxEl = document.getElementById('toolbox');
    if (!toolboxEl) return;

    blockCatalog = [];
    const categories = toolboxEl.getElementsByTagName('category');

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const catName = cat.getAttribute('name') || '';
      const blocks = cat.children;

      for (let j = 0; j < blocks.length; j++) {
        const blkNode = blocks[j];
        if (blkNode.tagName.toLowerCase() !== 'block') continue;

        const type = blkNode.getAttribute('type') || '';
        const keywords = (BLOCK_KEYWORDS[type] || '') + ' ' + type.replace(/_/g, ' ') + ' ' + catName.toLowerCase();

        blockCatalog.push({
          type: type,
          category: catName,
          keywords: keywords.toLowerCase(),
          node: blkNode
        });
      }
    }
  }

  /**
   * Injeksi search bar ke puncak .blocklyToolboxDiv (di atas "Setup & Loop")
   */
  function getWorkspace() {
    return window.workspace || (window.Blockly && typeof Blockly.getMainWorkspace === 'function' && Blockly.getMainWorkspace());
  }

  function injectSearchBar() {
    const ws = getWorkspace();
    if (!ws) return;
    const toolbox = (getWorkspace() && getWorkspace().getToolbox());
    if (!toolbox) return;

    const toolboxDiv = (toolbox.getDiv && toolbox.getDiv()) || toolbox.HtmlDiv || document.querySelector('.blocklyToolboxDiv');
    if (!toolboxDiv) return;

    // Cegah duplikasi jika sudah pernah diinjeksi
    if (document.getElementById('toolboxSearchWrapper')) return;

    searchWrapperEl = document.createElement('div');
    searchWrapperEl.id = 'toolboxSearchWrapper';
    searchWrapperEl.className = 'toolbox-search-wrapper';
    searchWrapperEl.innerHTML = `
      <div class="toolbox-search-inner">
        <svg class="toolbox-search-icon" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="toolbox-search-input" id="toolboxSearchInput" placeholder="Cari blok..." autocomplete="off" spellcheck="false">
        <button type="button" class="toolbox-search-clear" id="btnToolboxSearchClear" title="Bersihkan" style="display: none;">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;

    // Letakkan sebagai elemen pertama sebelum kategori "Setup & Loop"
    toolboxDiv.insertBefore(searchWrapperEl, toolboxDiv.firstChild);

    searchInputEl = document.getElementById('toolboxSearchInput');
    clearBtnEl = document.getElementById('btnToolboxSearchClear');

    // Hentikan perambatan event mousedown / pointerdown agar Blockly tidak salah mendeteksi gesture
    searchWrapperEl.addEventListener('mousedown', function(e) { e.stopPropagation(); });
    searchWrapperEl.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
    searchWrapperEl.addEventListener('click', function(e) { e.stopPropagation(); });
    searchWrapperEl.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: true });

    // Event input pencarian real-time
    searchInputEl.addEventListener('input', function() {
      handleSearch(this.value);
    });

    searchInputEl.addEventListener('keydown', function(e) {
      e.stopPropagation();
      if (e.key === 'Escape') {
        clearSearch();
        this.blur();
      }
    });

    // Tombol bersihkan (X)
    clearBtnEl.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      clearSearch();
      searchInputEl.focus();
    });

    // Deteksi jika pengguna mengklik kategori manual pada toolbox -> bersihkan teks search
    toolboxDiv.addEventListener('click', function(e) {
      const row = e.target.closest('.blocklyTreeRow');
      if (row) {
        if (searchInputEl && searchInputEl.value.trim().length > 0) {
          searchInputEl.value = '';
          if (clearBtnEl) clearBtnEl.style.display = 'none';
          isSearchActive = false;
        }
      }
    });
  }

  /**
   * Eksekusi filter pencarian dan render langsung ke Flyout Blockly samping kanan
   */
  function handleSearch(query) {
    const ws = getWorkspace();
    if (!ws) return;
    const flyout = ws.getFlyout();
    if (!flyout) return;

    query = (query || '').trim().toLowerCase();

    if (query.length === 0) {
      if (clearBtnEl) clearBtnEl.style.display = 'none';
      if (isSearchActive) {
        flyout.hide();
        isSearchActive = false;
      }
      return;
    }

    if (clearBtnEl) clearBtnEl.style.display = 'flex';
    isSearchActive = true;

    // Bersihkan highlight seleksi kategori tree agar jelas sedang mode cari
    const toolbox = ws.getToolbox();
    if (toolbox && typeof toolbox.clearSelection === 'function') {
      toolbox.clearSelection();
    }

    const tokens = query.split(/\s+/).filter(t => t.length > 0);

    const matchedItems = blockCatalog.filter(item => {
      const text = item.keywords;
      return tokens.every(token => text.indexOf(token) !== -1);
    });

    if (matchedItems.length > 0) {
      // Clone block XML nodes agar dapat di-render oleh flyout Blockly
      const nodesToShow = matchedItems.map(item => item.node.cloneNode(true));
      flyout.show(nodesToShow);
    } else {
      // Jika tidak ada yang cocok, tampilkan label bersih di flyout
      try {
        const labelNode = Blockly.utils.xml.createElement('label');
        labelNode.setAttribute('text', 'Blok tidak ditemukan');
        flyout.show([labelNode]);
      } catch (err) {
        flyout.hide();
      }
    }
  }

  /**
   * Bersihkan status pencarian dan tutup flyout
   */
  function clearSearch() {
    if (searchInputEl) {
      searchInputEl.value = '';
    }
    if (clearBtnEl) {
      clearBtnEl.style.display = 'none';
    }
    const ws = getWorkspace();
    if (ws && ws.getFlyout()) {
      ws.getFlyout().hide();
    }
    isSearchActive = false;
  }

  /**
   * Inisialisasi sistem pencarian toolbox
   */
  function init() {
    buildBlockCatalog();

    // Tunggu hingga workspace siap jika belum diinjeksi
    const ws = getWorkspace();
    if (ws && ws.getToolbox()) {
      injectSearchBar();
    } else {
      const checkInterval = setInterval(function() {
        const currentWs = getWorkspace();
        if (currentWs && currentWs.getToolbox()) {
          clearInterval(checkInterval);
          injectSearchBar();
        }
      }, 80);
    }
  }

  // Ekspor API ke global
  window.ArduiBlokToolboxSearch = {
    init: init,
    rebuild: buildBlockCatalog,
    clear: clearSearch
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
