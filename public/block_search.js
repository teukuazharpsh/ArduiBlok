/**
 * ArduiBlok — Compact Spotlight Block Search & Insert System
 * 
 * DESAIN BARU:
 * - Tampilan KOMPAK list-style (bukan kartu besar) — setiap item hanya 1 baris
 * - SVG mini blok asli Blockly di setiap baris hasil pencarian 
 * - Klik / Tap = blok langsung muncul di tengah workspace (reliable, tanpa bug gesture)
 * - Keyboard: ↑↓ navigasi, Enter masukkan, Esc tutup
 * - Ctrl+K shortcut untuk buka/tutup
 */
(function(window) {
  'use strict';

  // ── Database Metadata Blok ──
  const BLOCK_METADATA = {
    'arduino_setup': {
      title: 'Setup',
      keywords: 'setup awal start inisialisasi booting boot run once void',
      category: 'Setup & Loop',
      color: 180
    },
    'arduino_loop': {
      title: 'Loop',
      keywords: 'loop perulangan putar ulang terus repeat forever void',
      category: 'Setup & Loop',
      color: 195
    },
    'motor_dc': {
      title: 'Motor DC (L298N)',
      keywords: 'motor dc l298n l298 dinamo maju mundur speed pwm rotasi in1 in2 ena',
      category: 'Motors',
      color: 20
    },
    'servo_write': {
      title: 'Servo Motor',
      keywords: 'servo motor sudut derajat angle sg90 mg995 mg996 rotasi pin',
      category: 'Motors',
      color: 20
    },
    'motor_driver_shield': {
      title: 'Motor Driver Shield',
      keywords: 'motor driver shield l293d afmotor adafruit robot roda',
      category: 'Motors',
      color: 20
    },
    'digital_write': {
      title: 'Digital Write',
      keywords: 'digital write tulis output pin led lampu hidup mati nyala relay high low',
      category: 'Input / Output',
      color: 60
    },
    'digital_read': {
      title: 'Digital Read',
      keywords: 'digital read baca input tombol button switch saklar sensor pir limit touch',
      category: 'Input / Output',
      color: 60
    },
    'pin_digital': {
      title: 'Pin Digital',
      keywords: 'pin digital nomor port kaki d13 d2 a0',
      category: 'Input / Output',
      color: 60
    },
    'digital_level': {
      title: 'Level Logika',
      keywords: 'high low level boolean 1 0 tegangan',
      category: 'Input / Output',
      color: 60
    },
    'analog_read': {
      title: 'Analog Read',
      keywords: 'analog read baca adc a0 a1 a2 a3 a4 a5 potensiometer ldr ntc sensor',
      category: 'Input / Output',
      color: 60
    },
    'analog_write': {
      title: 'Analog Write (PWM)',
      keywords: 'analog write tulis pwm duty cycle redup terang kecerahan kecepatan 255',
      category: 'Input / Output',
      color: 60
    },
    'pin_mode': {
      title: 'Pin Mode',
      keywords: 'pinmode mode input output pullup konfigurasi arah',
      category: 'Input / Output',
      color: 60
    },
    'controls_if': {
      title: 'Jika (if / else)',
      keywords: 'if else jika kalau kondisi condition branching percabangan',
      category: 'Control',
      color: 120
    },
    'controls_switch': {
      title: 'Switch Case',
      keywords: 'switch case pilihan opsi cabang kondisi',
      category: 'Control',
      color: 120
    },
    'controls_break': {
      title: 'Break',
      keywords: 'break continue hentikan lompat stop selesai keluar loop',
      category: 'Control',
      color: 120
    },
    'controls_repeat_arduino': {
      title: 'Ulangi N Kali (for)',
      keywords: 'repeat ulangi count hitung kali for loop iterasi',
      category: 'Control',
      color: 120
    },
    'controls_while_arduino': {
      title: 'While Loop',
      keywords: 'while loop selama ulangi do until kondisi perulangan',
      category: 'Control',
      color: 120
    },
    'delay_ms': {
      title: 'Tunggu / Delay',
      keywords: 'delay tunggu jeda waktu sleep ms milidetik pause stop wait',
      category: 'Control',
      color: 120
    },
    'compare_op': {
      title: 'Perbandingan Relasi',
      keywords: 'compare banding sama lebih kecil besar != == <= >= relasi',
      category: 'Logic',
      color: 210
    },
    'logic_boolean': {
      title: 'Boolean (True/False)',
      keywords: 'boolean true false benar salah logika',
      category: 'Logic',
      color: 210
    },
    'logic_not': {
      title: 'Bukan (NOT)',
      keywords: 'not bukan negasi kebalikan logika lawan !',
      category: 'Logic',
      color: 210
    },
    'logic_operation': {
      title: 'Operasi Logika (AND/OR)',
      keywords: 'and or dan atau logika gabung operator && ||',
      category: 'Logic',
      color: 210
    },
    'math_number': {
      title: 'Angka Numerik',
      keywords: 'number angka nilai digit hitung desimal int float 0 1 2 3',
      category: 'Math',
      color: 230
    },
    'math_op': {
      title: 'Operasi Matematika',
      keywords: 'math tambah kurang kali bagi + - * / modulo modulus aritmatika',
      category: 'Math',
      color: 230
    },
    'map_value': {
      title: 'Pemetaan Nilai (map)',
      keywords: 'map pemetaan skala rentang konversi adc pwm range',
      category: 'Math',
      color: 230
    },
    'serial_begin': {
      title: 'Serial Begin',
      keywords: 'serial begin monitor komunikasi baud baudrate 9600 115200 usb',
      category: 'Text & Serial',
      color: 160
    },
    'serial_available_do': {
      title: 'Serial Available Event',
      keywords: 'serial available masuk terima buffer rx event do',
      category: 'Text & Serial',
      color: 160
    },
    'serial_available': {
      title: 'Cek Serial Available',
      keywords: 'serial available cek byte ready',
      category: 'Text & Serial',
      color: 160
    },
    'serial_read': {
      title: 'Serial Read Byte',
      keywords: 'serial read baca char karakter byte masukan',
      category: 'Text & Serial',
      color: 160
    },
    'serial_read_string': {
      title: 'Serial Read String',
      keywords: 'serial readstring baca kalimat teks string pesan',
      category: 'Text & Serial',
      color: 160
    },
    'serial_parse_int': {
      title: 'Serial Parse Int',
      keywords: 'serial parseint parse int angka bilangan',
      category: 'Text & Serial',
      color: 160
    },
    'serial_print': {
      title: 'Serial Println',
      keywords: 'serial print println kirim cetak monitor terminal enter newline',
      category: 'Text & Serial',
      color: 160
    },
    'serial_print_inline': {
      title: 'Serial Print',
      keywords: 'serial print cetak kirim satu baris inline',
      category: 'Text & Serial',
      color: 160
    },
    'text_string': {
      title: 'Teks String',
      keywords: 'text string teks kalimat kata huruf petik',
      category: 'Text & Serial',
      color: 160
    },
    'char_character': {
      title: 'Karakter Tunggal',
      keywords: 'char character karakter huruf simbol ascii',
      category: 'Text & Serial',
      color: 160
    },
    'text_join': {
      title: 'Gabungkan Teks',
      keywords: 'text join gabung susun rangkai kalimat tambah string',
      category: 'Text & Serial',
      color: 160
    },
    'variables_declare_arduino': {
      title: 'Deklarasi Variabel',
      keywords: 'variable variabel declare deklarasi int float string tipe buat baru',
      category: 'Variables',
      color: 330
    },
    'variables_set_arduino': {
      title: 'Set Variabel',
      keywords: 'variable variabel set atur simpan isi ubah nilai',
      category: 'Variables',
      color: 330
    },
    'variables_set_simple': {
      title: 'Set Variabel Ringkas',
      keywords: 'variable variabel set ubah',
      category: 'Variables',
      color: 330
    },
    'variables_get_arduino': {
      title: 'Get Variabel',
      keywords: 'variable variabel get ambil baca nilai value',
      category: 'Variables',
      color: 330
    },
    'comment_block': {
      title: 'Catatan Komentar (//)',
      keywords: 'comment komentar catatan note penjelasan garis //',
      category: 'Comment',
      color: '#78909c'
    },
    'comment_group_block': {
      title: 'Komentar Grup (/* */)',
      keywords: 'comment komentar grup kelompok catatan section wrap',
      category: 'Comment',
      color: '#78909c'
    }
  };

  const CATEGORY_COLORS = {
    'Setup & Loop': 'hsl(180, 70%, 40%)',
    'Motors': 'hsl(20, 85%, 48%)',
    'Input / Output': 'hsl(60, 80%, 38%)',
    'Control': 'hsl(120, 60%, 38%)',
    'Logic': 'hsl(210, 75%, 45%)',
    'Math': 'hsl(230, 70%, 50%)',
    'Text & Serial': 'hsl(160, 65%, 40%)',
    'Variables': 'hsl(330, 70%, 45%)',
    'Comment': '#78909c'
  };

  // ── State ──
  let blockCatalog = [];
  let currentFilteredList = [];
  let activeIndex = -1;
  let activeCategory = 'all';
  let offscreenWorkspace = null;

  // DOM Elements Cache
  let modalEl = null;
  let inputEl = null;
  let resultsContainerEl = null;
  let categoryChipsEl = null;
  let resultCountEl = null;
  let btnClearEl = null;
  let btnCloseEl = null;
  let btnFloatingTrigger = null;

  // ── Offscreen Workspace ──
  function getOrCreateOffscreenWorkspace() {
    if (offscreenWorkspace) return offscreenWorkspace;
    if (!window.Blockly) return null;

    let offscreenDiv = document.getElementById('blocklyOffscreenDiv');
    if (!offscreenDiv) {
      offscreenDiv = document.createElement('div');
      offscreenDiv.id = 'blocklyOffscreenDiv';
      offscreenDiv.style.cssText = 'position:fixed;width:1200px;height:1200px;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;z-index:-1;';
      document.body.appendChild(offscreenDiv);
    }

    try {
      offscreenWorkspace = Blockly.inject(offscreenDiv, {
        renderer: 'geras',
        readOnly: true,
        scrollbars: false,
        comments: false,
        sounds: false
      });
    } catch (e) {
      console.warn('[BlockSearch] Offscreen workspace init failed:', e);
    }

    return offscreenWorkspace;
  }

  /**
   * Render SVG mini blok — COMPACT, PROPORSIONAL & CRISP
   * Scaled smoothly inside container using preserveAspectRatio
   */
  function renderBlockSvgMarkup(item) {
    const pWs = getOrCreateOffscreenWorkspace();
    if (!pWs) return '';

    try {
      pWs.clear();
      let block = null;

      if (item.xmlString && window.Blockly && Blockly.Xml) {
        try {
          const dom = Blockly.utils.xml.textToDom('<xml>' + item.xmlString + '</xml>');
          if (dom && dom.firstChild) {
            block = Blockly.Xml.domToBlock(dom.firstChild, pWs);
          }
        } catch (xmlErr) {}
      }

      if (!block) {
        block = pWs.newBlock(item.type);
      }

      block.initSvg();
      block.render();

      const svgRoot = block.getSvgRoot();
      const bbox = svgRoot.getBBox();

      const pad = 3;
      const x = Math.floor(bbox.x - pad);
      const y = Math.floor(bbox.y - pad);
      const w = Math.max(1, Math.ceil(bbox.width + pad * 2));
      const h = Math.max(1, Math.ceil(bbox.height + pad * 2));

      const cloned = svgRoot.cloneNode(true);
      cloned.removeAttribute('transform');

      // Style field rects (inputs/dropdowns) with clean white badge look
      const fieldRects = cloned.querySelectorAll('.blocklyFieldRect');
      fieldRects.forEach(function(rect) {
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('fill-opacity', '0.9');
        rect.setAttribute('stroke', 'rgba(0,0,0,0.18)');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('rx', '3');
        rect.setAttribute('ry', '3');
      });

      // Style text inside fields & dropdowns
      var allTexts = cloned.querySelectorAll('text');
      allTexts.forEach(function(txt) {
        if (txt.closest('.blocklyEditableText') || txt.classList.contains('blocklyDropdownText')) {
          txt.setAttribute('fill', '#0f172a');
          txt.setAttribute('font-weight', '600');
        } else {
          txt.setAttribute('fill', '#ffffff');
          txt.setAttribute('font-weight', '500');
        }
      });

      var svgMarkup =
        '<svg class="bs-block-svg" viewBox="' + x + ' ' + y + ' ' + w + ' ' + h + '" preserveAspectRatio="xMinYMid meet">' +
          cloned.outerHTML +
        '</svg>';

      return svgMarkup;
    } catch (err) {
      console.warn('[BlockSearch] SVG render failed:', item.type, err);
      return '';
    }
  }

  // ── Build Catalog ──
  function buildBlockCatalog() {
    var toolboxEl = document.getElementById('toolbox');
    if (!toolboxEl) return;

    blockCatalog = [];
    var categories = toolboxEl.getElementsByTagName('category');

    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var catName = cat.getAttribute('name') || 'Umum';
      var catColour = cat.getAttribute('colour') || '120';
      var blocks = cat.children;

      for (var j = 0; j < blocks.length; j++) {
        var blkNode = blocks[j];
        if (blkNode.tagName.toLowerCase() !== 'block') continue;

        var type = blkNode.getAttribute('type');
        if (!type) continue;

        var serializer = new XMLSerializer();
        var xmlString = serializer.serializeToString(blkNode);

        var meta = BLOCK_METADATA[type] || {};
        var title = meta.title || formatBlockTypeToTitle(type);
        var keywords = (meta.keywords || '') + ' ' + type + ' ' + catName.toLowerCase();
        var color = meta.color !== undefined ? meta.color : catColour;

        blockCatalog.push({
          type: type,
          title: title,
          keywords: keywords.toLowerCase(),
          category: catName,
          color: color,
          xmlString: xmlString,
          xmlNode: blkNode,
          svgHtml: null
        });
      }
    }
  }

  function formatBlockTypeToTitle(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
  }

  function getCssColor(colorValue) {
    if (typeof colorValue === 'number' || (!isNaN(colorValue) && typeof colorValue === 'string' && colorValue.indexOf('#') === -1)) {
      return 'hsl(' + colorValue + ', 70%, 44%)';
    }
    return colorValue || '#3b82f6';
  }

  // ── Category Chips ──
  function renderCategoryChips() {
    if (!categoryChipsEl) return;
    var cats = ['all'];
    var seen = {};

    blockCatalog.forEach(function(item) {
      if (!seen[item.category]) {
        seen[item.category] = true;
        cats.push(item.category);
      }
    });

    var html = '<button class="bs-chip' + (activeCategory === 'all' ? ' active' : '') + '" data-cat="all">Semua</button>';

    cats.forEach(function(cat) {
      if (cat === 'all') return;
      var isActive = activeCategory === cat;
      var dotColor = CATEGORY_COLORS[cat] || '#3b82f6';
      html += '<button class="bs-chip' + (isActive ? ' active' : '') + '" data-cat="' + escapeHtml(cat) + '">' +
        '<span class="bs-chip-dot" style="background:' + dotColor + ';"></span>' +
        escapeHtml(cat) +
      '</button>';
    });

    categoryChipsEl.innerHTML = html;

    var chips = categoryChipsEl.querySelectorAll('.bs-chip');
    chips.forEach(function(chip) {
      chip.addEventListener('click', function() {
        activeCategory = this.getAttribute('data-cat') || 'all';
        chips.forEach(function(c) { c.classList.remove('active'); });
        this.classList.add('active');
        filterAndRenderResults(inputEl ? inputEl.value : '');
        if (inputEl) inputEl.focus();
      });
    });
  }

  // ── Filter & Render ──
  function filterAndRenderResults(query) {
    query = (query || '').trim().toLowerCase();
    var queryTokens = query.split(/\s+/).filter(function(t) { return t.length > 0; });

    currentFilteredList = blockCatalog.filter(function(item) {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (queryTokens.length === 0) return true;
      var targetStr = (item.title + ' ' + item.keywords + ' ' + item.category).toLowerCase();
      return queryTokens.every(function(token) { return targetStr.indexOf(token) !== -1; });
    });

    activeIndex = currentFilteredList.length > 0 ? 0 : -1;
    renderResultsList();
  }

  /**
   * Render hasil pencarian sebagai LIST KOMPAK & RAPI
   * Setiap item memuat:
   * [Mini Preview SVG (rapi, scaled)] [Nama Blok + Kategori] [Ikon Tahan & Tarik]
   */
  function renderResultsList() {
    if (!resultsContainerEl) return;

    if (resultCountEl) {
      resultCountEl.textContent = currentFilteredList.length + ' blok';
    }

    if (currentFilteredList.length === 0) {
      resultsContainerEl.innerHTML =
        '<div class="bs-empty">' +
          '<svg class="bs-empty-icon" viewBox="0 0 24 24">' +
            '<circle cx="11" cy="11" r="8"></circle>' +
            '<line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
            '<line x1="8" y1="11" x2="14" y2="11"></line>' +
          '</svg>' +
          '<div class="bs-empty-title">Tidak ada blok yang cocok</div>' +
          '<div class="bs-empty-desc">Coba kata kunci: <b>servo</b>, <b>pin</b>, <b>delay</b>, <b>motor</b>, <b>if</b>, <b>serial</b></div>' +
        '</div>';
      return;
    }

    var html = '';
    currentFilteredList.forEach(function(item, idx) {
      var isSelected = idx === activeIndex;
      var chipColor = getCssColor(item.color);

      // Lazy render SVG
      if (!item.svgHtml) {
        item.svgHtml = renderBlockSvgMarkup(item);
      }

      html +=
        '<div class="bs-item' + (isSelected ? ' selected' : '') + '" data-index="' + idx + '" data-type="' + escapeHtml(item.type) + '">' +
          '<div class="bs-item-preview">' +
            (item.svgHtml || '<span class="bs-item-fallback">' + escapeHtml(item.title) + '</span>') +
          '</div>' +
          '<div class="bs-item-info">' +
            '<div class="bs-item-title">' + escapeHtml(item.title) + '</div>' +
            '<div class="bs-item-cat"><span class="bs-item-cat-dot" style="background:' + chipColor + ';"></span>' + escapeHtml(item.category) + '</div>' +
          '</div>' +
          '<div class="bs-item-drag-hint" title="Tekan &amp; Tarik langsung ke workspace">' +
            '<svg class="bs-item-drag-icon" viewBox="0 0 24 24">' +
              '<circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>' +
              '<circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>' +
              '<circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>' +
            '</svg>' +
            '<span>Tarik</span>' +
          '</div>' +
        '</div>';
    });

    resultsContainerEl.innerHTML = html;

    // Attach pointerdown handlers for PRESS-AND-DRAG directly into workspace
    var items = resultsContainerEl.querySelectorAll('.bs-item');
    items.forEach(function(itemEl) {
      var idx = parseInt(itemEl.getAttribute('data-index'), 10);
      var itemData = currentFilteredList[idx];

      // PointerDown: Block sticks to cursor and drags immediately
      itemEl.addEventListener('pointerdown', function(e) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        e.preventDefault();
        e.stopPropagation();
        startDragFromSearch(e, itemData);
      });

      // Hover highlight
      itemEl.addEventListener('mouseenter', function() {
        activeIndex = idx;
        updateSelectedVisual();
      });
    });

    scrollActiveIntoView();
  }

  function scrollActiveIntoView() {
    if (!resultsContainerEl) return;
    var sel = resultsContainerEl.querySelector('.bs-item.selected');
    if (sel) {
      sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function updateSelectedVisual() {
    if (!resultsContainerEl) return;
    var items = resultsContainerEl.querySelectorAll('.bs-item');
    items.forEach(function(el, idx) {
      if (idx === activeIndex) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
    scrollActiveIntoView();
  }

  /**
   * UX UTAMA: Drag & Drop Blok Langsung ke Workspace (Identik dengan Toolbox Flyout)
   * 
   * Menggunakan Blockly.BlockDragger resmi bawaan Blockly:
   * - Tekan & Geser (drag >= 5px):
   *   1. Modal search dibuat transparan (opacity: 0) tanpa merusak pointer events.
   *   2. Blok SVG asli dibuat di workspace pada posisi kursor mouse.
   *   3. Blockly.BlockDragger menggerakkan blok asli secara real-time di workspace.
   *   4. Saat didekatkan ke blok lain, insertion marker / preview koneksi menyala otomatis.
   *   5. Saat dilepas (pointerup), blok otomatis menancap (snap) ke soket / koneksi yang cocok.
   * - Klik / Tap tanpa menggeser:
   *   Blok langsung ditaruh di tengah workspace yang terlihat.
   */
  function startDragFromSearch(e, itemData) {
    if (!itemData || !window.workspace) return;

    var startClientX = e.clientX;
    var startClientY = e.clientY;
    var isDragging = false;
    var block = null;
    var blockDragger = null;
    var dragStartCoord = null;

    function onPointerMove(moveEvent) {
      if (!isDragging) {
        var dist = Math.hypot(moveEvent.clientX - startClientX, moveEvent.clientY - startClientY);
        if (dist >= 5) {
          isDragging = true;

          // Jadikan modal transparan agar workspace di baliknya 100% terlihat jelas
          // PENTING: Jangan gunakan pointer-events: none atau display: none agar Chromium tidak membatalkan pointer
          if (modalEl) {
            modalEl.style.opacity = '0';
          }

          // Buat blok baru di workspace utama
          if (itemData.xmlString && window.Blockly && Blockly.Xml) {
            try {
              var dom = Blockly.utils.xml.textToDom('<xml>' + itemData.xmlString + '</xml>');
              if (dom && dom.firstChild) {
                block = Blockly.Xml.domToBlock(dom.firstChild, window.workspace);
              }
            } catch (err) {}
          }

          if (!block) {
            block = window.workspace.newBlock(itemData.type);
          }

          block.initSvg();
          block.render();

          // Konversi koordinat mouse layar ke koordinat workspace
          var wsCoord = Blockly.utils.svgMath.screenToWsCoordinates(
            window.workspace,
            new Blockly.utils.Coordinate(moveEvent.clientX, moveEvent.clientY)
          );

          // Posisikan blok sehingga cursor berada di dekat header blok
          block.moveTo(new Blockly.utils.Coordinate(wsCoord.x - 20, wsCoord.y - 15));

          // Inisialisasi dragger resmi Blockly (identik dengan drag dari toolbox samping)
          blockDragger = new Blockly.BlockDragger(block, window.workspace);
          dragStartCoord = new Blockly.utils.Coordinate(moveEvent.clientX, moveEvent.clientY);
          blockDragger.startDrag(new Blockly.utils.Coordinate(0, 0), false);
        }
      }

      if (isDragging && blockDragger) {
        var deltaX = moveEvent.clientX - dragStartCoord.x;
        var deltaY = moveEvent.clientY - dragStartCoord.y;
        blockDragger.drag(moveEvent, new Blockly.utils.Coordinate(deltaX, deltaY));
      }
    }

    function onPointerUp(upEvent) {
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerCancel, true);

      // Kembalikan modal opacity dan tutup modal
      if (modalEl) {
        modalEl.style.opacity = '';
      }
      closeModal();

      if (isDragging && blockDragger) {
        var deltaX = upEvent.clientX - dragStartCoord.x;
        var deltaY = upEvent.clientY - dragStartCoord.y;
        blockDragger.endDrag(upEvent, new Blockly.utils.Coordinate(deltaX, deltaY));

        if (block) {
          block.select();
          // Fallback snap jika posisi dekat koneksi lain tapi belum terhubung
          if (!block.getParent()) {
            trySnapBlock(block);
          }
        }

        if (typeof window.playSnapSound === 'function') {
          window.playSnapSound();
        }
        showInsertFeedback(itemData.title);
      } else if (!isDragging) {
        // Klik biasa tanpa geser: masukkan langsung ke tengah workspace
        insertBlockToWorkspace(itemData);
      }
    }

    function onPointerCancel(cancelEvent) {
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerCancel, true);

      if (modalEl) {
        modalEl.style.opacity = '';
      }
      closeModal();

      if (isDragging && blockDragger) {
        var deltaX = cancelEvent.clientX - dragStartCoord.x;
        var deltaY = cancelEvent.clientY - dragStartCoord.y;
        blockDragger.endDrag(cancelEvent, new Blockly.utils.Coordinate(deltaX, deltaY));
        if (block) block.select();
      }
    }

    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerCancel, true);
  }

  /**
   * Fallback snap jika blok berada sangat dekat dengan koneksi blok lain
   */
  function trySnapBlock(block) {
    if (!block || !window.workspace) return false;
    try {
      var dThreshold = 45; // workspace units
      var blockConns = block.getConnections_ ? block.getConnections_(false) : [];
      var topBlocks = window.workspace.getTopBlocks(true);

      for (var i = 0; i < topBlocks.length; i++) {
        var other = topBlocks[i];
        if (other === block) continue;
        var otherConns = other.getDescendants(false).flatMap(function(b) {
          return b.getConnections_ ? b.getConnections_(false) : [];
        });

        for (var bIdx = 0; bIdx < blockConns.length; bIdx++) {
          var c1 = blockConns[bIdx];
          for (var oIdx = 0; oIdx < otherConns.length; oIdx++) {
            var c2 = otherConns[oIdx];
            if (c1.canConnectWithReason_(c2) === 0) {
              var p1 = c1.getOffsetInBlock();
              var p2 = c2.getOffsetInBlock();
              var bPos = block.getRelativeToSurfaceXY();
              var oPos = c2.getSourceBlock().getRelativeToSurfaceXY();
              var c1X = bPos.x + p1.x;
              var c1Y = bPos.y + p1.y;
              var c2X = oPos.x + p2.x;
              var c2Y = oPos.y + p2.y;
              if (Math.hypot(c1X - c2X, c1Y - c2Y) <= dThreshold) {
                c1.connect(c2);
                return true;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[BlockSearch] trySnapBlock error:', e);
    }
    return false;
  }

  /**
   * Fallback insert blok ke tengah workspace (misal saat tekan Enter pada keyboard)
   */
  function insertBlockToWorkspace(itemData) {
    if (!itemData || !window.workspace) return;

    try {
      var blocklyDiv = document.getElementById('blocklyDiv');
      var rect = blocklyDiv ? blocklyDiv.getBoundingClientRect() : { width: 600, height: 400, left: 100, top: 100 };
      var centerScreenX = rect.left + rect.width / 2;
      var centerScreenY = rect.top + rect.height / 2;

      var injectionDiv = window.workspace.getInjectionDiv();
      var injRect = injectionDiv.getBoundingClientRect();
      var wsX = (centerScreenX - injRect.left - window.workspace.scrollX) / window.workspace.scale;
      var wsY = (centerScreenY - injRect.top - window.workspace.scrollY) / window.workspace.scale;

      wsX += (Math.random() - 0.5) * 60;
      wsY += (Math.random() - 0.5) * 40;

      var newBlock = null;
      if (itemData.xmlString && window.Blockly && Blockly.Xml) {
        try {
          var dom = Blockly.utils.xml.textToDom('<xml>' + itemData.xmlString + '</xml>');
          if (dom && dom.firstChild) {
            newBlock = Blockly.Xml.domToBlock(dom.firstChild, window.workspace);
          }
        } catch (e) {}
      }

      if (!newBlock) {
        newBlock = window.workspace.newBlock(itemData.type);
      }

      newBlock.initSvg();
      newBlock.render();
      newBlock.moveTo(new Blockly.utils.Coordinate(wsX, wsY));
      newBlock.select();

      showInsertFeedback(itemData.title);

      if (typeof window.playSnapSound === 'function') {
        window.playSnapSound();
      }

      closeModal();
    } catch (err) {
      console.error('[BlockSearch] Insert failed:', err);
      closeModal();
    }
  }

  /**
   * Brief visual toast feedback saat blok dimasukkan
   */
  function showInsertFeedback(title) {
    var existing = document.getElementById('bsInsertToast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'bsInsertToast';
    toast.className = 'bs-insert-toast';
    toast.innerHTML = 
      '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
      '<span>Blok <b>' + escapeHtml(title) + '</b> ditambahkan</span>';
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(function() {
      toast.classList.add('show');
    });

    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 1800);
  }

  // ── Keyboard ──
  function handleKeyDown(e) {
    if (!modalEl || modalEl.classList.contains('hidden')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentFilteredList.length > 0) {
        activeIndex = (activeIndex + 1) % currentFilteredList.length;
        updateSelectedVisual();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentFilteredList.length > 0) {
        activeIndex = (activeIndex - 1 + currentFilteredList.length) % currentFilteredList.length;
        updateSelectedVisual();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < currentFilteredList.length) {
        insertBlockToWorkspace(currentFilteredList[activeIndex]);
      }
      return;
    }
  }

  function openModal() {
    if (!modalEl) initDOM();
    if (!modalEl) return;

    buildBlockCatalog();
    renderCategoryChips();

    modalEl.classList.remove('hidden');

    if (inputEl) {
      inputEl.value = '';
      filterAndRenderResults('');
      setTimeout(function() {
        inputEl.focus();
        inputEl.select();
      }, 50);
    }
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initDOM() {
    modalEl = document.getElementById('blockSearchModal');
    inputEl = document.getElementById('blockSearchInput');
    resultsContainerEl = document.getElementById('blockSearchResults');
    categoryChipsEl = document.getElementById('blockSearchCategoryChips');
    resultCountEl = document.getElementById('blockSearchResultCount');
    btnClearEl = document.getElementById('btnSearchClear');
    btnCloseEl = document.getElementById('btnCloseBlockSearch');
    btnFloatingTrigger = document.getElementById('btnFloatingSearchBlocks');

    if (inputEl) {
      inputEl.addEventListener('input', function() {
        filterAndRenderResults(this.value);
        if (btnClearEl) {
          btnClearEl.style.display = this.value.length > 0 ? 'inline-flex' : 'none';
        }
      });
    }

    if (btnClearEl && inputEl) {
      btnClearEl.addEventListener('click', function() {
        inputEl.value = '';
        btnClearEl.style.display = 'none';
        filterAndRenderResults('');
        inputEl.focus();
      });
    }

    if (btnCloseEl) {
      btnCloseEl.addEventListener('click', closeModal);
    }

    if (btnFloatingTrigger) {
      btnFloatingTrigger.addEventListener('click', openModal);
    }

    if (modalEl) {
      modalEl.addEventListener('click', function(e) {
        if (e.target === modalEl) {
          closeModal();
        }
      });
    }

    window.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        var bodyMode = document.body.classList.contains('mode-text') ? 'text' : 'block';
        if (bodyMode === 'block') {
          e.preventDefault();
          if (modalEl && !modalEl.classList.contains('hidden')) {
            closeModal();
          } else {
            openModal();
          }
        }
      }
    });

    window.addEventListener('keydown', handleKeyDown);
  }

  // ── Public API ──
  window.ArduiBlokSearch = {
    init: function() {
      initDOM();
      buildBlockCatalog();
    },
    open: openModal,
    close: closeModal,
    rebuildCatalog: buildBlockCatalog
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.ArduiBlokSearch.init();
    });
  } else {
    window.ArduiBlokSearch.init();
  }

})(window);
