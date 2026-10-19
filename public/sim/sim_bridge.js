/**
 * ArduiBlok — Inter-Tab Bridge for 3D Line Follower Simulator (public/sim/sim_bridge.js)
 * Synchronizes code, commands, and telemetry between ArduiBlok Studio and 3D Simulator.
 */

(function(root) {
  'use strict';

  const CHANNEL_NAME = 'arduiblok_sim_channel';
  let broadcastChannel = null;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {
    console.warn('[SimBridge] BroadcastChannel tidak didukung, menggunakan storage fallback:', e);
  }

  function initBridge(onMessageCallback) {
    if (broadcastChannel) {
      broadcastChannel.onmessage = function(event) {
        if (event && event.data && typeof onMessageCallback === 'function') {
          onMessageCallback(event.data);
        }
      };
    }

    // Fallback via localStorage storage event
    window.addEventListener('storage', function(e) {
      if (e.key === 'arduiblok_sim_message' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (typeof onMessageCallback === 'function') {
            onMessageCallback(data);
          }
        } catch (err) {}
      }
    });

    // Periksa apakah ada kode / pesan awal yang dikirim via URL hash atau sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const initialTrack = urlParams.get('track');
    const autoRun = urlParams.get('run') === 'true';

    if (initialTrack && root.ArduiBlokSimEngine) {
      root.ArduiBlokSimEngine.loadTrack(initialTrack);
    }
    if (autoRun && root.ArduiBlokSimEngine) {
      setTimeout(() => root.ArduiBlokSimEngine.setRunning(true), 600);
    }
  }

  function sendCommand(type, payload = {}) {
    const message = { type, payload, timestamp: Date.now() };

    if (broadcastChannel) {
      broadcastChannel.postMessage(message);
    }

    try {
      localStorage.setItem('arduiblok_sim_command', JSON.stringify(message));
    } catch (e) {}
  }

  root.ArduiBlokSimBridge = {
    init: initBridge,
    sendCommand
  };

})(typeof window !== 'undefined' ? window : this);
