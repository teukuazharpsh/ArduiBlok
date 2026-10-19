/**
 * ArduiBlok — 3D Line Follower Robot Model, 5-IR Sensor Array & Physics Engine (public/sim/sim_robot.js)
 * Manages Three.js robot hierarchy, 5 optical sensor probes, downward laser beams,
 * differential drive kinematics, wheel spin, and sensor raycasting.
 */

(function(root) {
  'use strict';

  // Konstanta Fisika & Dimensi Robot
  const WHEELBASE = 0.85; // Jarak antar roda kiri-kanan (meter)
  const WHEEL_RADIUS = 0.22; // Jari-jari roda
  const MAX_SPEED = 4.2; // Kecepatan maksimum robot pada PWM 255 (m/s)
  const SENSOR_FORWARD_OFFSET = 0.68; // Jarak sensor di depan poros roda

  // Posisi 5 Sensor IR relatif terhadap titik tengah poros roda robot
  const SENSOR_OFFSETS = [
    { id: 'S1', label: 'Jauh Kiri', x: -0.32, z: SENSOR_FORWARD_OFFSET },
    { id: 'S2', label: 'Kiri',      x: -0.16, z: SENSOR_FORWARD_OFFSET },
    { id: 'S3', label: 'Tengah',    x:  0.00, z: SENSOR_FORWARD_OFFSET },
    { id: 'S4', label: 'Kanan',     x:  0.16, z: SENSOR_FORWARD_OFFSET },
    { id: 'S5', label: 'Jauh Kanan',x:  0.32, z: SENSOR_FORWARD_OFFSET }
  ];

  class LineFollowerRobot {
    constructor(scene) {
      this.scene = scene;

      // Status Kinematika & Posisi (3D World)
      this.position = { x: 0, y: 0.12, z: 0 };
      this.heading = 0; // Sudut hadap (radian), 0 = ke arah +Z
      this.linearVelocity = 0;
      this.angularVelocity = 0;

      // Input Motor PWM (-255 s/d +255)
      this.motorLeft = 0;
      this.motorRight = 0;

      // Rotasi roda visual
      this.wheelRotationL = 0;
      this.wheelRotationR = 0;

      // Data 5 Sensor IR
      // analog: 0 (lantai putih) s/d 1023 (garis hitam)
      // digital: 0 (putih) atau 1 (hitam)
      this.sensors = SENSOR_OFFSETS.map(s => ({
        id: s.id,
        label: s.label,
        analog: 0,
        digital: 0,
        worldX: 0,
        worldZ: 0
      }));

      // Sensor threshold (garis hitam vs putih)
      this.sensorThreshold = 512;

      // Referensi Mesh Three.js
      this.group = new THREE.Group();
      this.wheelLeftMesh = null;
      this.wheelRightMesh = null;
      this.sensorBeams = [];
      this.sensorLeds = [];

      this.build3DModel();
      if (this.scene) {
        this.scene.add(this.group);
      }
    }

    build3DModel() {
      // ── 1. Chassis PCB Utama ────────────────────────────────
      const pcbShape = new THREE.Shape();
      const halfW = 0.44;
      const frontZ = 0.72;
      const backZ = -0.48;
      const cornerR = 0.08;

      pcbShape.moveTo(-halfW + cornerR, backZ);
      pcbShape.lineTo(halfW - cornerR, backZ);
      pcbShape.quadraticCurveTo(halfW, backZ, halfW, backZ + cornerR);
      pcbShape.lineTo(halfW, frontZ - cornerR * 2);
      pcbShape.quadraticCurveTo(halfW, frontZ, halfW - cornerR * 2, frontZ);
      pcbShape.lineTo(-halfW + cornerR * 2, frontZ);
      pcbShape.quadraticCurveTo(-halfW, frontZ, -halfW, frontZ - cornerR * 2);
      pcbShape.lineTo(-halfW, backZ + cornerR);
      pcbShape.quadraticCurveTo(-halfW, backZ, -halfW + cornerR, backZ);

      const extrudeSettings = { depth: 0.024, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.006, bevelThickness: 0.006 };
      const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, extrudeSettings);
      pcbGeo.rotateX(Math.PI / 2); // Rebahkan ke bidang X-Z

      // Material PCB Biru Gelap / Matte Dark Navy khas Arduino
      const pcbMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.35,
        metalness: 0.25
      });
      const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
      pcbMesh.position.y = 0.12;
      pcbMesh.castShadow = true;
      pcbMesh.receiveShadow = true;
      this.group.add(pcbMesh);

      // Jalur Silkscreen Emas / Tembaga di PCB
      const silkscreenGeo = new THREE.BoxGeometry(0.68, 0.002, 0.90);
      const silkscreenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 });
      const silkscreenMesh = new THREE.Mesh(silkscreenGeo, silkscreenMat);
      silkscreenMesh.position.set(0, 0.135, 0.12);
      this.group.add(silkscreenMesh);

      // ── 2. Komponen Elektronik di Atas Chassis ───────────────
      // Modul Mikrokontroler Arduino
      const mcuGeo = new THREE.BoxGeometry(0.28, 0.035, 0.42);
      const mcuMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.4 });
      const mcuMesh = new THREE.Mesh(mcuGeo, mcuMat);
      mcuMesh.position.set(0, 0.155, 0.08);
      mcuMesh.castShadow = true;
      this.group.add(mcuMesh);

      // Chip IC Utama
      const chipGeo = new THREE.BoxGeometry(0.12, 0.015, 0.12);
      const chipMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2, metalness: 0.8 });
      const chipMesh = new THREE.Mesh(chipGeo, chipMat);
      chipMesh.position.set(0, 0.18, 0.08);
      this.group.add(chipMesh);

      // Baterai LiPo (Hitam / Kuning di bagian belakang)
      const batteryGeo = new THREE.BoxGeometry(0.50, 0.065, 0.28);
      const batteryMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6 });
      const batteryMesh = new THREE.Mesh(batteryGeo, batteryMat);
      batteryMesh.position.set(0, 0.17, -0.26);
      batteryMesh.castShadow = true;
      this.group.add(batteryMesh);

      // Strip Kuning Label Baterai
      const batLabelGeo = new THREE.BoxGeometry(0.35, 0.066, 0.08);
      const batLabelMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
      const batLabelMesh = new THREE.Mesh(batLabelGeo, batLabelMat);
      batLabelMesh.position.set(0, 0.171, -0.26);
      this.group.add(batLabelMesh);

      // Tombol Switch Power & LED Power ON
      const switchGeo = new THREE.BoxGeometry(0.06, 0.03, 0.04);
      const switchMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6 });
      const switchMesh = new THREE.Mesh(switchGeo, switchMat);
      switchMesh.position.set(0.32, 0.15, -0.40);
      this.group.add(switchMesh);

      // LED Power Hijau Menyala
      const pwrLedGeo = new THREE.SphereGeometry(0.018, 12, 12);
      const pwrLedMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const pwrLedMesh = new THREE.Mesh(pwrLedGeo, pwrLedMat);
      pwrLedMesh.position.set(0.24, 0.145, -0.40);
      this.group.add(pwrLedMesh);

      // ── 3. Roda Penggerak Kiri & Kanan ────────────────────────
      const wheelGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.075, 24);
      wheelGeo.rotateZ(Math.PI / 2); // Orientasikan horizontal

      // Material Ban Karet Hitam
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9, metalness: 0.1 });
      // Material Velg Roda (Neon Cyan / Biru Balap)
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 });

      // Roda Kiri
      this.wheelLeftMesh = new THREE.Group();
      const tireL = new THREE.Mesh(wheelGeo, tireMat);
      tireL.castShadow = true;
      this.wheelLeftMesh.add(tireL);
      const rimGeo = new THREE.CylinderGeometry(WHEEL_RADIUS * 0.65, WHEEL_RADIUS * 0.65, 0.077, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rimL = new THREE.Mesh(rimGeo, rimMat);
      this.wheelLeftMesh.add(rimL);
      this.wheelLeftMesh.position.set(-(WHEELBASE / 2), WHEEL_RADIUS, 0);
      this.group.add(this.wheelLeftMesh);

      // Roda Kanan
      this.wheelRightMesh = new THREE.Group();
      const tireR = new THREE.Mesh(wheelGeo, tireMat);
      tireR.castShadow = true;
      this.wheelRightMesh.add(tireR);
      const rimR = new THREE.Mesh(rimGeo, rimMat);
      this.wheelRightMesh.add(rimR);
      this.wheelRightMesh.position.set(WHEELBASE / 2, WHEEL_RADIUS, 0);
      this.group.add(this.wheelRightMesh);

      // ── 4. Caster Ball (Roda Bebas Depan & Belakang) ──────────
      const casterGeo = new THREE.SphereGeometry(0.065, 16, 16);
      const casterMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
      const casterBack = new THREE.Mesh(casterGeo, casterMat);
      casterBack.position.set(0, 0.065, -0.38);
      casterBack.castShadow = true;
      this.group.add(casterBack);

      // ── 5. Barisan 5 Sensor Inframerah (S1, S2, S3, S4, S5) ───
      this.sensorBeams = [];
      this.sensorLeds = [];

      SENSOR_OFFSETS.forEach((s) => {
        const sensorHolder = new THREE.Group();
        sensorHolder.position.set(s.x, 0.10, s.z);

        // Body Sensor Module IR
        const sensorBodyGeo = new THREE.BoxGeometry(0.05, 0.04, 0.05);
        const sensorBodyMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.5 });
        const sensorBody = new THREE.Mesh(sensorBodyGeo, sensorBodyMat);
        sensorHolder.add(sensorBody);

        // Sepasang Dioda IR (Transmitter & Receiver) di bawah
        const diodeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.025, 10);
        const diodeMatTx = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2 });
        const diodeMatRx = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1 });

        const diodeTx = new THREE.Mesh(diodeGeo, diodeMatTx);
        diodeTx.position.set(-0.014, -0.02, 0);
        sensorHolder.add(diodeTx);

        const diodeRx = new THREE.Mesh(diodeGeo, diodeMatRx);
        diodeRx.position.set(0.014, -0.02, 0);
        sensorHolder.add(diodeRx);

        // LED Indikator di atas PCB (Menyala merah saat membaca garis)
        const ledGeo = new THREE.SphereGeometry(0.014, 10, 10);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x334155 }); // Awalnya mati
        const ledMesh = new THREE.Mesh(ledGeo, ledMat);
        ledMesh.position.set(0, 0.03, 0);
        sensorHolder.add(ledMesh);
        this.sensorLeds.push(ledMesh);

        // Berkas Sinar Sensor IR Vertikal ke Lantai (Beam Laser)
        const beamGeo = new THREE.CylinderGeometry(0.008, 0.024, 0.10, 8);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.set(0, -0.06, 0);
        sensorHolder.add(beamMesh);
        this.sensorBeams.push(beamMesh);

        this.group.add(sensorHolder);
      });
    }

    /**
     * Setel posisi awal robot di arena
     */
    setPose(x, z, angleRad) {
      this.position.x = x;
      this.position.z = z;
      this.heading = angleRad;
      this.linearVelocity = 0;
      this.angularVelocity = 0;
      this.motorLeft = 0;
      this.motorRight = 0;
      this.updateModelTransform();
    }

    /**
     * Perbarui transformasi 3D mesh Three.js
     */
    updateModelTransform() {
      this.group.position.set(this.position.x, this.position.y, this.position.z);
      this.group.rotation.y = this.heading;
    }

    /**
     * Setel kecepatan motor kiri & kanan (-255 s/d 255)
     */
    setMotors(leftPWM, rightPWM) {
      this.motorLeft = Math.max(-255, Math.min(255, Math.round(leftPWM || 0)));
      this.motorRight = Math.max(-255, Math.min(255, Math.round(rightPWM || 0)));
    }

    /**
     * Langkah simulasi fisika & pembacaan sensor setiap frame delta (dt dalam detik)
     */
    update(dt) {
      if (dt <= 0) return;
      if (dt > 0.1) dt = 0.1; // Batasi delta time saat tab lag/background

      // 1. Konversi PWM ke kecepatan linear masing-masing roda (m/s)
      const vL = (this.motorLeft / 255.0) * MAX_SPEED;
      const vR = (this.motorRight / 255.0) * MAX_SPEED;

      // 2. Kinematika Diferensial Drive
      this.linearVelocity = (vL + vR) / 2.0;
      this.angularVelocity = (vR - vL) / WHEELBASE;

      // 3. Integrasi posisi & orientasi
      this.heading += this.angularVelocity * dt;
      // Normalisasi heading (-PI s/d +PI)
      this.heading = (this.heading + Math.PI * 3) % (Math.PI * 2) - Math.PI;

      // Sumbu gerak: Robot menghadap ke arah +Z lokal
      const dx = this.linearVelocity * Math.sin(this.heading) * dt;
      const dz = this.linearVelocity * Math.cos(this.heading) * dt;

      this.position.x += dx;
      this.position.z += dz;

      // Batasi posisi agar tidak keluar dari arena (20x20 meter)
      const boundary = 9.4;
      this.position.x = Math.max(-boundary, Math.min(boundary, this.position.x));
      this.position.z = Math.max(-boundary, Math.min(boundary, this.position.z));

      // 4. Putar roda visual
      if (this.wheelLeftMesh) {
        this.wheelRotationL += (vL / WHEEL_RADIUS) * dt;
        this.wheelLeftMesh.rotation.x = this.wheelRotationL;
      }
      if (this.wheelRightMesh) {
        this.wheelRotationR += (vR / WHEEL_RADIUS) * dt;
        this.wheelRightMesh.rotation.x = this.wheelRotationR;
      }

      // 5. Update transformasi 3D robot
      this.updateModelTransform();

      // 6. Hitung koordinat dan sampling 5 Sensor IR terhadap tekstur lintasan
      this.updateSensors();
    }

    updateSensors() {
      const cosH = Math.cos(this.heading);
      const sinH = Math.sin(this.heading);

      SENSOR_OFFSETS.forEach((s, idx) => {
        // Transformasi koordinat lokal sensor ke koordinat global 3D world
        // Lokal X adalah samping, Z adalah depan
        const worldX = this.position.x + (s.x * cosH) + (s.z * sinH);
        const worldZ = this.position.z + (-s.x * sinH) + (s.z * cosH);

        // Ambil sampel intensitas garis (0.0 s/d 1.0)
        let intensity = 0;
        if (root.ArduiBlokTracks && typeof root.ArduiBlokTracks.sampleTrack === 'function') {
          intensity = root.ArduiBlokTracks.sampleTrack(worldX, worldZ);
        }

        // Hitung nilai analog (0 - 1023) & digital (0 atau 1)
        const analogVal = Math.round(intensity * 1023);
        const isBlackLine = analogVal >= this.sensorThreshold;
        const digitalVal = isBlackLine ? 1 : 0;

        this.sensors[idx].analog = analogVal;
        this.sensors[idx].digital = digitalVal;
        this.sensors[idx].worldX = worldX;
        this.sensors[idx].worldZ = worldZ;

        // Update visual LED dan Sinar Sensor
        if (this.sensorLeds[idx] && this.sensorBeams[idx]) {
          if (isBlackLine) {
            // Garis Hitam Terdeteksi: LED merah menyala terang & berkas sinar merah
            this.sensorLeds[idx].material.color.setHex(0xef4444);
            this.sensorBeams[idx].material.color.setHex(0xef4444);
            this.sensorBeams[idx].material.opacity = 0.75;
          } else {
            // Lantai Putih: LED mati & sinar cyan lembut
            this.sensorLeds[idx].material.color.setHex(0x334155);
            this.sensorBeams[idx].material.color.setHex(0x38bdf8);
            this.sensorBeams[idx].material.opacity = 0.22;
          }
        }
      });
    }

    getTelemetry() {
      return {
        x: Number(this.position.x.toFixed(2)),
        z: Number(this.position.z.toFixed(2)),
        headingDeg: Math.round((this.heading * 180) / Math.PI),
        speed: Number(this.linearVelocity.toFixed(2)),
        motorLeft: this.motorLeft,
        motorRight: this.motorRight,
        sensors: this.sensors.map(s => ({
          id: s.id,
          label: s.label,
          analog: s.analog,
          digital: s.digital
        }))
      };
    }
  }

  root.ArduiBlokRobot = {
    LineFollowerRobot,
    SENSOR_OFFSETS
  };

})(typeof window !== 'undefined' ? window : this);
