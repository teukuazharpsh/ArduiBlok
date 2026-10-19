/**
 * ArduiBlok — 3D Line Follower Simulation Engine (public/sim/sim_engine.js)
 * Coordinates Three.js render loop, camera presets, track textures, robot physics,
 * built-in control algorithms (PID / State Machine / Bang-Bang), and lap timer.
 */

(function(root) {
  'use strict';

  let scene, camera, renderer, controls;
  let floorMesh = null;
  let robot = null;
  let isRunning = false;
  let simSpeed = 1.0; // 1x, 2x, 4x
  let currentCameraMode = 'follow'; // 'follow', 'orbit', 'fpv', 'top'

  // Waktu & Loop
  let lastFrameTime = performance.now();
  let lapStartTime = 0;
  let currentLapTime = 0;
  let bestLapTime = null;
  let lapCount = 0;
  let nextCheckpointIdx = 0;
  let currentCheckpoints = [];

  // Parameter Algoritma Kontrol Robot
  const ALGORITHMS = {
    pid: {
      id: 'pid',
      name: 'PID Controller 5-Sensor (Cepat & Mulus)',
      description: 'Menghitung bobot error posisi garis untuk koreksi kecepatan diferensial yang presisi.',
      params: { kp: 32.0, ki: 0.05, kd: 18.0, baseSpeed: 175, maxSpeed: 235 },
      integral: 0,
      lastError: 0,
      reset: function() { this.integral = 0; this.lastError = 0; },
      run: function(sensors, dt) {
        // sensors[0] = S1 (-2), sensors[1] = S2 (-1), sensors[2] = S3 (0), sensors[3] = S4 (+1), sensors[4] = S5 (+2)
        const s1 = sensors[0].digital;
        const s2 = sensors[1].digital;
        const s3 = sensors[2].digital;
        const s4 = sensors[3].digital;
        const s5 = sensors[4].digital;

        let activeCount = s1 + s2 + s3 + s4 + s5;

        // Jika semua sensor putih (lepas garis sejenak), pertahankan belokan terakhir
        if (activeCount === 0) {
          const steer = this.lastError < 0 ? -190 : 190;
          return { left: this.params.baseSpeed - steer, right: this.params.baseSpeed + steer };
        }

        // Hitung weighted error (-2.0 s/d +2.0)
        const weightedSum = (s1 * -2.0) + (s2 * -1.0) + (s3 * 0.0) + (s4 * 1.0) + (s5 * 2.0);
        const error = weightedSum / activeCount;

        // PID Loop
        this.integral += error * dt;
        // Anti-windup
        this.integral = Math.max(-10, Math.min(10, this.integral));
        const derivative = (error - this.lastError) / (dt || 0.016);
        this.lastError = error;

        const correction = (this.params.kp * error) + (this.params.ki * this.integral) + (this.params.kd * derivative);

        // Koreksi motor
        let vL = this.params.baseSpeed + correction;
        let vR = this.params.baseSpeed - correction;

        // Clamp
        vL = Math.max(-100, Math.min(this.params.maxSpeed, Math.round(vL)));
        vR = Math.max(-100, Math.min(this.params.maxSpeed, Math.round(vR)));

        return { left: vL, right: vR };
      }
    },

    statemachine: {
      id: 'statemachine',
      name: 'State Machine Lomba (Responsif Belok Patah)',
      description: 'Aturan berbasis kondisi sensor biner, sangat tangguh melibas tikungan 90° dan percabangan.',
      params: { forwardSpeed: 190, turnMedium: 140, turnSharp: 210 },
      reset: function() {},
      run: function(sensors) {
        const s = sensors.map(item => item.digital);
        const pattern = s.join('');

        const fwd = this.params.forwardSpeed;
        const med = this.params.turnMedium;
        const shp = this.params.turnSharp;

        // Tengah lurus: [0 0 1 0 0] atau [0 1 1 1 0]
        if (pattern === '00100' || pattern === '01110' || pattern === '01010') {
          return { left: fwd, right: fwd };
        }
        // Agak kiri: [0 1 1 0 0] atau [0 1 0 0 0]
        if (pattern === '01100' || pattern === '01000') {
          return { left: fwd - med, right: fwd + med };
        }
        // Agak kanan: [0 0 1 1 0] atau [0 0 0 1 0]
        if (pattern === '00110' || pattern === '00010') {
          return { left: fwd + med, right: fwd - med };
        }
        // Belok tajam kiri: [1 1 0 0 0] atau [1 0 0 0 0]
        if (pattern.startsWith('1')) {
          return { left: -shp * 0.4, right: shp };
        }
        // Belok tajam kanan: [0 0 0 1 1] atau [0 0 0 0 1]
        if (pattern.endsWith('1')) {
          return { left: shp, right: -shp * 0.4 };
        }
        // Lepas garis: jalan pelan
        return { left: fwd * 0.6, right: fwd * 0.6 };
      }
    },

    bangbang: {
      id: 'bangbang',
      name: 'Bang-Bang Sederhana (Pemula)',
      description: 'Logika dasar 2-kecepatan: jika belok kiri motor kanan maju, dan sebaliknya.',
      params: { speedHigh: 180, speedLow: 40 },
      reset: function() {},
      run: function(sensors) {
        const sL = sensors[0].digital || sensors[1].digital;
        const sR = sensors[3].digital || sensors[4].digital;
        const hi = this.params.speedHigh;
        const lo = this.params.speedLow;

        if (sL && !sR) return { left: lo, right: hi };
        if (sR && !sL) return { left: hi, right: lo };
        return { left: hi, right: hi };
      }
    },

    custom: {
      id: 'custom',
      name: 'Kode Kustom / ArduiBlok Studio',
      description: 'Menjalankan logika program kustom yang dikirim langsung dari editor ArduiBlok.',
      customFn: null,
      reset: function() {},
      run: function(sensors, dt) {
        if (typeof this.customFn === 'function') {
          try {
            const res = this.customFn(sensors, dt);
            if (res && typeof res.left === 'number' && typeof res.right === 'number') {
              return res;
            }
          } catch (e) {
            console.error('[Sim Custom Code Error]:', e);
          }
        }
        // Fallback jika kode kustom belum diatur
        return ALGORITHMS.pid.run(sensors, dt);
      }
    }
  };

  let activeAlgorithm = ALGORITHMS.pid;

  // ── Inisialisasi Scene Three.js ──────────────────────────────
  function initEngine(containerElement) {
    if (!containerElement) return;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.024);

    // 2. Camera
    const aspect = containerElement.clientWidth / containerElement.clientHeight;
    camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 100);
    camera.position.set(0, 7.5, 9.5);

    // 3. Renderer WebGL
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    containerElement.appendChild(renderer.domElement);

    // 4. Orbit Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.maxPolarAngle = Math.PI / 2 - 0.03; // Jangan sampai tembus ke bawah lantai
      controls.minDistance = 1.5;
      controls.maxDistance = 25.0;
    }

    // 5. Pencahayaan Arena Realistis
    setupLighting();

    // 6. Buat Lantai Arena & Tekstur Lintasan
    loadTrack('oval');

    // 7. Buat Model Robot 3D
    robot = new root.ArduiBlokRobot.LineFollowerRobot(scene);
    resetRobot();

    // 8. Event Resize Jendela
    window.addEventListener('resize', () => onWindowResize(containerElement));

    // 9. Mulai Loop Animasi
    lastFrameTime = performance.now();
    requestAnimationFrame(animateLoop);

    return {
      scene,
      camera,
      renderer,
      robot
    };
  }

  function setupLighting() {
    // Cahaya redup ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // Cahaya Utama Atas (Directional Spotlight / Sunlight)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.95);
    sunLight.position.set(8, 16, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    sunLight.shadow.camera.left = -11;
    sunLight.shadow.camera.right = 11;
    sunLight.shadow.camera.top = 11;
    sunLight.shadow.camera.bottom = -11;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // Cahaya Aksen Neon Biru & Cyan di Sudut Arena
    const neonCyan = new THREE.PointLight(0x38bdf8, 0.45, 25);
    neonCyan.position.set(-10, 3, -10);
    scene.add(neonCyan);

    const neonPurple = new THREE.PointLight(0x818cf8, 0.45, 25);
    neonPurple.position.set(10, 3, 10);
    scene.add(neonPurple);
  }

  function loadTrack(trackId) {
    const trackData = root.ArduiBlokTracks.createTrackCanvas(trackId);

    // Tekstur kanvas Three.js
    const trackTexture = new THREE.CanvasTexture(trackData.canvas);
    trackTexture.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;

    if (!floorMesh) {
      const floorGeo = new THREE.PlaneGeometry(trackData.arenaSize, trackData.arenaSize, 1, 1);
      floorGeo.rotateX(-Math.PI / 2); // Rebahkan ke bidang X-Z

      const floorMat = new THREE.MeshStandardMaterial({
        map: trackTexture,
        roughness: 0.28,
        metalness: 0.05
      });
      floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);
    } else {
      floorMesh.material.map = trackTexture;
      floorMesh.material.needsUpdate = true;
    }

    currentCheckpoints = root.ArduiBlokTracks.getCheckpoints(trackId);
    nextCheckpointIdx = 0;

    if (robot) resetRobot();
  }

  function resetRobot() {
    const trackId = root.ArduiBlokTracks.getCurrentTrackId();
    const startPose = root.ArduiBlokTracks.getStartPose(trackId);

    robot.setPose(startPose.x, startPose.z, startPose.angle);
    activeAlgorithm.reset();

    lapStartTime = 0;
    currentLapTime = 0;
    nextCheckpointIdx = 0;

    // Paksa update sensor pertama kali
    robot.update(0.001);
  }

  function setRunning(running) {
    isRunning = !!running;
    if (isRunning && lapStartTime === 0) {
      lapStartTime = performance.now();
    }
  }

  function setSimSpeed(speed) {
    simSpeed = Number(speed) || 1.0;
  }

  function setCameraMode(mode) {
    currentCameraMode = mode;
    if (controls) {
      controls.enabled = (mode === 'orbit');
    }
    if (mode === 'top') {
      camera.position.set(0, 18, 0.01);
      camera.lookAt(0, 0, 0);
    }
  }

  function setAlgorithm(algoId) {
    if (ALGORITHMS[algoId]) {
      activeAlgorithm = ALGORITHMS[algoId];
      activeAlgorithm.reset();
    }
  }

  function setCustomLogic(fn) {
    ALGORITHMS.custom.customFn = fn;
    setAlgorithm('custom');
  }

  // ── Main Simulation & Render Loop ────────────────────────────
  function animateLoop(now) {
    requestAnimationFrame(animateLoop);

    let rawDt = (now - lastFrameTime) / 1000.0;
    lastFrameTime = now;
    if (rawDt > 0.1) rawDt = 0.1;

    // Kalikan dengan speed multiplier (1x, 2x, 4x)
    const effectiveDt = rawDt * simSpeed;

    if (isRunning && robot) {
      // 1. Jalankan algoritma pengontrol (menghitung motor PWM)
      const motorOutput = activeAlgorithm.run(robot.sensors, effectiveDt);
      robot.setMotors(motorOutput.left, motorOutput.right);

      // 2. Jalankan fisika gerak robot
      robot.update(effectiveDt);

      // 3. Update Lap Timer & Checkpoints
      updateLapTiming(now);
    }

    // 4. Update Kamera
    updateCameraFollow();

    if (controls && controls.enabled) {
      controls.update();
    }

    // 5. Render Scene
    renderer.render(scene, camera);

    // 6. Callback Telemetri ke UI
    if (typeof root.onSimTelemetryUpdate === 'function') {
      const telemetry = robot ? robot.getTelemetry() : {};
      telemetry.isRunning = isRunning;
      telemetry.currentLapTime = currentLapTime;
      telemetry.bestLapTime = bestLapTime;
      telemetry.lapCount = lapCount;
      telemetry.activeAlgorithm = activeAlgorithm.name;
      root.onSimTelemetryUpdate(telemetry);
    }
  }

  function updateCameraFollow() {
    if (!robot) return;

    if (currentCameraMode === 'follow') {
      // Kamera mengikuti di belakang robot secara halus
      const distBehind = 2.4;
      const heightAbove = 1.35;
      const sinH = Math.sin(robot.heading);
      const cosH = Math.cos(robot.heading);

      const targetCamX = robot.position.x - (sinH * distBehind);
      const targetCamZ = robot.position.z - (cosH * distBehind);
      const targetCamY = robot.position.y + heightAbove;

      camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.12);

      const lookTarget = new THREE.Vector3(
        robot.position.x + (sinH * 1.5),
        robot.position.y + 0.2,
        robot.position.z + (cosH * 1.5)
      );
      camera.lookAt(lookTarget);
    } else if (currentCameraMode === 'fpv') {
      // Kamera tepat di moncong depan robot
      const sinH = Math.sin(robot.heading);
      const cosH = Math.cos(robot.heading);

      camera.position.set(
        robot.position.x + (sinH * 0.4),
        robot.position.y + 0.22,
        robot.position.z + (cosH * 0.4)
      );
      camera.lookAt(
        robot.position.x + (sinH * 4.0),
        0.05,
        robot.position.z + (cosH * 4.0)
      );
    } else if (currentCameraMode === 'top') {
      camera.lookAt(0, 0, 0);
    }
  }

  function updateLapTiming(now) {
    if (lapStartTime > 0) {
      currentLapTime = (now - lapStartTime) / 1000.0;
    }

    if (!currentCheckpoints || currentCheckpoints.length === 0) return;

    const targetCp = currentCheckpoints[nextCheckpointIdx];
    const dx = robot.position.x - targetCp.x;
    const dz = robot.position.z - targetCp.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < targetCp.radius * targetCp.radius) {
      if (targetCp.isStartFinish && nextCheckpointIdx === currentCheckpoints.length - 1) {
        // Lap Selesai!
        lapCount++;
        if (bestLapTime === null || currentLapTime < bestLapTime) {
          bestLapTime = currentLapTime;
        }
        lapStartTime = now;
        currentLapTime = 0;
        nextCheckpointIdx = 1; // Kembali ke checkpoint pertama setelah start
      } else {
        // Melalui checkpoint berikutnya
        nextCheckpointIdx = (nextCheckpointIdx + 1) % currentCheckpoints.length;
      }
    }
  }

  function onWindowResize(container) {
    if (!renderer || !camera || !container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  // Export engine
  root.ArduiBlokSimEngine = {
    init: initEngine,
    loadTrack,
    resetRobot,
    setRunning,
    setSimSpeed,
    setCameraMode,
    setAlgorithm,
    setCustomLogic,
    getAlgorithms: () => Object.keys(ALGORITHMS).map(k => ({ id: k, name: ALGORITHMS[k].name, description: ALGORITHMS[k].description, params: ALGORITHMS[k].params })),
    isRunning: () => isRunning,
    getRobot: () => robot
  };

})(typeof window !== 'undefined' ? window : this);
