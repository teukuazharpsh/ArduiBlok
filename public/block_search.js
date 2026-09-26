/**
 * ArduiBlok — Quick Floating Block Search & Drag-and-Drop System
 * Memungkinkan pencarian blok instan dengan keyword, filter kategori, navigasi keyboard (Ctrl+K),
 * serta penambahan langsung ke workspace via Klik (1-Click Spawn) ataupun Drag-and-Drop (Pointer Event).
 */
(function(window) {
  'use strict';

  // ── Database Kamus Metadata Blok (Nama ID/EN, Deskripsi, Sintaks C++, Tag) ──
  const BLOCK_METADATA = {
    'arduino_setup': {
      title: 'Setup (Inisialisasi Awal)',
      desc: 'Blok yang dijalankan 1 kali saat mikrokontroler pertama kali menyala atau di-reset.',
      syntax: 'void setup() { ... }',
      keywords: 'setup awal start inisialisasi booting boot run once',
      category: 'Setup & Loop',
      color: 180
    },
    'arduino_loop': {
      title: 'Loop (Pengulangan Utama)',
      desc: 'Blok yang berjalan terus menerus secara berulang tanpa henti selama board menyala.',
      syntax: 'void loop() { ... }',
      keywords: 'loop perulangan putar ulang terus repeat forever',
      category: 'Setup & Loop',
      color: 195
    },
    'motor_dc': {
      title: 'Motor DC (Driver L298N)',
      desc: 'Kendali arah maju/mundur/berhenti dan kecepatan motor DC via sinyal PWM.',
      syntax: 'digitalWrite(in1, ...); analogWrite(ena, speed);',
      keywords: 'motor dc l298n l298 dinamo maju mundur speed pwm rotasi',
      category: 'Motors',
      color: 20
    },
    'servo_write': {
      title: 'Servo Motor (Putar Sudut 0-180°)',
      desc: 'Mengendalikan posisi sudut putaran servo motor pada pin digital/PWM tertentu.',
      syntax: 'servo.write(angle);',
      keywords: 'servo motor sudut derajat angle sg90 mg995 mg996 rotasi',
      category: 'Motors',
      color: 20
    },
    'motor_driver_shield': {
      title: 'Motor Driver Shield (L293D / AFMotor)',
      desc: 'Kendali motor DC melalui shield driver multi-kanal (Motor 1 - 4).',
      syntax: 'motor.setSpeed(speed); motor.run(FORWARD);',
      keywords: 'motor driver shield l293d afmotor adafruit robot roda',
      category: 'Motors',
      color: 20
    },
    'digital_write': {
      title: 'Tulis Pin Digital (digitalWrite)',
      desc: 'Mengatur level tegangan pin digital ke HIGH (5V/3.3V) atau LOW (GND). Cocok untuk LED & relay.',
      syntax: 'digitalWrite(pin, HIGH / LOW);',
      keywords: 'digital write tulis output pin led lampu hidup mati nyala relay high low',
      category: 'Input / Output',
      color: 60
    },
    'digital_read': {
      title: 'Baca Pin Digital (digitalRead)',
      desc: 'Membaca kondisi logika pin digital apakah HIGH (1) atau LOW (0). Cocok untuk tombol & limit switch.',
      syntax: 'digitalRead(pin);',
      keywords: 'digital read baca input tombol button switch saklar sensor pir limit touch',
      category: 'Input / Output',
      color: 60
    },
    'pin_digital': {
      title: 'Pilihan Pin Mikrokontroler',
      desc: 'Blok nilai pemilih pin digital (D0 - D13) atau pin analog (A0 - A5).',
      syntax: '13 / 2 / A0',
      keywords: 'pin digital nomor port kaki d13 d2 a0',
      category: 'Input / Output',
      color: 60
    },
    'digital_level': {
      title: 'Level Logika Digital (HIGH / LOW)',
      desc: 'Konstanta level logika 1 (HIGH / Nyala) atau 0 (LOW / Mati).',
      syntax: 'HIGH / LOW',
      keywords: 'high low level boolean 1 0 tegangan',
      category: 'Input / Output',
      color: 60
    },
    'analog_read': {
      title: 'Baca Pin Analog (analogRead)',
      desc: 'Membaca tegangan analog 0 - 5V dan mengonversinya menjadi angka ADC 0 - 1023.',
      syntax: 'analogRead(pin);',
      keywords: 'analog read baca adc a0 a1 a2 a3 a4 a5 potensiometer ldr ntc sensor',
      category: 'Input / Output',
      color: 60
    },
    'analog_write': {
      title: 'Tulis Pin PWM / Analog (analogWrite)',
      desc: 'Mengeluarkan sinyal modulasi lebar pulsa (PWM) dengan nilai 0 hingga 255.',
      syntax: 'analogWrite(pin, value);',
      keywords: 'analog write tulis pwm duty cycle redup terang kecerahan kecepatan 255',
      category: 'Input / Output',
      color: 60
    },
    'pin_mode': {
      title: 'Atur Mode Pin (pinMode)',
      desc: 'Menetapkan mode konfigurasi pin sebagai INPUT, OUTPUT, atau INPUT_PULLUP.',
      syntax: 'pinMode(pin, INPUT / OUTPUT);',
      keywords: 'pinmode mode input output pullup konfigurasi arah',
      category: 'Input / Output',
      color: 60
    },
    'controls_if': {
      title: 'Jika / Percabangan (if / else)',
      desc: 'Menjalankan blok kode tertentu hanya jika kondisi logika terpenuhi (bernilai benar).',
      syntax: 'if (kondisi) { ... } else { ... }',
      keywords: 'if else jika kalau kondisi condition branching percabangan',
      category: 'Control',
      color: 120
    },
    'controls_switch': {
      title: 'Pilihan Ganda (switch / case)',
      desc: 'Memilih dan menjalankan blok instruksi berdasarkan nilai variabel yang cocok.',
      syntax: 'switch (var) { case 1: ... }',
      keywords: 'switch case pilihan opsi cabang kondisi',
      category: 'Control',
      color: 120
    },
    'controls_break': {
      title: 'Hentikan / Keluar Loop (break / continue)',
      desc: 'Menghentikan seketika perulangan aktif atau melompati ke iterasi berikutnya.',
      syntax: 'break; / continue;',
      keywords: 'break continue hentikan lompat stop selesai keluar loop',
      category: 'Control',
      color: 120
    },
    'controls_repeat_arduino': {
      title: 'Ulangi Sebanyak N Kali (for loop)',
      desc: 'Melakukan perulangan kode sejumlah hitungan tertentu yang ditentukan.',
      syntax: 'for (int i = 0; i < N; i++) { ... }',
      keywords: 'repeat ulangi count hitung kali for loop iterasi',
      category: 'Control',
      color: 120
    },
    'controls_while_arduino': {
      title: 'Ulangi Selama Kondisi Benar (while loop)',
      desc: 'Menjalankan instruksi berulang kali selama kondisi pengujian tetap bernilai benar (true).',
      syntax: 'while (kondisi) { ... }',
      keywords: 'while loop selama ulangi do until kondisi perulangan',
      category: 'Control',
      color: 120
    },
    'delay_ms': {
      title: 'Tunggu / Jeda Waktu (delay)',
      desc: 'Menghentikan sementara jalannya program selama durasi milidetik tertentu (1000 ms = 1 detik).',
      syntax: 'delay(1000);',
      keywords: 'delay tunggu jeda waktu sleep ms milidetik pause stop wait',
      category: 'Control',
      color: 120
    },
    'compare_op': {
      title: 'Perbandingan Relasional (==, !=, <, >)',
      desc: 'Membandingkan dua nilai (sama dengan, tidak sama, lebih besar, lebih kecil).',
      syntax: 'a == b / a < b / a > b',
      keywords: 'compare banding sama lebih kecil besar != == <= >= relasi',
      category: 'Logic',
      color: 210
    },
    'logic_boolean': {
      title: 'Nilai Logika (TRUE / FALSE)',
      desc: 'Konstanta nilai kebenaran boolean Benar (true) atau Salah (false).',
      syntax: 'true / false',
      keywords: 'boolean true false benar salah logika',
      category: 'Logic',
      color: 210
    },
    'logic_not': {
      title: 'Pembalikan Logika (NOT / !)',
      desc: 'Membalik nilai boolean: Benar menjadi Salah, dan Salah menjadi Benar.',
      syntax: '!kondisi',
      keywords: 'not bukan negasi kebalikan logika lawan',
      category: 'Logic',
      color: 210
    },
    'logic_operation': {
      title: 'Operasi Logika (AND && / OR ||)',
      desc: 'Menggabungkan dua kondisi logika dengan operator DAN (AND) atau ATAU (OR).',
      syntax: 'a && b / a || b',
      keywords: 'and or dan atau logika gabung operator',
      category: 'Logic',
      color: 210
    },
    'math_number': {
      title: 'Angka Numerik',
      desc: 'Memasukkan nilai angka bulat (integer) atau desimal (float).',
      syntax: '123 / 3.14',
      keywords: 'number angka nilai digit hitung desimal int float',
      category: 'Math',
      color: 230
    },
    'math_op': {
      title: 'Operasi Matematika (+, -, *, /)',
      desc: 'Operasi aritmatika dasar: penjumlahan, pengurangan, perkalian, pembagian, atau modulo.',
      syntax: 'a + b / a * b',
      keywords: 'math tambah kurang kali bagi + - * / modulo modulus aritmatika',
      category: 'Math',
      color: 230
    },
    'map_value': {
      title: 'Pemetaan Nilai (map)',
      desc: 'Memetakan nilai dari satu rentang skala ke rentang skala lainnya (misal 0-1023 ke 0-255).',
      syntax: 'map(val, 0, 1023, 0, 255);',
      keywords: 'map pemetaan skala rentang konversi adc pwm range',
      category: 'Math',
      color: 230
    },
    'serial_begin': {
      title: 'Mulai Serial Monitor (Serial.begin)',
      desc: 'Membuka jalur komunikasi serial ke komputer dengan kecepatan baud rate (contoh 9600 bps).',
      syntax: 'Serial.begin(9600);',
      keywords: 'serial begin monitor komunikasi baud baudrate 9600 115200 usb',
      category: 'Text & Serial',
      color: 160
    },
    'serial_available_do': {
      title: 'Jika Ada Data Masuk (Serial.available)',
      desc: 'Blok event yang otomatis mengeksekusi instruksi ketika ada kiriman byte data via serial.',
      syntax: 'if (Serial.available() > 0) { ... }',
      keywords: 'serial available masuk terima buffer rx event',
      category: 'Text & Serial',
      color: 160
    },
    'serial_available': {
      title: 'Cek Data Serial Tersedia',
      desc: 'Menghasilkan jumlah byte yang telah diterima dan siap dibaca dari buffer serial.',
      syntax: 'Serial.available()',
      keywords: 'serial available cek byte ready',
      category: 'Text & Serial',
      color: 160
    },
    'serial_read': {
      title: 'Baca Serial 1 Karakter (Serial.read)',
      desc: 'Membaca karakter atau byte pertama yang masuk dari port serial.',
      syntax: 'Serial.read();',
      keywords: 'serial read baca char karakter byte masukan',
      category: 'Text & Serial',
      color: 160
    },
    'serial_read_string': {
      title: 'Baca Serial Teks Kalimat (Serial.readString)',
      desc: 'Membaca seluruh teks string serial hingga batas baris baru (newline).',
      syntax: 'Serial.readString();',
      keywords: 'serial readstring baca kalimat teks string pesan',
      category: 'Text & Serial',
      color: 160
    },
    'serial_parse_int': {
      title: 'Baca Serial Nilai Angka (Serial.parseInt)',
      desc: 'Mengambil dan mengonversi urutan karakter angka dari serial menjadi integer.',
      syntax: 'Serial.parseInt();',
      keywords: 'serial parseint parse int angka bilangan',
      category: 'Text & Serial',
      color: 160
    },
    'serial_print': {
      title: 'Kirim Serial + Baris Baru (Serial.println)',
      desc: 'Mengirim teks atau nilai variabel ke Serial Monitor dengan tambahan Enter/Ganti Baris.',
      syntax: 'Serial.println(data);',
      keywords: 'serial print println kirim cetak monitor terminal enter newline',
      category: 'Text & Serial',
      color: 160
    },
    'serial_print_inline': {
      title: 'Kirim Serial Satu Baris (Serial.print)',
      desc: 'Mengirim teks atau nilai variabel ke Serial Monitor tanpa pindah baris.',
      syntax: 'Serial.print(data);',
      keywords: 'serial print cetak kirim satu baris inline inline',
      category: 'Text & Serial',
      color: 160
    },
    'text_string': {
      title: 'Teks String ("...")',
      desc: 'Menampung nilai teks atau kalimat di dalam tanda kutip ganda.',
      syntax: '"Hello World"',
      keywords: 'text string teks kalimat kata huruf petik',
      category: 'Text & Serial',
      color: 160
    },
    'char_character': {
      title: 'Karakter Tunggal (\'A\')',
      desc: 'Menampung satu karakter ASCII di dalam tanda kutip tunggal.',
      syntax: '\'A\'',
      keywords: 'char character karakter huruf simbol ascii',
      category: 'Text & Serial',
      color: 160
    },
    'text_join': {
      title: 'Gabungkan Teks (Concatenation)',
      desc: 'Menggabungkan beberapa potongan teks string atau nilai angka menjadi satu kesatuan teks.',
      syntax: 'String(a) + String(b)',
      keywords: 'text join gabung susun rangkai kalimat tambah string',
      category: 'Text & Serial',
      color: 160
    },
    'variables_declare_arduino': {
      title: 'Deklarasi Variabel (int, float, bool)',
      desc: 'Membuat variabel baru lengkap dengan tipe data (int, long, float, char, bool, String) dan nilai awal.',
      syntax: 'int namaVariabel = 0;',
      keywords: 'variable variabel declare deklarasi int float string tipe buat baru',
      category: 'Variables',
      color: 330
    },
    'variables_set_arduino': {
      title: 'Atur Nilai Variabel (Set Variable)',
      desc: 'Memperbarui atau memasukkan nilai baru ke dalam variabel yang sudah dideklarasikan.',
      syntax: 'namaVariabel = nilai;',
      keywords: 'variable variabel set atur simpan isi ubah nilai',
      category: 'Variables',
      color: 330
    },
    'variables_set_simple': {
      title: 'Set Variabel Sederhana',
      desc: 'Menetapkan nilai variabel secara ringkas.',
      syntax: 'var = value;',
      keywords: 'variable variabel set ubah',
      category: 'Variables',
      color: 330
    },
    'variables_get_arduino': {
      title: 'Ambil Nilai Variabel (Get Variable)',
      desc: 'Mengambil isi nilai dari sebuah variabel untuk digunakan dalam operasi blok lain.',
      syntax: 'namaVariabel',
      keywords: 'variable variabel get ambil baca nilai value',
      category: 'Variables',
      color: 330
    },
    'comment_block': {
      title: 'Catatan / Komentar Kode (//)',
      desc: 'Menambahkan catatan penjelasan satu baris pada program sketch yang tidak akan dieksekusi mesin.',
      syntax: '// komentar Anda',
      keywords: 'comment komentar catatan note penjelasan garis //',
      category: 'Comment',
      color: '#78909c'
    },
    'comment_group_block': {
      title: 'Komentar Pengelompokan Blok (/* */)',
      desc: 'Membungkus atau mengelompokkan sekumpulan blok kode dengan judul catatan penjelas.',
      syntax: '/* Section: ... */',
      keywords: 'comment komentar grup kelompok catatan section wrap',
      category: 'Comment',
      color: '#78909c'
    }
  };

  // Kategori Warna Bawaan
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

  // ── State Modul Pencarian ──
  let blockCatalog = [];
  let currentFilteredList = [];
  let activeIndex = -1;
  let activeCategory = 'all';
  let isDragging = false;
  let dragItemData = null;
  let dragGhostEl = null;
  let dragStartPos = { x: 0, y: 0 };
  let hasMovedEnough = false;

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
   * Ekstraksi seluruh blok dari <xml id="toolbox"> menjadi katalog terstruktur
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

        // Ambil XML lengkap elemen ini untuk reinstansiasi dengan default values & shadow blocks
        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString(blkNode);

        // Ambil info dari kamus metadata atau fallback
        const meta = BLOCK_METADATA[type] || {};
        const title = meta.title || formatBlockTypeToTitle(type);
        const desc = meta.desc || (window.Blockly && Blockly.Blocks[type] && Blockly.Blocks[type].tooltip) || 'Blok pemrograman mikrokontroler';
        const syntax = meta.syntax || '';
        const keywords = (meta.keywords || '') + ' ' + type + ' ' + catName.toLowerCase();
        const color = meta.color !== undefined ? meta.color : catColour;

        blockCatalog.push({
          type: type,
          title: title,
          desc: desc,
          syntax: syntax,
          keywords: keywords.toLowerCase(),
          category: catName,
          color: color,
          xmlString: xmlString,
          xmlNode: blkNode
        });
      }
    }
  }

  function formatBlockTypeToTitle(type) {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function(l) { return l.toUpperCase(); });
  }

  /**
   * Mengonversi warna Blockly (angka Hue atau hex) menjadi CSS color string
   */
  function getCssColor(colorValue) {
    if (typeof colorValue === 'number' || (!isNaN(colorValue) && typeof colorValue === 'string' && colorValue.indexOf('#') === -1)) {
      return 'hsl(' + colorValue + ', 70%, 44%)';
    }
    return colorValue || '#3b82f6';
  }

  /**
   * Menghasilkan kategori unik dari katalog blok
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
   * Filter katalog berdasarkan query teks & kategori aktif
   */
  function filterAndRenderResults(query) {
    query = (query || '').trim().toLowerCase();
    const queryTokens = query.split(/\s+/).filter(t => t.length > 0);

    currentFilteredList = blockCatalog.filter(item => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (queryTokens.length === 0) return true;

      // Pencocokan multi-token fuzzy
      const targetStr = (item.title + ' ' + item.desc + ' ' + item.syntax + ' ' + item.keywords + ' ' + item.category).toLowerCase();
      return queryTokens.every(token => targetStr.indexOf(token) !== -1);
    });

    // Reset keyboard selection index
    activeIndex = currentFilteredList.length > 0 ? 0 : -1;
    renderResultsList();
  }

  /**
   * Render daftar kartu hasil pencarian
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
          '<div class="empty-title">Tidak ada blok yang cocok</div>' +
          '<div class="empty-desc">Coba gunakan kata kunci lain seperti <b>pin</b>, <b>servo</b>, <b>delay</b>, <b>motor</b>, <b>if</b>, atau <b>serial</b>.</div>' +
        '</div>';
      return;
    }

    let html = '';
    currentFilteredList.forEach((item, idx) => {
      const isSelected = idx === activeIndex;
      const chipColor = getCssColor(item.color);

      html +=
        '<div class="block-result-card' + (isSelected ? ' selected' : '') + '" data-index="' + idx + '" data-type="' + escapeHtml(item.type) + '">' +
          '<div class="card-drag-handle" title="Tahan & Drag langsung ke kanvas workspace" data-action="drag">' +
            '<svg class="handle-icon" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle></svg>' +
          '</div>' +
          '<div class="card-main-info" data-action="spawn">' +
            '<div class="card-top-row">' +
              '<span class="card-cat-badge" style="background: ' + chipColor + '18; color: ' + chipColor + '; border-color: ' + chipColor + '40;">' +
                escapeHtml(item.category) +
              '</span>' +
              '<span class="card-type-tag">' + escapeHtml(item.type) + '</span>' +
            '</div>' +
            '<h4 class="card-block-title">' + escapeHtml(item.title) + '</h4>' +
            '<p class="card-block-desc">' + escapeHtml(item.desc) + '</p>' +
            (item.syntax ? '<code class="card-syntax-badge">' + escapeHtml(item.syntax) + '</code>' : '') +
          '</div>' +
          '<div class="card-actions">' +
            '<button class="btn-card-spawn" title="Tambahkan langsung ke tengah kanvas" data-action="spawn">' +
              '<svg class="svg-icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' +
              '<span>Masukkan</span>' +
            '</button>' +
          '</div>' +
        '</div>';
    });

    resultsContainerEl.innerHTML = html;

    // Pasang listener interaksi pointer & click pada setiap kartu
    const cards = resultsContainerEl.querySelectorAll('.block-result-card');
    cards.forEach(card => {
      const idx = parseInt(card.getAttribute('data-index'), 10);
      const itemData = currentFilteredList[idx];

      // Klik langsung untuk spawn
      card.addEventListener('click', function(e) {
        if (hasMovedEnough) return; // Mencegah klik terpicu saat baru selesai drag
        if (itemData) {
          spawnBlockToWorkspaceCenter(itemData);
          closeModal();
        }
      });

      // Pointer event untuk Drag and Drop ke Workspace
      card.addEventListener('pointerdown', function(e) {
        // Hanya tombol mouse kiri (button === 0) atau touch
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

  // ── Penanganan Drag & Drop dengan Pointer Event ──
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
        // Cek apakah dilepas di atas kanvas Blockly
        const blocklyDiv = document.getElementById('blocklyDiv');
        const workspaceContainer = document.getElementById('workspaceContainer');
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
          // Restore modal jika drop dibatalkan di luar kanvas
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

  function createDragGhost(itemData, clientX, clientY) {
    cleanupDragGhost();
    const ghost = document.createElement('div');
    ghost.className = 'block-drag-ghost';
    const chipColor = getCssColor(itemData.color);

    ghost.innerHTML =
      '<div class="ghost-pill" style="border-left: 4px solid ' + chipColor + ';">' +
        '<span class="ghost-cat">' + escapeHtml(itemData.category) + '</span>' +
        '<strong class="ghost-title">' + escapeHtml(itemData.title) + '</strong>' +
        '<span class="ghost-hint">Lepaskan di kanvas</span>' +
      '</div>';

    ghost.style.position = 'fixed';
    ghost.style.left = clientX + 'px';
    ghost.style.top = clientY + 'px';
    ghost.style.transform = 'translate(-50%, -50%)';
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
   * Spawn blok di koordinat tengah pandangan workspace saat ini
   */
  function spawnBlockToWorkspaceCenter(itemData) {
    if (!window.workspace) return;

    try {
      // Ambil ukuran kontainer kanvas
      const blocklyDiv = document.getElementById('blocklyDiv');
      const rect = blocklyDiv ? blocklyDiv.getBoundingClientRect() : { width: 600, height: 400, left: 100, top: 100 };
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      spawnBlockAtScreenPosition(itemData, centerX, centerY);
    } catch (e) {
      console.warn('[BlockSearch] Fallback spawn block:', e);
      spawnBlockFallback(itemData);
    }
  }

  /**
   * Spawn blok tepat di koordinat mouse / pointer screen (clientX, clientY)
   */
  function spawnBlockAtScreenPosition(itemData, clientX, clientY) {
    if (!window.workspace) return;

    try {
      const injectionDiv = window.workspace.getInjectionDiv();
      const rect = injectionDiv.getBoundingClientRect();

      // Konversi pixel screen menjadi koordinat internal Workspace SVG
      const wsX = (clientX - rect.left - window.workspace.scrollX) / window.workspace.scale;
      const wsY = (clientY - rect.top - window.workspace.scrollY) / window.workspace.scale;

      let newBlock = null;

      // 1. Coba reinstansiasi dari XML lengkap (mempertahankan default value, input field, & shadow)
      if (itemData.xmlString && window.Blockly && Blockly.Xml) {
        try {
          const dom = Blockly.utils.xml.textToDom('<xml>' + itemData.xmlString + '</xml>');
          const blockDom = dom.firstChild;
          if (blockDom) {
            newBlock = Blockly.Xml.domToBlock(blockDom, window.workspace);
          }
        } catch (xmlErr) {
          console.warn('[BlockSearch] Gagal parse XML blok, mencoba newBlock:', xmlErr);
        }
      }

      // 2. Fallback instansiasi langsung dari tipe blok
      if (!newBlock) {
        newBlock = window.workspace.newBlock(itemData.type);
        newBlock.initSvg();
        newBlock.render();
      }

      if (newBlock) {
        newBlock.moveTo(new Blockly.utils.Coordinate(wsX, wsY));
        newBlock.select();

        // Putar efek suara snap lembut jika tersedia
        if (typeof window.playSnapSound === 'function') {
          window.playSnapSound();
        }
      }
    } catch (err) {
      console.error('[BlockSearch] Gagal meletakkan blok pada koordinat:', err);
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

  // ── Keyboard Navigation di dalam Search Palette ──
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

  /**
   * Buka Modal Pencarian Blok
   */
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

  /**
   * Tutup Modal Pencarian Blok
   */
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

  /**
   * Inisialisasi DOM dan Event Listener
   */
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

    // Klik di luar container untuk menutup modal
    if (modalEl) {
      modalEl.addEventListener('click', function(e) {
        if (e.target === modalEl) {
          closeModal();
        }
      });
    }

    // Global shortcut Ctrl+K dan /
    window.addEventListener('keydown', function(e) {
      // Ctrl+K atau Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        // Hanya jika kita berada di mode blok atau secara umum
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

      // Tombol Slash '/' saat pengguna tidak sedang mengetik di input / editor
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

  // Otomatis init setelah DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.ArduiBlokSearch.init();
    });
  } else {
    window.ArduiBlokSearch.init();
  }

})(window);
