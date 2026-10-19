/**
 * ArduiBlok — 3D Line Follower Robot Model, Dynamic Physical Parameters & Advanced Kinematics (public/sim/sim_robot.js)
 * Features:
 * - Dynamic customizable physical specs: Mass, Length, Width/Wheelbase, Wheel Diameter, Sensor Distance & Spacing.
 * - Realistic differential physics with motor slew-rate, rotational inertia (moment of inertia),
 *   lateral friction, and electronic low-pass filtered 5-IR sensors.
 */

(function(root) {
  'use strict';

  // Nilai Standar Parameter Fisik (Default Specs)
  const DEFAULT_PARAMS = {
    mass: 0.65,          // Berat robot (kg) [0.2 s/d 2.0]
    length: 0.18,        // Panjang chassis (meter) [0.12 s/d 0.28]
    wheelbase: 0.14,     // Lebar / Jarak roda kiri-kanan (meter) [0.10 s/d 0.24]
    wheelDiameter: 0.065,// Diameter roda (meter) [0.035 s/d 0.080]
    sensorForward: 0.11, // Jarak sensor di depan poros roda (meter) [0.05 s/d 0.18]
    sensorSpacing: 0.024,// Jarak antar sensor samping (meter) [0.015 s/d 0.040]
    motorResponse: 950,  // Responsivitas motor (PWM/detik) [300 s/d 2000]
    friction: 0.88       // Koefisien traksi lantai [0.5 s/d 1.0]
  };

  // Skala visual di Three.js world unit (1 meter dunia nyata = ~6.0 unit Three.js)
  const WORLD_SCALE = 6.0;

  class LineFollowerRobot {
    constructor(scene) {
      this.scene = scene;

      // Parameter Fisik yang Dapat Disesuaikan Pengguna
      this.params = Object.assign({}, DEFAULT_PARAMS);

      // Status Kinematika & Posisi (3D World)
      this.position = { x: 0, y: 0.12, z: 0 };
      this.heading = 0; // Radian (0 = ke arah +Z)
      this.linearVelocity = 0;
      this.angularVelocity = 0;

      // Target vs Aktual Kecepatan Motor (Inertia Slew Rate)
      this.targetMotorL = 0;
      this.targetMotorR = 0;
      this.actualMotorL = 0;
      this.actualMotorR = 0;

      // Rotasi roda visual
      this.wheelRotationL = 0;
      this.wheelRotationR = 0;

      // Damping kemiringan chassis saat belok (Chassis lean dynamic)
      this.tiltRoll = 0;

      // Sensor Threshold & Low-Pass Filter
      this.sensorThreshold = 512;

      // Data 5 Sensor IR
      this.sensors = [
        { id: 'S1', label: 'Jauh Kiri', analog: 0, digital: 0, worldX: 0, worldZ: 0 },
        { id: 'S2', label: 'Kiri',      analog: 0, digital: 0, worldX: 0, worldZ: 0 },
        { id: 'S3', label: 'Tengah',    analog: 0, digital: 0, worldX: 0, worldZ: 0 },
        { id: 'S4', label: 'Kanan',     analog: 0, digital: 0, worldX: 0, worldZ: 0 },
        { id: 'S5', label: 'Jauh Kanan',analog: 0, digital: 0, worldX: 0, worldZ: 0 }
      ];

      // Referensi Objek 3D Three.js
      this.group = new THREE.Group();
      this.chassisMesh = null;
      this.wheelLeftMesh = null;
      this.wheelRightMesh = null;
      this.sensorHolders = [];
      this.sensorBeams = [];
      this.sensorLeds = [];

      this.build3DModel();
      if (this.scene) {
        this.scene.add(this.group);
      }
    }

    /**
     * Update parameter fisik robot dan perbarui skala model 3D secara dinamis
     */
    updateParams(newParams) {
      if (!newParams) return;
      Object.assign(this.params, newParams);

      // Perbarui posisi roda dan sensor di scene 3D
      const wbWorld = this.params.wheelbase * WORLD_SCALE;
      const fwdWorld = this.params.sensorForward * WORLD_SCALE;
      const spcWorld = this.params.sensorSpacing * WORLD_SCALE;
      const wRadiusWorld = (this.params.wheelDiameter / 2.0) * WORLD_SCALE;

      if (this.wheelLeftMesh) {
        this.wheelLeftMesh.position.x = -wbWorld / 2;
        this.wheelLeftMesh.position.y = wRadiusWorld;
      }
      if (this.wheelRightMesh) {
        this.wheelRightMesh.position.x = wbWorld / 2;
        this.wheelRightMesh.position.y = wRadiusWorld;
      }

      // Reposisi 5 Sensor IR
      const offsetsX = [-2 * spcWorld, -1 * spcWorld, 0, 1 * spcWorld, 2 * spcWorld];
      this.sensorHolders.forEach((holder, idx) => {
        if (holder) {
          holder.position.x = offsetsX[idx];
          holder.position.z = fwdWorld;
        }
      });
    }

    build3DModel() {
      // Bersihkan grup jika membangun ulang
      while (this.group.children.length > 0) {
        this.group.remove(this.group.children[0]);
      }
      this.sensorHolders = [];
      this.sensorBeams = [];
      this.sensorLeds = [];

      const wbWorld = this.params.wheelbase * WORLD_SCALE;
      const lenWorld = this.params.length * WORLD_SCALE;
      const wRadiusWorld = (this.params.wheelDiameter / 2.0) * WORLD_SCALE;
      const fwdWorld = this.params.sensorForward * WORLD_SCALE;
      const spcWorld = this.params.sensorSpacing * WORLD_SCALE;

      // ── 1. Chassis PCB Utama ────────────────────────────────
      const halfW = (wbWorld * 0.85) / 2;
      const frontZ = lenWorld * 0.62;
      const backZ = -lenWorld * 0.42;

      const pcbShape = new THREE.Shape();
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
      pcbGeo.rotateX(Math.PI / 2);

      const pcbMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.3 });
      this.chassisMesh = new THREE.Mesh(pcbGeo, pcbMat);
      this.chassisMesh.position.y = wRadiusWorld * 0.55;
      this.chassisMesh.castShadow = true;
      this.chassisMesh.receiveShadow = true;
      this.group.add(this.chassisMesh);

      // Jalur Silkscreen Sirkuit Biru Neon
      const silkscreenGeo = new THREE.BoxGeometry(halfW * 1.6, 0.002, lenWorld * 0.85);
      const silkscreenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
      const silkscreenMesh = new THREE.Mesh(silkscreenGeo, silkscreenMat);
      silkscreenMesh.position.set(0, wRadiusWorld * 0.55 + 0.015, (frontZ + backZ) / 2);
      this.group.add(silkscreenMesh);

      // Mikrokontroler Arduino & IC
      const mcuGeo = new THREE.BoxGeometry(halfW * 0.75, 0.035, lenWorld * 0.35);
      const mcuMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.4 });
      const mcuMesh = new THREE.Mesh(mcuGeo, mcuMat);
      mcuMesh.position.set(0, wRadiusWorld * 0.55 + 0.035, 0.05);
      mcuMesh.castShadow = true;
      this.group.add(mcuMesh);

      // IC Processor
      const chipGeo = new THREE.BoxGeometry(0.12, 0.015, 0.12);
      const chipMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2, metalness: 0.8 });
      const chipMesh = new THREE.Mesh(chipGeo, chipMat);
      chipMesh.position.set(0, wRadiusWorld * 0.55 + 0.06, 0.05);
      this.group.add(chipMesh);

      // Baterai LiPo Belakang
      const batteryGeo = new THREE.BoxGeometry(halfW * 1.3, 0.07, lenWorld * 0.28);
      const batteryMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.7 });
      const batteryMesh = new THREE.Mesh(batteryGeo, batteryMat);
      batteryMesh.position.set(0, wRadiusWorld * 0.55 + 0.05, backZ + 0.18);
      batteryMesh.castShadow = true;
      this.group.add(batteryMesh);

      // ── 2. Sepasang Roda Penggerak Kiri & Kanan ───────────────
      const wheelGeo = new THREE.CylinderGeometry(wRadiusWorld, wRadiusWorld, 0.08, 24);
      wheelGeo.rotateZ(Math.PI / 2);
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 });

      // Roda Kiri
      this.wheelLeftMesh = new THREE.Group();
      const tireL = new THREE.Mesh(wheelGeo, tireMat);
      tireL.castShadow = true;
      this.wheelLeftMesh.add(tireL);
      const rimGeo = new THREE.CylinderGeometry(wRadiusWorld * 0.65, wRadiusWorld * 0.65, 0.082, 16);
      rimGeo.rotateZ(Math.PI / 2);
      this.wheelLeftMesh.add(new THREE.Mesh(rimGeo, rimMat));
      this.wheelLeftMesh.position.set(-wbWorld / 2, wRadiusWorld, 0);
      this.group.add(this.wheelLeftMesh);

      // Roda Kanan
      this.wheelRightMesh = new THREE.Group();
      const tireR = new THREE.Mesh(wheelGeo, tireMat);
      tireR.castShadow = true;
      this.wheelRightMesh.add(tireR);
      this.wheelRightMesh.add(new THREE.Mesh(rimGeo, rimMat));
      this.wheelRightMesh.position.set(wbWorld / 2, wRadiusWorld, 0);
      this.group.add(this.wheelRightMesh);

      // Caster Ball Belakang
      const casterGeo = new THREE.SphereGeometry(wRadiusWorld * 0.32, 16, 16);
      const casterMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
      const casterBack = new THREE.Mesh(casterGeo, casterMat);
      casterBack.position.set(0, wRadiusWorld * 0.32, backZ + 0.06);
      casterBack.castShadow = true;
      this.group.add(casterBack);

      // ── 3. Array 5 Sensor IR di Moncong Depan ─────────────────
      const offsetsX = [-2 * spcWorld, -1 * spcWorld, 0, 1 * spcWorld, 2 * spcWorld];

      offsetsX.forEach((offX) => {
        const sensorHolder = new THREE.Group();
        sensorHolder.position.set(offX, wRadiusWorld * 0.45, fwdWorld);

        // Body sensor module
        const sBodyGeo = new THREE.BoxGeometry(0.045, 0.035, 0.045);
        const sBodyMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.5 });
        sensorHolder.add(new THREE.Mesh(sBodyGeo, sBodyMat));

        // Dioda IR Tx & Rx
        const diodeGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.022, 10);
        const diodeTx = new THREE.Mesh(diodeGeo, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2 }));
        diodeTx.position.set(-0.012, -0.016, 0);
        sensorHolder.add(diodeTx);
        const diodeRx = new THREE.Mesh(diodeGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1 }));
        diodeRx.position.set(0.012, -0.016, 0);
        sensorHolder.add(diodeRx);

        // LED Indikator Status di Atas
        const ledGeo = new THREE.SphereGeometry(0.013, 10, 10);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
        const ledMesh = new THREE.Mesh(ledGeo, ledMat);
        ledMesh.position.set(0, 0.025, 0);
        sensorHolder.add(ledMesh);
        this.sensorLeds.push(ledMesh);

        // Berkas Sinar Laser Sensor Vertikal ke Lantai
        const beamGeo = new THREE.CylinderGeometry(0.007, 0.022, wRadiusWorld * 0.45, 8);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.25,
          blending: THREE.AdditiveBlending
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.set(0, -(wRadiusWorld * 0.22), 0);
        sensorHolder.add(beamMesh);
        this.sensorBeams.push(beamMesh);

        this.sensorHolders.push(sensorHolder);
        this.group.add(sensorHolder);
      });
    }

    setPose(x, z, angleRad) {
      this.position.x = x;
      this.position.z = z;
      this.heading = angleRad;
      this.linearVelocity = 0;
      this.angularVelocity = 0;
      this.targetMotorL = 0;
      this.targetMotorR = 0;
      this.actualMotorL = 0;
      this.actualMotorR = 0;
      this.tiltRoll = 0;
      this.updateModelTransform();
    }

    updateModelTransform() {
      this.group.position.set(this.position.x, this.position.y, this.position.z);
      this.group.rotation.y = this.heading;
      this.group.rotation.z = this.tiltRoll; // Miring dinamis saat belok
    }

    setMotors(leftPWM, rightPWM) {
      this.targetMotorL = Math.max(-255, Math.min(255, Math.round(leftPWM || 0)));
      this.targetMotorR = Math.max(-255, Math.min(255, Math.round(rightPWM || 0)));
    }

    /**
     * Kinematika Diferensial Tingkat Lanjut dengan Motor Ramp & Inersia Massa
     */
    update(dt) {
      if (dt <= 0) return;
      if (dt > 0.1) dt = 0.1;

      // 1. Motor Acceleration Slew Rate (Mencegah lonjakan akselerasi kasar)
      // Robot berat butuh waktu lebih lama untuk berakselerasi
      const massScale = this.params.mass / DEFAULT_PARAMS.mass;
      const effectiveSlew = (this.params.motorResponse / massScale) * dt;

      const diffL = this.targetMotorL - this.actualMotorL;
      const diffR = this.targetMotorR - this.actualMotorR;
      this.actualMotorL += Math.max(-effectiveSlew, Math.min(effectiveSlew, diffL));
      this.actualMotorR += Math.max(-effectiveSlew, Math.min(effectiveSlew, diffR));

      // 2. Kecepatan Linear Roda Berdasarkan Diameter Roda Fisik
      // Standar PWM 255 pada diameter roda 65mm = ~3.8 m/s
      const maxLinearSpeed = (this.params.wheelDiameter / 0.065) * 3.8;
      const vL = (this.actualMotorL / 255.0) * maxLinearSpeed;
      const vR = (this.actualMotorR / 255.0) * maxLinearSpeed;

      // 3. Kinematika Diferensial Mulus dengan Damping Rotasi
      const wbWorld = this.params.wheelbase * WORLD_SCALE;
      const targetLinearVel = (vL + vR) / 2.0;
      const targetAngularVel = (vR - vL) / wbWorld;

      // Efek inersia rotasi & redaman gesekan roda (mencegah osilasi patah-patah)
      const rotInertiaFactor = Math.min(1.0, (18.0 / massScale) * dt);
      this.angularVelocity += (targetAngularVel - this.angularVelocity) * rotInertiaFactor;

      const linInertiaFactor = Math.min(1.0, (14.0 / massScale) * dt);
      this.linearVelocity += (targetLinearVel - this.linearVelocity) * linInertiaFactor;

      // Kemiringan sasis dinamis saat menikung
      this.tiltRoll += (-this.angularVelocity * 0.045 - this.tiltRoll) * 0.15;

      // 4. Integrasi Posisi & Orientasi
      this.heading += this.angularVelocity * dt;
      this.heading = (this.heading + Math.PI * 3) % (Math.PI * 2) - Math.PI;

      const dx = this.linearVelocity * Math.sin(this.heading) * dt;
      const dz = this.linearVelocity * Math.cos(this.heading) * dt;

      this.position.x += dx;
      this.position.z += dz;

      // Batasi arena
      const boundary = 9.4;
      this.position.x = Math.max(-boundary, Math.min(boundary, this.position.x));
      this.position.z = Math.max(-boundary, Math.min(boundary, this.position.z));

      // 5. Animasi Putaran Roda
      const wRadiusWorld = (this.params.wheelDiameter / 2.0) * WORLD_SCALE;
      if (this.wheelLeftMesh) {
        this.wheelRotationL += (vL / wRadiusWorld) * dt;
        this.wheelLeftMesh.rotation.x = this.wheelRotationL;
      }
      if (this.wheelRightMesh) {
        this.wheelRotationR += (vR / wRadiusWorld) * dt;
        this.wheelRightMesh.rotation.x = this.wheelRotationR;
      }

      this.updateModelTransform();

      // 6. Update 5 Sensor IR dengan Low-Pass Filter
      this.updateSensors(dt);
    }

    updateSensors(dt) {
      const cosH = Math.cos(this.heading);
      const sinH = Math.sin(this.heading);

      const fwdWorld = this.params.sensorForward * WORLD_SCALE;
      const spcWorld = this.params.sensorSpacing * WORLD_SCALE;
      const offsetsX = [-2 * spcWorld, -1 * spcWorld, 0, 1 * spcWorld, 2 * spcWorld];

      offsetsX.forEach((offX, idx) => {
        // Koordinat World Sensor
        const worldX = this.position.x + (offX * cosH) + (fwdWorld * sinH);
        const worldZ = this.position.z + (-offX * sinH) + (fwdWorld * cosH);

        let rawIntensity = 0;
        if (root.ArduiBlokTracks && typeof root.ArduiBlokTracks.sampleTrack === 'function') {
          rawIntensity = root.ArduiBlokTracks.sampleTrack(worldX, worldZ);
        }

        const targetAnalog = Math.round(rawIntensity * 1023);

        // Electronic Low-Pass Filter (LPF) meredam lonjakan noise kasar
        const filterAlpha = Math.min(1.0, 32.0 * dt);
        this.sensors[idx].analog = Math.round(
          this.sensors[idx].analog * (1.0 - filterAlpha) + targetAnalog * filterAlpha
        );

        // Histeresis digital agar tidak berkedip cepat di perbatasan
        const isBlack = this.sensors[idx].analog >= this.sensorThreshold;
        this.sensors[idx].digital = isBlack ? 1 : 0;
        this.sensors[idx].worldX = worldX;
        this.sensors[idx].worldZ = worldZ;

        // Visualisasi LED dan berkas sinar sensor optik
        if (this.sensorLeds[idx] && this.sensorBeams[idx]) {
          const ratio = Math.max(0, Math.min(1, this.sensors[idx].analog / 1023.0));
          if (isBlack) {
            this.sensorLeds[idx].material.color.setRGB(0.94, 0.27 * (1 - ratio), 0.27 * (1 - ratio));
            this.sensorBeams[idx].material.color.setHex(0xef4444);
            this.sensorBeams[idx].material.opacity = 0.35 + ratio * 0.45;
          } else {
            this.sensorLeds[idx].material.color.setHex(0x334155);
            this.sensorBeams[idx].material.color.setHex(0x38bdf8);
            this.sensorBeams[idx].material.opacity = 0.15;
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
        motorLeft: Math.round(this.actualMotorL),
        motorRight: Math.round(this.actualMotorR),
        targetMotorL: this.targetMotorL,
        targetMotorR: this.targetMotorR,
        params: Object.assign({}, this.params),
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
    DEFAULT_PARAMS
  };

})(typeof window !== 'undefined' ? window : this);
