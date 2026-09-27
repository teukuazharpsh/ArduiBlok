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
(function (window) {
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
    'comment_group_block': 'comment komentar grup kelompok catatan section wrap blok keterangan /* */',
    'esp8266_wifi_connect': 'wifi esp8266 nodemcu wemos connect sambung konek ssid password internet hotspot router',
    'esp8266_wifi_ap': 'wifi access point ap hotspot buat pemancar jaringan ssid password esp8266',
    'esp8266_wifi_is_connected': 'wifi connected terhubung status cek apakah koneksi internet online',
    'esp8266_wifi_local_ip': 'wifi ip local ip address alamat jaringan statis dhcp router',
    'esp8266_wifi_ap_ip': 'wifi ap ip access point hotspot gateway alamat',
    'esp8266_wifi_rssi': 'wifi signal kekuatan sinyal kuat rssi dbm indikator jaringan',
    'esp8266_wifi_disconnect': 'wifi disconnect putus koneksi keluar reset jaringan',
    'esp8266_pin': 'pin nodemcu d0 d1 d2 d3 d4 d5 d6 d7 d8 a0 gpio esp8266 wemos',
    'esp8266_http_get': 'http get web api request url server internet kirim ambil data rest client',
    'esp8266_deep_sleep': 'deep sleep tidur hemat daya baterai power save esp8266 bangun wake',
    'esp8266_restart': 'restart reset reboot ulang reboot esp8266 mcu'
  };

  let blockCatalog = [];
  let isSearchActive = false;
  let originalFlyoutAutoClose = false;
  let searchInputEl = null;
  let clearBtnEl = null;
  let searchWrapperEl = null;

  /**
   * Bangun katalog blok dari DOM <xml id="toolbox"> dengan filter board aktif
   */
  function buildBlockCatalog() {
    const toolboxEl = document.getElementById('toolbox');
    if (!toolboxEl || typeof toolboxEl.getElementsByTagName !== 'function') return;

    const currentBoard = (window.currentBoardConfig && window.currentBoardConfig.boardType) || 'uno';

    blockCatalog = [];
    const categories = toolboxEl.getElementsByTagName('category');

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const reqBoard = cat.getAttribute('data-board');
      if (reqBoard) {
        const allowed = reqBoard.toLowerCase().split(',').map(function(s) { return s.trim(); });
        if (!allowed.includes(currentBoard.toLowerCase())) {
          continue; // Lewati kategori yang tidak didukung board aktif
        }
      }

      const catName = cat.getAttribute('name') || '';
      const blocks = cat.children;

      for (let j = 0; j < blocks.length; j++) {
        const blkNode = blocks[j];
        if (blkNode.tagName.toLowerCase() !== 'block') continue;

        const blkReqBoard = blkNode.getAttribute('data-board');
        if (blkReqBoard) {
          const allowedBlk = blkReqBoard.toLowerCase().split(',').map(function(s) { return s.trim(); });
          if (!allowedBlk.includes(currentBoard.toLowerCase())) {
            continue; // Lewati blok yang tidak didukung board aktif
          }
        }

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
        <input type="text" class="toolbox-search-input" id="toolboxSearchInput" placeholder="Cari..." autocomplete="off" spellcheck="false" title="Cari blok">
        <button type="button" class="toolbox-search-clear" id="btnToolboxSearchClear" title="Bersihkan" style="display: none;">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;

    // Letakkan sebagai elemen pertama sebelum kategori "Setup & Loop"
    toolboxDiv.insertBefore(searchWrapperEl, toolboxDiv.firstChild);

    // Aktifkan patch flyout (padding rapi & auto-close saat drag)
    if (ws.getFlyout()) {
      patchFlyoutShowOnce(ws.getFlyout());
    }

    searchInputEl = document.getElementById('toolboxSearchInput');
    clearBtnEl = document.getElementById('btnToolboxSearchClear');

    // Hentikan perambatan event mousedown / pointerdown agar Blockly tidak salah mendeteksi gesture
    searchWrapperEl.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    searchWrapperEl.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    searchWrapperEl.addEventListener('click', function (e) { e.stopPropagation(); });
    searchWrapperEl.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });

    // Event input pencarian real-time
    searchInputEl.addEventListener('input', function () {
      handleSearch(this.value);
    });

    searchInputEl.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Escape') {
        clearSearch();
        this.blur();
      }
    });

    // Tombol bersihkan (X)
    clearBtnEl.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearSearch();
      searchInputEl.focus();
    });

    // Deteksi jika pengguna mengklik kategori manual pada toolbox -> bersihkan pencarian
    toolboxDiv.addEventListener('click', function (e) {
      const row = e.target.closest('.blocklyTreeRow');
      if (row) {
        if (searchInputEl && searchInputEl.value.trim().length > 0) {
          clearSearch();
        }
      }
    });

    // Listener event workspace: tutup flyout pencarian jika pengguna mulai men-drag blok di workspace
    ws.addChangeListener(function (e) {
      if (isSearchActive && e) {
        const isDragStart = (e.type === (Blockly.Events.BLOCK_DRAG || 'drag')) && e.isStart;
        const isClickWorkspace = (e.type === (Blockly.Events.CLICK || 'click')) && !e.blockId;
        if (isDragStart || isClickWorkspace) {
          clearSearch();
        }
      }
    });
  }

  /**
   * Terapkan margin kiri dan atas yang lapang serta rapi pada blok-blok di flyout,
   * sehingga wujud fisik blok tidak pernah terpotong atau menempel ke garis tepi kiri panel.
   */
  function adjustFlyoutBlocksLayout(flyout) {
    if (!flyout) return;
    try {
      const topBlocks = flyout.getWorkspace().getTopBlocks(false);
      if (topBlocks.length === 0) return;

      topBlocks.forEach(b => {
        const xy = b.getRelativeToSurfaceXY();
        // Berikan jarak ekstra +18px ke kanan agar lekukan/soket di sebelah kiri terlihat utuh dan lega
        b.moveTo(new Blockly.utils.Coordinate(xy.x + 14, xy.y + 4));
      });

      if (typeof flyout.reflow === 'function') {
        flyout.reflow();
      }
      if (typeof flyout.position === 'function') {
        flyout.position();
      }
    } catch (e) {
      console.warn('[ToolboxSearch] adjustFlyoutBlocksLayout error:', e);
    }
  }

  /**
   * Patch resmi flyout agar:
   * 1. Semua tampilan blok di flyout mendapatkan padding kiri yang rapi.
   * 2. Ketika blok dari hasil pencarian mulai di-drag/drop, flyout otomatis ditutup seketika
   *    sehingga workspace bersih dan penempatan blok tidak terhalang.
   */
  function patchFlyoutShowOnce(flyout) {
    if (!flyout || flyout._patchedForSearchIndent) return;
    flyout._patchedForSearchIndent = true;

    const originalShow = flyout.show;
    flyout.show = function (flyoutDef) {
      originalShow.call(this, flyoutDef);
      adjustFlyoutBlocksLayout(this);
    };

    const originalCreateBlock = flyout.createBlock_;
    if (typeof originalCreateBlock === 'function') {
      flyout.createBlock_ = function (block) {
        const newBlock = originalCreateBlock.call(this, block);
        if (isSearchActive) {
          // Tutup flyout seketika saat drag dimulai agar tidak menghalangi workspace
          clearSearch();
        }
        return newBlock;
      };
    }
  }

  /**
   * Eksekusi filter pencarian dan render langsung ke Flyout Blockly samping kanan
   */
  function handleSearch(query) {
    const ws = getWorkspace();
    if (!ws) return;
    const flyout = ws.getFlyout();
    if (!flyout) return;

    // Pastikan flyout sudah terpasang pengatur indentasi & auto-close saat drag
    patchFlyoutShowOnce(flyout);

    query = (query || '').trim().toLowerCase();

    if (query.length === 0) {
      clearSearch();
      return;
    }

    if (clearBtnEl) clearBtnEl.style.display = 'flex';

    if (!isSearchActive) {
      originalFlyoutAutoClose = !!flyout.autoClose;
    }
    isSearchActive = true;
    flyout.autoClose = true;

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
      // Terapkan penyesuaian posisi presisi
      adjustFlyoutBlocksLayout(flyout);
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
      ws.getFlyout().autoClose = originalFlyoutAutoClose;
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
      const checkInterval = setInterval(function () {
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
