// ============================================================
// code_editor.js — Arduino C++ Text Editor Manager for ArduiBlok
// ============================================================

(function(window) {
  'use strict';

  var editorInstance = null;
  var isEditorInitialized = false;

  var DEFAULT_CPP_SKETCH = 
`// ============================================================
// ArduiBlok — Arduino C++ Text IDE
// Tulis kode program Arduino secara langsung di bawah ini
// ============================================================

void setup() {
  // Inisialisasi pin dan komunikasi serial
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("ArduiBlok C++ IDE Siap!");
}

void loop() {
  // Kode program utama yang berjalan berulang kali
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`;

  var ArduiBlokEditor = {
    /**
     * Inisialisasi Ace Code Editor
     */
    init: function(containerId, options) {
      if (typeof ace === 'undefined') {
        console.error('[ArduiBlokEditor] Ace Editor library belum dimuat.');
        return null;
      }

      var el = document.getElementById(containerId);
      if (!el) {
        console.error('[ArduiBlokEditor] Kontainer editor tidak ditemukan: ' + containerId);
        return null;
      }

      if (editorInstance) {
        return editorInstance;
      }

      options = options || {};
      editorInstance = ace.edit(containerId);

      // Konfigurasi mode dan opsi editor
      editorInstance.session.setMode('ace/mode/c_cpp');
      editorInstance.setOptions({
        fontSize: '13.5px',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        tabSize: 2,
        useSoftTabs: true,
        showPrintMargin: false,
        highlightActiveLine: true,
        wrap: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        cursorStyle: 'smooth',
        behavioursEnabled: true
      });

      // Sinkronisasi tema visual
      this.syncTheme();

      // Muat kode tersimpan atau gunakan template default
      var savedCode = localStorage.getItem('arduiblok_text_code');
      if (savedCode && savedCode.trim().length > 0) {
        editorInstance.setValue(savedCode, -1);
      } else {
        editorInstance.setValue(DEFAULT_CPP_SKETCH, -1);
      }

      // Auto-save perubahan kode teks ke localStorage
      editorInstance.on('change', function() {
        var currentCode = editorInstance.getValue();
        localStorage.setItem('arduiblok_text_code', currentCode);
        if (typeof options.onChange === 'function') {
          options.onChange(currentCode);
        }
      });

      isEditorInitialized = true;
      return editorInstance;
    },

    /**
     * Ambil isi teks kode C++ saat ini
     */
    getValue: function() {
      if (editorInstance) {
        return editorInstance.getValue();
      }
      return localStorage.getItem('arduiblok_text_code') || DEFAULT_CPP_SKETCH;
    },

    /**
     * Atur isi kode C++ ke editor
     */
    setValue: function(codeStr) {
      if (editorInstance) {
        editorInstance.setValue(codeStr || DEFAULT_CPP_SKETCH, -1);
        editorInstance.clearSelection();
      }
      localStorage.setItem('arduiblok_text_code', codeStr || DEFAULT_CPP_SKETCH);
    },

    /**
     * Injeksi baris #include <Library.h> di baris paling atas editor
     */
    insertInclude: function(headerString) {
      if (!headerString) return;
      var currentCode = this.getValue();
      
      // Periksa apakah header sudah ada
      var checkPattern = headerString.split('\n')[0].trim();
      if (checkPattern && currentCode.includes(checkPattern)) {
        return false; // Sudah terpasang
      }

      var newCode = headerString.trim() + '\n\n' + currentCode;
      this.setValue(newCode);
      return true;
    },

    /**
     * Sinkronisasi tema gelap/terang editor dengan UI website
     */
    syncTheme: function() {
      if (!editorInstance) return;
      var docTheme = document.documentElement.getAttribute('data-theme') || 
                     document.body.getAttribute('data-theme') || 
                     localStorage.getItem('arduiblok_theme') || 
                     'light';
      var isDark = (docTheme === 'dark') || 
                   document.body.classList.contains('dark-theme') || 
                   document.documentElement.classList.contains('dark');

      if (isDark) {
        editorInstance.setTheme('ace/theme/tomorrow_night');
      } else {
        editorInstance.setTheme('ace/theme/chrome');
      }
    },

    /**
     * Format / Prettify indentasi kode C++
     */
    formatCode: function() {
      if (!editorInstance) return;
      var code = editorInstance.getValue();
      var lines = code.split('\n');
      var formatted = [];
      var indent = 0;
      var tab = '  ';

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();

        if (line.length === 0) {
          formatted.push('');
          continue;
        }

        // Hitung penutupan kurung kurawal
        if (line.startsWith('}') || line.startsWith('};') || line.startsWith(')')) {
          indent = Math.max(0, indent - 1);
        }

        var indentStr = '';
        for (var j = 0; j < indent; j++) {
          indentStr += tab;
        }
        formatted.push(indentStr + line);

        // Hitung pembukaan kurung kurawal
        var openBraces = (line.match(/{/g) || []).length;
        var closeBraces = (line.match(/}/g) || []).length;
        indent += (openBraces - closeBraces);
        indent = Math.max(0, indent);
      }

      editorInstance.setValue(formatted.join('\n'), -1);
    },

    /**
     * Refresh ukuran editor saat container di-resize
     */
    resize: function() {
      if (editorInstance) {
        editorInstance.resize();
      }
    },

    /**
     * Fokus ke editor
     */
    focus: function() {
      if (editorInstance) {
        editorInstance.focus();
      }
    }
  };

  window.ArduiBlokEditor = ArduiBlokEditor;

})(window);
