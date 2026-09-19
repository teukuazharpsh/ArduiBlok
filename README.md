# 🤖 ArduiBlok — Arduino Visual Block Programmer & Cloud Compiler

<p align="center">
  <img src="public/favicon.ico" alt="ArduiBlok Logo" width="80" height="80" style="border-radius: 16px;">
  <br>
  <b>Pemrograman visual Arduino berbasis Google Blockly dengan cloud compiler langsung ke berkas biner <code>.hex</code>.</b>
</p>

<p align="center">
  <a href="https://railway.com/new/template?template=https://github.com/teukuazharpsh/ArduiBlok">
    <img src="https://railway.com/button.svg" alt="Deploy on Railway" height="38">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Web%20%7C%20Android%20(Kodular)-00878a?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Compiler-arduino--cli-00979C?style=flat-square&logo=arduino&logoColor=white" alt="arduino-cli">
  <img src="https://img.shields.io/badge/UI-Google%20Blockly-4285F4?style=flat-square&logo=google&logoColor=white" alt="Blockly">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
</p>

---

## ⚡ 1-Click Deploy ke Railway

Klik tombol di bawah ini untuk langsung mendeploy ArduiBlok ke **Railway**:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https://github.com/teukuazharpsh/ArduiBlok)

> **Catatan:** Setelah deployment selesai di Railway, buka menu **Settings** pada project Anda, lalu klik **"Generate Domain"** pada bagian *Networking* untuk mendapatkan URL publik ber-HTTPS gratis.

---

## 🌟 Fitur Utama

- 🧩 **Visual Block Editor**: Berbasis Google Blockly klasik (*Geras renderer*) dengan kategori standar industri: Setup & Loop, Motors (DC & Servo), I/O Digital & Analog, Serial Monitor, Control, Logic, Math, dan Variables.
- ⚡ **Cloud Compiler Instan**: Mengompilasi kode C++ Arduino menggunakan `arduino-cli` di server dan menghasilkan berkas biner `.hex` siap upload (dalam format Base64 & berkas unduhan langsung).
- 🎯 **Dukungan Multi-Board & Pengaturan Bootloader**:
  - **Arduino Uno** (`arduino:avr:uno`) — ATmega328P, Optiboot (115200 bps)
  - **Arduino Nano (Old Bootloader)** (`arduino:avr:nano:cpu=atmega328old`) — Cocok untuk modul kloningan CH340 umum (57600 bps)
  - **Arduino Nano (New Bootloader)** (`arduino:avr:nano:cpu=atmega328`) — Versi rilis baru (115200 bps)
  - **Arduino Nano (ATmega168)** (`arduino:avr:nano:cpu=atmega168`) — Varian chip 168 (19200 bps)
  - **Arduino Mega 2560** (`arduino:avr:mega:cpu=atmega2560`) — ATmega2560 (115200 bps)
  - **Arduino Pro / Pro Mini** (`arduino:avr:pro`) — 5V 16MHz & 3.3V 8MHz (57600 bps)
  - **Arduino Leonardo** (`arduino:avr:leonardo`) — ATmega32U4 (57600 bps)
- 📦 **Pustaka Bawaan Lengkap**: Sudah terintegrasi dengan pustaka resmi Arduino seperti `<Servo.h>`.
- 💾 **Sistem Penyimpanan Proyek (`.tazp`)**:
  - Penamaan otomatis berformat `project_{counter}_{DDMMYYYY}.tazp`
  - Text box penamaan berkas langsung di navbar yang sinkron ke nama `.tazp` dan `.hex`
  - Fitur **Buka** dan **Simpan** berkas proyek, serta auto-save ke browser localStorage.
- 📱 **Desain Responsif & Mobile-Friendly**: Dioptimalkan untuk tampilan smartphone Android dan WebView Kodular (layout 2 baris rapi khusus mobile).
- 🌓 **Tema Terang & Gelap**: Tampilan antarmuka modern engineering IDE dengan switch tema yang nyaman di mata.

---

## 📱 Panduan Integrasi USB OTG di Kodular (Android)

Untuk mengunggah file `.hex` yang dihasilkan oleh ArduiBlok langsung ke board Arduino menggunakan kabel OTG dari smartphone Android di Kodular:

1. **Gunakan Ekstensi Flasher**:
   - Gunakan ekstensi AVR Flasher untuk Kodular/App Inventor (seperti `ArduinoFlasher.aix` atau `Physicaloid.aix`).
   - *Catatan:* Ekstensi komunikasi serial standar (`com.SerialOTG.aix`) hanya untuk membaca/mengirim teks serial (UART), bukan untuk memprogram bootloader.
2. **Sesuaikan Baud Rate Sesuai Board Target**:
   - **Arduino Uno & Nano (New Bootloader)**: Set baud rate flasher ke **`115200`**.
   - **Arduino Nano (Old Bootloader / CH340)**: Set baud rate flasher ke **`57600`**.
   - **Arduino Mega 2560**: Set baud rate flasher ke **`115200`**.

---

## 💻 Menjalankan Secara Lokal (Development)

### Prasyarat:
1. [Node.js](https://nodejs.org/) versi 18 atau lebih baru.
2. [arduino-cli](https://arduino.github.io/arduino-cli/latest/installation/) terpasang dan dapat diakses dari terminal/CMD.
   ```bash
   arduino-cli core install arduino:avr
   arduino-cli lib install Servo
   ```

### Langkah Instalasi:
```bash
# 1. Clone repository
git clone https://github.com/teukuazharpsh/ArduiBlok.git
cd ArduiBlok

# 2. Install dependencies
npm install

# 3. Jalankan server lokal
npm start
# atau
node server/app.js
```
Akses web aplikasi di browser Anda melalui: `http://localhost:3000`

---

## 🐳 Menjalankan dengan Docker

```bash
# Build Docker Image
docker build -t arduiblok .

# Jalankan Container
docker run -p 3000:3000 arduiblok
```

---

## 📁 Struktur Direktori

```
ArduiBlok/
├── Dockerfile              # Konfigurasi container Linux + arduino-cli untuk Railway
├── .dockerignore           # Filter file untuk build container
├── .gitignore              # Filter file untuk git repository
├── package.json            # Node.js manifest & dependencies
├── README.md               # Dokumentasi proyek & tombol deploy
├── public/                 # Frontend Web Application
│   ├── index.html          # Halaman utama & layout UI
│   ├── style.css           # Styling, tema terang/gelap, responsive mobile
│   └── blocks/
│       ├── arduino_blocks.js     # Definisi visual blok Blockly (English)
│       └── arduino_generator.js  # Generator kode C++ Arduino (.ino)
├── server/
│   └── app.js              # Express.js backend & endpoint POST /compile
└── temp/                   # Folder temporary kompilasi sketch (.ino & .hex)
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT** — bebas digunakan dan dikembangkan untuk keperluan edukasi maupun robotika.
