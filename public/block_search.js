/**
 * ArduiBlok — Visual Spotlight Block Search & Drag-and-Drop System
 * Menampilkan WUJUD VISUAL ASLI BLOK BLOCKLY (SVG Shape) di dalam hasil pencarian,
 * tanpa sintaks teks ArduinoIDE atau penjelasan panjang, lengkap dengan fitur
 * Drag & Drop visual langsung ke workspace serta 1-Click Spawn.
 */
(function(window) {
  'use strict';

  // ── Database Metadata Blok (Untuk Pencarian Multi-Token Cerdas) ──
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

  // ── State Modul ──
  let blockCatalog = [];
  let currentFilteredList = [];
  let activeIndex = -1;
  let activeCategory = 'all';
  let isDragging = false;
  let dragItemData = null;
  let dragGhostEl = null;
  let dragStartPos = { x: 0, y: 0 };
  let hasMovedEnough = false;

  // Off-screen Headless Workspace untuk render SVG blok asli
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

  /**
   * Menyiapkan Workspace SVG tersembunyi (Off-screen) khusus untuk merender blok
   */
  function getOrCreateOffscreenWorkspace() {
    if (offscreenWorkspace) return offscreenWorkspace;
    if (!window.Blockly) return null;

    let offscreenDiv = document.getElementById('blocklyOffscreenDiv');
    if (!offscreenDiv) {
      offscreenDiv = document.createElement('div');
      offscreenDiv.id = 'blocklyOffscreenDiv';
      offscreenDiv.style.cssText = 'position: fixed; width: 1000px; height: 1000px; left: -9999px; top: -9999px; visibility: hidden; pointer-events: none; z-index: -1;';
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
      console.warn('[BlockSearch] Gagal inisialisasi offscreen workspace:', e);
    }

    return offscreenWorkspace;
  }

  /**
   * Render SVG Asli dari sebuah blok menjadi markup string yang dapat disisipkan ke HTML
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
        } catch (xmlErr) {
          // ignore
        }
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
      const w = Math.ceil(bbox.width + pad * 2);
      const h = Math.ceil(bbox.height + pad * 2);

      // Clone node SVG blok
      const cloned = svgRoot.cloneNode(true);
      cloned.removeAttribute('transform');

      // Bungkus dalam tag <svg> yang mandiri
      const svgMarkup =
        '<svg class="block-visual-svg" viewBox="' + x + ' ' + y + ' ' + w + ' ' + h + '" ' +
        'data-width="' + w + '" data-height="' + h + '">' +
          cloned.outerHTML +
        '</svg>';

      return svgMarkup;
    } catch (err) {
      console.warn('[BlockSearch] Gagal render visual SVG blok:', item.type, err);
      return '';
    }
  }

  /**
   * Bangun katalog blok dari <xml id="toolbox">
   */
  function buildBlockCatalog() {
    const toolboxEl = document.getElementById('toolbox');
    if (!toolboxEl) return;

    blockCatalog = [];
    const categories = toolboxEl.getElementsByTagName('category');

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const catName = cat.getAttribute('name') || 'Umum';
      const catColour = cat.getAttribute('colour') || '120';
      const blocks = cat.children;

      for (let j = 0; j < blocks.length; j++) {
        const blkNode = blocks[j];
        if (blkNode.tagName.toLowerCase() !== 'block') continue;

        const type = blkNode.getAttribute('type');
        if (!type) continue;

        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString(blkNode);

        const meta = BLOCK_METADATA[type] || {};
        const title = meta.title || formatBlockTypeToTitle(type);
        const keywords = (meta.keywords || '') + ' ' + type + ' ' + catName.toLowerCase();
        const color = meta.color !== undefined ? meta.color : catColour;

        blockCatalog.push({
          type: type,
          title: title,
          keywords: keywords.toLowerCase(),
          category: catName,
          color: color,
          xmlString: xmlString,
          xmlNode: blkNode,
          svgHtml: null // Diisi saat diperlukan / di-cache
        });
      }
    }
  }

  function formatBlockTypeToTitle(type) {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function(l) { return l.toUpperCase(); });
  }

  function getCssColor(colorValue) {
    if (typeof colorValue === 'number' || (!isNaN(colorValue) && typeof colorValue === 'string' && colorValue.indexOf('#') === -1)) {
      return 'hsl(' + colorValue + ', 70%, 44%)';
    }
    return colorValue || '#3b82f6';
  }

  /**
   * Render Filter Chips Kategori
   */
  function renderCategoryChips() {
    if (!categoryChipsEl) return;
    const categories = ['all'];
    const seen = {};

    blockCatalog.forEach(item => {
      if (!seen[item.category]) {
        seen[item.category] = true;
        categories.push(item.category);
      }
    });

    let html = '<button class="block-cat-chip' + (activeCategory === 'all' ? ' active' : '') + '" data-cat="all">Semua Blok</button>';

    categories.forEach(cat => {
      if (cat === 'all') return;
      const isActive = activeCategory === cat;
      const dotColor = CATEGORY_COLORS[cat] || '#3b82f6';
      html += '<button class="block-cat-chip' + (isActive ? ' active' : '') + '" data-cat="' + escapeHtml(cat) + '">' +
        '<span class="cat-dot" style="background:' + dotColor + ';"></span>' +
        escapeHtml(cat) +
      '</button>';
    });

    categoryChipsEl.innerHTML = html;

    const chips = categoryChipsEl.querySelectorAll('.block-cat-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', function() {
        activeCategory = this.getAttribute('data-cat') || 'all';
        chips.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        filterAndRenderResults(inputEl ? inputEl.value : '');
        if (inputEl) inputEl.focus();
      });
    });
  }

  /**
   * Filter blok berdasarkan query teks & kategori
   */
  function filterAndRenderResults(query) {
    query = (query || '').trim().toLowerCase();
    const queryTokens = query.split(/\s+/).filter(t => t.length > 0);

    currentFilteredList = blockCatalog.filter(item => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (queryTokens.length === 0) return true;

      const targetStr = (item.title + ' ' + item.keywords + ' ' + item.category).toLowerCase();
      return queryTokens.every(token => targetStr.indexOf(token) !== -1);
    });

    activeIndex = currentFilteredList.length > 0 ? 0 : -1;
    renderResultsList();
  }

  /**
   * Render Galeri Bentuk Blok Visual (Tanpa Sintaks ArduinoIDE / Tanpa Teks Deskripsi Panjang)
   */
  function renderResultsList() {
    if (!resultsContainerEl) return;

    if (resultCountEl) {
      resultCountEl.textContent = currentFilteredList.length + ' blok ditemukan';
    }

    if (currentFilteredList.length === 0) {
      resultsContainerEl.innerHTML =
        '<div class="block-search-empty">' +
          '<svg class="empty-icon" viewBox="0 0 24 24">' +
            '<circle cx="11" cy="11" r="8"></circle>' +
            '<line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
            '<line x1="8" y1="11" x2="14" y2="11"></line>' +
          '</svg>' +
          '<div class="empty-title">Tidak ada bentuk blok yang cocok</div>' +
          '<div class="empty-desc">Coba ketik kata kunci lain seperti <b>servo</b>, <b>pin</b>, <b>delay</b>, <b>motor</b>, <b>if</b>, atau <b>serial</b>.</div>' +
        '</div>';
      return;
    }

    let html = '';
    currentFilteredList.forEach((item, idx) => {
      const isSelected = idx === activeIndex;
      const chipColor = getCssColor(item.color);

      // Buat SVG bentuk blok jika belum ada di cache
      if (!item.svgHtml) {
        item.svgHtml = renderBlockSvgMarkup(item);
      }

      html +=
        '<div class="block-result-card' + (isSelected ? ' selected' : '') + '" data-index="' + idx + '" data-type="' + escapeHtml(item.type) + '">' +
          '<div class="card-visual-top">' +
            '<div class="card-top-left">' +
              '<span class="card-cat-badge" style="background: ' + chipColor + '18; color: ' + chipColor + '; border-color: ' + chipColor + '40;">' +
                escapeHtml(item.category) +
              '</span>' +
              '<span class="card-drag-hint">' +
                '<svg class="handle-icon" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle></svg>' +
                '<span>Tahan &amp; Drag</span>' +
              '</span>' +
            '</div>' +
            '<div class="card-top-right">' +
              '<button class="btn-card-spawn" title="Tambahkan langsung ke kanvas" data-action="spawn">' +
                '<svg class="svg-icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' +
                '<span>Masukkan</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="card-visual-canvas" title="Tahan &amp; Drag langsung ke kanvas workspace, atau klik untuk masukkan">' +
            (item.svgHtml || '<div class="block-svg-fallback">' + escapeHtml(item.title) + '</div>') +
          '</div>' +
        '</div>';
    });

    resultsContainerEl.innerHTML = html;

    // Pasang listener interaksi pointer & click pada setiap kartu
    const cards = resultsContainerEl.querySelectorAll('.block-result-card');
    cards.forEach(card => {
      const idx = parseInt(card.getAttribute('data-index'), 10);
      const itemData = currentFilteredList[idx];

      // Klik 1x untuk spawn langsung
      card.addEventListener('click', function(e) {
        if (hasMovedEnough) return;
        if (itemData) {
          spawnBlockToWorkspaceCenter(itemData);
          closeModal();
        }
      });

      // Pointer event untuk Drag and Drop Visual
      card.addEventListener('pointerdown', function(e) {
        if (e.button !== undefined && e.button !== 0) return;
        startDragInteraction(e, itemData);
      });
    });

    scrollActiveCardIntoView();
  }

  function scrollActiveCardIntoView() {
    if (!resultsContainerEl) return;
    const selectedCard = resultsContainerEl.querySelector('.block-result-card.selected');
    if (selectedCard) {
      selectedCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ── Penanganan Drag & Drop Visual ──
  function startDragInteraction(e, itemData) {
    if (!itemData || !window.workspace) return;

    dragItemData = itemData;
    dragStartPos = { x: e.clientX, y: e.clientY };
    hasMovedEnough = false;

    function onPointerMove(moveEvent) {
      const dx = moveEvent.clientX - dragStartPos.x;
      const dy = moveEvent.clientY - dragStartPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!isDragging && dist > 7) {
        isDragging = true;
        hasMovedEnough = true;
        createDragGhost(dragItemData, moveEvent.clientX, moveEvent.clientY);

        // Meredupkan modal pencarian agar kanvas di bawahnya terlihat sangat jelas
        if (modalEl) {
          modalEl.classList.add('dragging-mode');
        }
      }

      if (isDragging && dragGhostEl) {
        dragGhostEl.style.left = moveEvent.clientX + 'px';
        dragGhostEl.style.top = moveEvent.clientY + 'px';
      }
    }

    function onPointerUp(upEvent) {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (isDragging) {
        const blocklyDiv = document.getElementById('blocklyDiv');
        const rect = blocklyDiv ? blocklyDiv.getBoundingClientRect() : null;

        const isOverCanvas = rect &&
          upEvent.clientX >= rect.left &&
          upEvent.clientX <= rect.right &&
          upEvent.clientY >= rect.top &&
          upEvent.clientY <= rect.bottom;

        if (isOverCanvas && dragItemData) {
          spawnBlockAtScreenPosition(dragItemData, upEvent.clientX, upEvent.clientY);
          closeModal();
        } else {
          if (modalEl) modalEl.classList.remove('dragging-mode');
        }

        cleanupDragGhost();
        isDragging = false;
        setTimeout(() => { hasMovedEnough = false; }, 150);
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  /**
   * Ghost Avatar Melayang: Menampilkan WUJUD VISUAL ASLI BLOK mengikuti kursor
   */
  function createDragGhost(itemData, clientX, clientY) {
    cleanupDragGhost();
    const ghost = document.createElement('div');
    ghost.className = 'block-drag-ghost';

    // Gunakan SVG bentuk blok asli sebagai ghost avatar
    if (itemData.svgHtml) {
      ghost.innerHTML =
        '<div class="ghost-visual-container">' +
          itemData.svgHtml +
        '</div>';
    } else {
      const chipColor = getCssColor(itemData.color);
      ghost.innerHTML =
        '<div class="ghost-pill" style="border-left: 4px solid ' + chipColor + ';">' +
          '<span class="ghost-cat">' + escapeHtml(itemData.category) + '</span>' +
          '<strong class="ghost-title">' + escapeHtml(itemData.title) + '</strong>' +
        '</div>';
    }

    ghost.style.position = 'fixed';
    ghost.style.left = clientX + 'px';
    ghost.style.top = clientY + 'px';
    ghost.style.transform = 'translate(-30px, -20px)';
    ghost.style.zIndex = '999999';
    ghost.style.pointerEvents = 'none';

    document.body.appendChild(ghost);
    dragGhostEl = ghost;
  }

  function cleanupDragGhost() {
    if (dragGhostEl && dragGhostEl.parentNode) {
      dragGhostEl.parentNode.removeChild(dragGhostEl);
    }
    dragGhostEl = null;
    if (modalEl) {
      modalEl.classList.remove('dragging-mode');
    }
  }

  /**
   * Spawn blok di koordinat tengah layar workspace
   */
  function spawnBlockToWorkspaceCenter(itemData) {
    if (!window.workspace) return;
    try {
      const blocklyDiv = document.getElementById('blocklyDiv');
      const rect = blocklyDiv ? blocklyDiv.getBoundingClientRect() : { width: 600, height: 400, left: 100, top: 100 };
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      spawnBlockAtScreenPosition(itemData, centerX, centerY);
    } catch (e) {
      spawnBlockFallback(itemData);
    }
  }

  /**
   * Spawn blok di koordinat layar (clientX, clientY)
   */
  function spawnBlockAtScreenPosition(itemData, clientX, clientY) {
    if (!window.workspace) return;

    try {
      const injectionDiv = window.workspace.getInjectionDiv();
      const rect = injectionDiv.getBoundingClientRect();

      const wsX = (clientX - rect.left - window.workspace.scrollX) / window.workspace.scale;
      const wsY = (clientY - rect.top - window.workspace.scrollY) / window.workspace.scale;

      let newBlock = null;

      if (itemData.xmlString && window.Blockly && Blockly.Xml) {
        try {
          const dom = Blockly.utils.xml.textToDom('<xml>' + itemData.xmlString + '</xml>');
          const blockDom = dom.firstChild;
          if (blockDom) {
            newBlock = Blockly.Xml.domToBlock(blockDom, window.workspace);
          }
        } catch (xmlErr) {
          console.warn('[BlockSearch] Gagal parse XML blok:', xmlErr);
        }
      }

      if (!newBlock) {
        newBlock = window.workspace.newBlock(itemData.type);
        newBlock.initSvg();
        newBlock.render();
      }

      if (newBlock) {
        newBlock.moveTo(new Blockly.utils.Coordinate(wsX, wsY));
        newBlock.select();

        if (typeof window.playSnapSound === 'function') {
          window.playSnapSound();
        }
      }
    } catch (err) {
      console.error('[BlockSearch] Gagal meletakkan blok:', err);
      spawnBlockFallback(itemData);
    }
  }

  function spawnBlockFallback(itemData) {
    if (!window.workspace) return;
    try {
      const b = window.workspace.newBlock(itemData.type);
      b.initSvg();
      b.render();
      b.moveBy(150, 150);
      b.select();
    } catch (e) {
      console.error('[BlockSearch] Fatal spawn fallback:', e);
    }
  }

  // ── Keyboard Navigation ──
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
        updateSelectedCardVisual();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentFilteredList.length > 0) {
        activeIndex = (activeIndex - 1 + currentFilteredList.length) % currentFilteredList.length;
        updateSelectedCardVisual();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < currentFilteredList.length) {
        const item = currentFilteredList[activeIndex];
        spawnBlockToWorkspaceCenter(item);
        closeModal();
      }
      return;
    }
  }

  function updateSelectedCardVisual() {
    if (!resultsContainerEl) return;
    const cards = resultsContainerEl.querySelectorAll('.block-result-card');
    cards.forEach((c, idx) => {
      if (idx === activeIndex) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });
    scrollActiveCardIntoView();
  }

  function openModal() {
    if (!modalEl) initDOM();
    if (!modalEl) return;

    buildBlockCatalog();
    renderCategoryChips();

    modalEl.classList.remove('hidden');
    modalEl.classList.remove('dragging-mode');

    if (inputEl) {
      inputEl.value = '';
      filterAndRenderResults('');
      setTimeout(() => {
        inputEl.focus();
        inputEl.select();
      }, 50);
    }
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    modalEl.classList.remove('dragging-mode');
    cleanupDragGhost();
    isDragging = false;
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
        const bodyMode = document.body.classList.contains('mode-text') ? 'text' : 'block';
        if (bodyMode === 'block') {
          e.preventDefault();
          if (modalEl && !modalEl.classList.contains('hidden')) {
            closeModal();
          } else {
            openModal();
          }
        }
      }

      if (e.key === '/' && !modalEl?.classList.contains('hidden')) {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const isEditable = document.activeElement && (document.activeElement.isContentEditable || activeTag === 'input' || activeTag === 'textarea');
        if (!isEditable) {
          const bodyMode = document.body.classList.contains('mode-text') ? 'text' : 'block';
          if (bodyMode === 'block') {
            e.preventDefault();
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
