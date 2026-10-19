/**
 * ArduiBlok — 3D Line Follower Track & Arena Generator (public/sim/sim_tracks.js)
 * Generates dynamic high-res track canvases, ground textures, and provides precise
 * raycast/pixel sampling for 5-IR sensors and lap timing checkpoints.
 */

(function(root) {
  'use strict';

  const ARENA_SIZE = 20; // 20x20 meter di world unit Three.js
  const CANVAS_RES = 2048; // Resolusi tekstur kanvas 2048x2048 piksel
  const LINE_WIDTH_WORLD = 0.35; // Lebar garis hitam ~35 cm
  const LINE_WIDTH_PX = Math.round((LINE_WIDTH_WORLD / ARENA_SIZE) * CANVAS_RES);

  // Cache kanvas aktif & data piksel
  let trackCanvas = null;
  let trackCtx = null;
  let trackImageData = null;
  let currentTrackId = 'oval';

  // Daftar Definisi Lintasan
  const TRACK_DEFINITIONS = {
    oval: {
      name: 'Lintasan 1: Oval Pemula',
      description: 'Jalur elips mulus untuk uji kecepatan dasar dan kalibrasi sensor.',
      startPose: { x: 0, z: 6.2, angle: 0 },
      checkpoints: [
        { x: 0, z: 6.2, radius: 1.5, index: 0, isStartFinish: true },
        { x: 6.5, z: 0, radius: 2.0, index: 1 },
        { x: 0, z: -6.2, radius: 1.5, index: 2 },
        { x: -6.5, z: 0, radius: 2.0, index: 3 }
      ],
      draw: function(ctx, w, h) {
        const cx = w / 2;
        const cy = h / 2;
        const rx = w * 0.36;
        const ry = h * 0.31;

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Garis start / finish kotak-kotak
        drawStartFinishLine(ctx, cx, cy + ry, LINE_WIDTH_PX * 2.2, true);
      }
    },

    figure8: {
      name: 'Lintasan 2: Angka 8 (S-Turn)',
      description: 'Dua kurva bergantian kiri dan kanan untuk menguji transisi PID.',
      startPose: { x: 0, z: 6.8, angle: 0 },
      checkpoints: [
        { x: 0, z: 6.8, radius: 1.5, index: 0, isStartFinish: true },
        { x: 4.5, z: 4.0, radius: 2.0, index: 1 },
        { x: 0, z: 0, radius: 1.8, index: 2 },
        { x: -4.5, z: -4.0, radius: 2.0, index: 3 },
        { x: 0, z: -6.8, radius: 1.8, index: 4 }
      ],
      draw: function(ctx, w, h) {
        const cx = w / 2;
        const cy = h / 2;
        const r = w * 0.19;

        // Lingkaran bawah
        ctx.beginPath();
        ctx.arc(cx, cy + r * 1.05, r, -Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();

        // Lingkaran atas
        ctx.beginPath();
        ctx.arc(cx, cy - r * 1.05, r, Math.PI / 2, Math.PI * 2.5);
        ctx.stroke();

        drawStartFinishLine(ctx, cx, cy + r * 2.05, LINE_WIDTH_PX * 2.2, true);
      }
    },

    sharp90: {
      name: 'Lintasan 3: Siku 90° & Zig-Zag',
      description: 'Tikungan patah tajam 90 derajat untuk menguji sensor tepi S1 dan S5.',
      startPose: { x: -6.0, z: 6.0, angle: 0 },
      checkpoints: [
        { x: -6.0, z: 6.0, radius: 1.5, index: 0, isStartFinish: true },
        { x: 6.0, z: 6.0, radius: 1.8, index: 1 },
        { x: 6.0, z: 0, radius: 1.8, index: 2 },
        { x: 0, z: 0, radius: 1.8, index: 3 },
        { x: 0, z: -6.0, radius: 1.8, index: 4 },
        { x: -6.0, z: -6.0, radius: 1.8, index: 5 }
      ],
      draw: function(ctx, w, h) {
        // Koordinat normalized (-0.5 to 0.5)
        const pts = [
          [-0.32, 0.32],
          [0.32, 0.32],
          [0.32, 0.05],
          [0.05, 0.05],
          [0.05, -0.32],
          [-0.32, -0.32],
          [-0.32, 0.32]
        ];

        ctx.beginPath();
        pts.forEach((pt, idx) => {
          const x = (pt[0] + 0.5) * w;
          const y = (pt[1] + 0.5) * h;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        drawStartFinishLine(ctx, (pts[0][0] + 0.5) * w + 100, (pts[0][1] + 0.5) * h, LINE_WIDTH_PX * 2.2, true);
      }
    },

    competition: {
      name: 'Lintasan 4: Arena Lomba Nasional',
      description: 'Kombinasi kurva spiral, perempatan silang, sudut 90°, dan garis putus-putus.',
      startPose: { x: -6.5, z: 5.5, angle: 0 },
      checkpoints: [
        { x: -6.5, z: 5.5, radius: 1.5, index: 0, isStartFinish: true },
        { x: 5.0, z: 5.5, radius: 2.0, index: 1 },
        { x: 5.0, z: -1.0, radius: 2.0, index: 2 },
        { x: -1.0, z: -1.0, radius: 1.8, index: 3 },
        { x: -1.0, z: -6.0, radius: 2.0, index: 4 },
        { x: 6.0, z: -6.0, radius: 2.0, index: 5 },
        { x: -6.5, z: 0.0, radius: 2.0, index: 6 }
      ],
      draw: function(ctx, w, h) {
        // Jalur kompleks
        ctx.beginPath();
        // Start straight
        ctx.moveTo(w * 0.17, h * 0.77);
        ctx.lineTo(w * 0.75, h * 0.77);
        // Belok 90 ke atas
        ctx.arcTo(w * 0.85, h * 0.77, w * 0.85, h * 0.65, 80);
        ctx.lineTo(w * 0.85, h * 0.45);
        // Kurva halus ke tengah
        ctx.bezierCurveTo(w * 0.85, h * 0.35, w * 0.65, h * 0.45, w * 0.5, h * 0.45);
        ctx.lineTo(w * 0.35, h * 0.45);
        // Turun ke atas
        ctx.lineTo(w * 0.35, h * 0.20);
        // Loop atas
        ctx.bezierCurveTo(w * 0.35, h * 0.12, w * 0.85, h * 0.12, w * 0.85, h * 0.25);
        ctx.lineTo(w * 0.70, h * 0.35);
        // Kembali ke kiri
        ctx.bezierCurveTo(w * 0.45, h * 0.35, w * 0.15, h * 0.25, w * 0.15, h * 0.50);
        ctx.lineTo(w * 0.17, h * 0.77);
        ctx.stroke();

        // Cross intersection
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.35);
        ctx.lineTo(w * 0.5, h * 0.55);
        ctx.stroke();

        drawStartFinishLine(ctx, w * 0.25, h * 0.77, LINE_WIDTH_PX * 2.2, true);
      }
    }
  };

  function drawStartFinishLine(ctx, x, y, width, isHorizontal) {
    ctx.save();
    const rows = 2;
    const cols = 8;
    const cellW = width / cols;
    const cellH = 14;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - width / 2 - 4, y - cellH - 4, width + 8, cellH * 2 + 8);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isBlack = (r + c) % 2 === 0;
        ctx.fillStyle = isBlack ? '#000000' : '#ffffff';
        ctx.fillRect(
          x - width / 2 + c * cellW,
          y - cellH + r * cellH,
          cellW,
          cellH
        );
      }
    }

    // Teks START / FINISH
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH / START', x, y - cellH - 12);
    ctx.restore();
  }

  // ── Inisialisasi & Generate Tekstur Kanvas ────────────────────
  function createTrackCanvas(trackId = 'oval') {
    if (!trackCanvas) {
      trackCanvas = document.createElement('canvas');
      trackCanvas.width = CANVAS_RES;
      trackCanvas.height = CANVAS_RES;
      trackCtx = trackCanvas.getContext('2d', { willReadFrequently: true });
    }

    currentTrackId = TRACK_DEFINITIONS[trackId] ? trackId : 'oval';
    const def = TRACK_DEFINITIONS[currentTrackId];

    const w = CANVAS_RES;
    const h = CANVAS_RES;

    // 1. Bersihkan latar belakang (Lantai vinyl putih arena kompetisi)
    trackCtx.fillStyle = '#f8fafc';
    trackCtx.fillRect(0, 0, w, h);

    // 2. Gambar grid teknis tipis & border pembatas arena
    trackCtx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    trackCtx.lineWidth = 2;
    const gridStep = w / 20; // 1 meter per kotak
    for (let i = 0; i <= w; i += gridStep) {
      trackCtx.beginPath();
      trackCtx.moveTo(i, 0);
      trackCtx.lineTo(i, h);
      trackCtx.stroke();

      trackCtx.beginPath();
      trackCtx.moveTo(0, i);
      trackCtx.lineTo(w, i);
      trackCtx.stroke();
    }

    // Garis batas luar arena (merah neon tipis)
    trackCtx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    trackCtx.lineWidth = 10;
    trackCtx.strokeRect(40, 40, w - 80, h - 80);

    // Titik tengah arena
    trackCtx.fillStyle = 'rgba(99, 102, 241, 0.4)';
    trackCtx.beginPath();
    trackCtx.arc(w / 2, h / 2, 16, 0, Math.PI * 2);
    trackCtx.fill();

    // 3. Gambar Garis Hitam Utama
    trackCtx.strokeStyle = '#050505'; // Hitam pekat isolasi listrik / tape
    trackCtx.lineWidth = LINE_WIDTH_PX;
    trackCtx.lineCap = 'round';
    trackCtx.lineJoin = 'round';

    def.draw(trackCtx, w, h);

    // 4. Cache raw ImageData untuk sampling piksel sensor cepat
    trackImageData = trackCtx.getImageData(0, 0, w, h);

    return {
      canvas: trackCanvas,
      definition: def,
      arenaSize: ARENA_SIZE
    };
  }

  /**
   * Sample intensitas garis pada koordinat 3D World (x, z) dengan multi-point Gaussian Kernel.
   * Mensimulasikan bukaan lensa optik IR (TCRT5000 / QRE1113) berdiameter ~5 mm.
   * Nilai balik:
   * 0.0 = Lantai putih bersih
   * 1.0 = Tepat di atas garis hitam pekat
   * 0.0 - 1.0 = Gradien transisi kurva analog mulus (Continuous Sigmoid Response)
   */
  function sampleTrack(worldX, worldZ) {
    if (!trackImageData) return 0;

    const u = (worldX / ARENA_SIZE) + 0.5;
    const v = (worldZ / ARENA_SIZE) + 0.5;

    if (u < 0 || u > 1 || v < 0 || v > 1) {
      return 0; // Di luar batas arena
    }

    const cx = Math.floor(u * CANVAS_RES);
    const cy = Math.floor(v * CANVAS_RES);

    // 9-Point Gaussian Disk Sampling (Pusat, Kardinal, dan Diagonal)
    // Offset ~3-5 piksel (~4-6 mm skala lintasan nyata)
    const offsets = [
      { dx:  0, dy:  0, w: 0.28 },
      { dx: -3, dy:  0, w: 0.12 },
      { dx:  3, dy:  0, w: 0.12 },
      { dx:  0, dy: -3, w: 0.12 },
      { dx:  0, dy:  3, w: 0.12 },
      { dx: -3, dy: -3, w: 0.06 },
      { dx:  3, dy: -3, w: 0.06 },
      { dx: -3, dy:  3, w: 0.06 },
      { dx:  3, dy:  3, w: 0.06 }
    ];

    let totalWeightedIntensity = 0;
    let totalWeight = 0;

    for (let i = 0; i < offsets.length; i++) {
      const px = cx + offsets[i].dx;
      const py = cy + offsets[i].dy;

      if (px >= 0 && px < CANVAS_RES && py >= 0 && py < CANVAS_RES) {
        const idx = (py * CANVAS_RES + px) * 4;
        const r = trackImageData.data[idx];
        const g = trackImageData.data[idx + 1];
        const b = trackImageData.data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b; // 0..255
        const intensity = 1.0 - (lum / 255.0); // 0 (putih) s/d 1 (hitam)
        totalWeightedIntensity += intensity * offsets[i].w;
        totalWeight += offsets[i].w;
      }
    }

    if (totalWeight === 0) return 0;
    const avgIntensity = totalWeightedIntensity / totalWeight;

    // Smoothstep kurva sigmoid respons optik fotodioda
    // Memberikan transisi analog kontinu yang sangat halus tanpa step kasar
    const edge0 = 0.15;
    const edge1 = 0.85;
    const t = Math.max(0, Math.min(1, (avgIntensity - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function getTrackList() {
    return Object.keys(TRACK_DEFINITIONS).map(key => ({
      id: key,
      name: TRACK_DEFINITIONS[key].name,
      description: TRACK_DEFINITIONS[key].description
    }));
  }

  function getStartPose(trackId) {
    const def = TRACK_DEFINITIONS[trackId] || TRACK_DEFINITIONS.oval;
    return Object.assign({}, def.startPose);
  }

  function getCheckpoints(trackId) {
    const def = TRACK_DEFINITIONS[trackId] || TRACK_DEFINITIONS.oval;
    return (def.checkpoints || []).map(cp => Object.assign({}, cp));
  }

  // Export module ke namespace global
  root.ArduiBlokTracks = {
    ARENA_SIZE,
    CANVAS_RES,
    createTrackCanvas,
    sampleTrack,
    getTrackList,
    getStartPose,
    getCheckpoints,
    getCurrentTrackId: () => currentTrackId
  };

})(typeof window !== 'undefined' ? window : this);
