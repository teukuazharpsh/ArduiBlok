/**
 * ArduiBlok — Client Authentication & OTP Verification Controller (public/auth.js)
 * Manages Auth Overlay, Login, Sign Up, 6-Digit OTP auto-advance, and user session badge.
 */

(function(root) {
  'use strict';

  const STORAGE_KEY_TOKEN = 'arduiblok_token';
  const STORAGE_KEY_USER = 'arduiblok_user';

  let currentUser = null;
  let authToken = null;
  let pendingEmail = '';
  let otpCountdownTimer = null;
  let resendCooldownTimer = null;

  // DOM Elements cache
  let authOverlay, authAlert;
  let authViewLogin, authViewRegister, authViewOtp;
  let formLogin, formRegister, panelOtpVerification;
  let loginIdentifier, loginPassword, btnSubmitLogin;
  let registerUsername, registerEmail, registerPassword, registerPasswordConfirm, btnSubmitRegister;
  let otpInputsGroup, otpBoxes = [], otpTargetEmailText, otpCountdown, btnResendOtp, btnSubmitOtp;
  let userProfileWrapper, btnUserMenu, userAvatarInitial, userNameLabel;
  let userDropdownMenu, dropdownAvatar, dropdownUsername, dropdownEmail, btnLogout;

  // ── Helper: Alert Messages ──────────────────────────────────
  function showAlert(message, type = 'error') {
    if (!authAlert) return;
    authAlert.textContent = message;
    authAlert.className = 'auth-alert ' + (type === 'success' ? 'success' : (type === 'warning' ? 'warning' : 'error'));
    authAlert.classList.remove('hidden');
  }

  function hideAlert() {
    if (authAlert) authAlert.classList.add('hidden');
  }

  function setButtonLoading(btn, isLoading, originalText = '') {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
      btn.dataset.originalText = btn.dataset.originalText || btn.innerHTML;
      btn.innerHTML = '<span class="loading-spinner-sm"></span> <span>Memproses...</span>';
    } else if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
    }
  }

  // ── Modern View Switcher (Login vs Sign Up vs OTP) ──────────
  function showView(target) {
    hideAlert();

    // Pastikan semua view disembunyikan secara ketat
    if (authViewLogin) authViewLogin.classList.add('hidden');
    if (authViewRegister) authViewRegister.classList.add('hidden');
    if (authViewOtp) authViewOtp.classList.add('hidden');

    if (target === 'login') {
      if (authViewLogin) authViewLogin.classList.remove('hidden');
      if (loginIdentifier) {
        setTimeout(() => loginIdentifier.focus(), 50);
      }
    } else if (target === 'register') {
      if (authViewRegister) authViewRegister.classList.remove('hidden');
      if (registerUsername) {
        setTimeout(() => registerUsername.focus(), 50);
      }
    } else if (target === 'otp') {
      if (authViewOtp) authViewOtp.classList.remove('hidden');
      clearOtpInputs();
      if (otpBoxes[0]) {
        setTimeout(() => otpBoxes[0].focus(), 50);
      }
    }
  }

  // ── OTP Boxes Auto-Advance & Paste Logic ───────────────────
  function initOtpBoxes() {
    otpBoxes = [
      document.getElementById('otpBox1'),
      document.getElementById('otpBox2'),
      document.getElementById('otpBox3'),
      document.getElementById('otpBox4'),
      document.getElementById('otpBox5'),
      document.getElementById('otpBox6')
    ].filter(Boolean);

    otpBoxes.forEach(function(box, index) {
      // Auto-advance ke kotak berikutnya saat 1 digit diketik
      box.addEventListener('input', function(e) {
        const val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val ? val.charAt(val.length - 1) : '';
        if (e.target.value && index < otpBoxes.length - 1) {
          otpBoxes[index + 1].focus();
          otpBoxes[index + 1].select();
        }
        hideAlert();
      });

      // Navigasi Backspace ke kotak sebelumnya
      box.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          otpBoxes[index - 1].focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
          otpBoxes[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < otpBoxes.length - 1) {
          otpBoxes[index + 1].focus();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (btnSubmitOtp) btnSubmitOtp.click();
        }
      });

      // Dukungan Paste (contoh: salin kode 6 digit sekaligus)
      box.addEventListener('paste', function(e) {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        const digits = pasted.replace(/[^0-9]/g, '').slice(0, 6);
        if (digits.length > 0) {
          for (let i = 0; i < otpBoxes.length; i++) {
            otpBoxes[i].value = digits[i] || '';
          }
          const nextFocus = Math.min(digits.length, otpBoxes.length - 1);
          otpBoxes[nextFocus].focus();
        }
      });
    });
  }

  function getEnteredOtp() {
    return otpBoxes.map(b => b.value.trim()).join('');
  }

  function clearOtpInputs() {
    otpBoxes.forEach(b => { if (b) b.value = ''; });
  }

  // ── OTP Timers ──────────────────────────────────────────────
  function startOtpCountdown(durationSeconds = 600) {
    if (otpCountdownTimer) clearInterval(otpCountdownTimer);
    let remaining = durationSeconds;

    function renderTime() {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      if (otpCountdown) {
        otpCountdown.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      if (remaining <= 0) {
        clearInterval(otpCountdownTimer);
        showAlert('Kode OTP telah kedaluwarsa. Silakan klik "Kirim Ulang Kode".', 'warning');
      }
      remaining--;
    }

    renderTime();
    otpCountdownTimer = setInterval(renderTime, 1000);
  }

  function startResendCooldown(cooldownSeconds = 45) {
    if (resendCooldownTimer) clearInterval(resendCooldownTimer);
    if (!btnResendOtp) return;

    let remaining = cooldownSeconds;
    btnResendOtp.disabled = true;

    function renderCooldown() {
      btnResendOtp.textContent = `Kirim Ulang (${remaining}s)`;
      if (remaining <= 0) {
        clearInterval(resendCooldownTimer);
        btnResendOtp.disabled = false;
        btnResendOtp.textContent = 'Kirim Ulang Kode';
      }
      remaining--;
    }

    renderCooldown();
    resendCooldownTimer = setInterval(renderCooldown, 1000);
  }

  // ── API Calls: Login ────────────────────────────────────────
  async function handleLogin() {
    hideAlert();
    const identifier = (loginIdentifier.value || '').trim();
    const password = (loginPassword.value || '');

    if (!identifier || !password) {
      showAlert('Mohon isi username/email dan password.');
      return;
    }

    setButtonLoading(btnSubmitLogin, true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Jika akun belum terverifikasi, langsung alihkan ke layar OTP
        if (data.requireVerification && data.email) {
          pendingEmail = data.email;
          if (otpTargetEmailText) otpTargetEmailText.textContent = data.email;
          showView('otp');
          showAlert('Akun Anda belum terverifikasi. Kami telah mengirimkan kode OTP baru.', 'warning');
          startOtpCountdown(600);
          startResendCooldown(45);
          return;
        }
        showAlert(data.error || 'Login gagal. Periksa kembali data Anda.');
        return;
      }

      // Login Sukses
      onAuthSuccess(data.token, data.user);

    } catch (err) {
      showAlert('Gagal terhubung ke server: ' + err.message);
    } finally {
      setButtonLoading(btnSubmitLogin, false);
    }
  }

  // ── API Calls: Register ─────────────────────────────────────
  async function handleRegister() {
    hideAlert();
    const username = (registerUsername.value || '').trim();
    const email = (registerEmail.value || '').trim().toLowerCase();
    const password = (registerPassword.value || '');
    const passwordConfirm = (registerPasswordConfirm ? registerPasswordConfirm.value : '');

    if (!username || !email || !password) {
      showAlert('Semua kolom pendaftaran wajib diisi.');
      return;
    }

    if (username.length < 3) {
      showAlert('Username minimal terdiri dari 3 karakter.');
      return;
    }

    if (password.length < 6) {
      showAlert('Password minimal terdiri dari 6 karakter.');
      return;
    }

    if (passwordConfirm && password !== passwordConfirm) {
      showAlert('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
      if (registerPasswordConfirm) registerPasswordConfirm.focus();
      return;
    }

    setButtonLoading(btnSubmitRegister, true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showAlert(data.error || 'Pendaftaran gagal.');
        return;
      }

      // Pendaftaran sukses -> buka layar OTP
      pendingEmail = data.email || email;
      if (otpTargetEmailText) otpTargetEmailText.textContent = pendingEmail;
      showView('otp');
      showAlert(data.message, 'success');
      startOtpCountdown(600);
      startResendCooldown(45);

    } catch (err) {
      showAlert('Gagal terhubung ke server: ' + err.message);
    } finally {
      setButtonLoading(btnSubmitRegister, false);
    }
  }

  // ── API Calls: Verify OTP ───────────────────────────────────
  async function handleVerifyOtp() {
    hideAlert();
    const otp = getEnteredOtp();

    if (otp.length < 6) {
      showAlert('Mohon masukkan lengkap 6 digit kode OTP.');
      return;
    }

    setButtonLoading(btnSubmitOtp, true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, otp })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showAlert(data.error || 'Verifikasi OTP gagal.');
        return;
      }

      // Verifikasi sukses
      if (otpCountdownTimer) clearInterval(otpCountdownTimer);
      if (resendCooldownTimer) clearInterval(resendCooldownTimer);
      onAuthSuccess(data.token, data.user);

    } catch (err) {
      showAlert('Gagal terhubung ke server: ' + err.message);
    } finally {
      setButtonLoading(btnSubmitOtp, false);
    }
  }

  // ── API Calls: Resend OTP ───────────────────────────────────
  async function handleResendOtp() {
    if (!pendingEmail) {
      showAlert('Alamat email tujuan tidak ditemukan.');
      return;
    }

    hideAlert();
    btnResendOtp.disabled = true;

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showAlert(data.error || 'Gagal mengirim ulang OTP.');
        btnResendOtp.disabled = false;
        return;
      }

      clearOtpInputs();
      if (otpBoxes[0]) otpBoxes[0].focus();
      showAlert(data.message || 'Kode OTP baru telah dikirimkan ke email Anda.', 'success');
      startOtpCountdown(600);
      startResendCooldown(45);

    } catch (err) {
      showAlert('Gagal menghubungi server: ' + err.message);
      btnResendOtp.disabled = false;
    }
  }

  // ── Sesi & Penyimpanan Lokal ────────────────────────────────
  function onAuthSuccess(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));

    updateUserNavbar();
    hideAuthModal();

    // Notifikasi selamat datang
    console.log(`[Auth] Pengguna aktif: ${user.username} (${user.email})`);
  }

  function updateUserNavbar() {
    if (!userNameLabel || !userAvatarInitial) return;

    if (currentUser) {
      const initial = (currentUser.username || 'U').charAt(0).toUpperCase();
      userAvatarInitial.textContent = initial;
      userNameLabel.textContent = currentUser.username;
      if (dropdownAvatar) dropdownAvatar.textContent = initial;
      if (dropdownUsername) dropdownUsername.textContent = currentUser.username;
      if (dropdownEmail) dropdownEmail.textContent = currentUser.email;
    } else {
      userAvatarInitial.textContent = '?';
      userNameLabel.textContent = 'Masuk';
    }
  }

  function showAuthModal(initialView = 'login') {
    if (authOverlay) {
      authOverlay.classList.remove('hidden');
      showView(initialView);
    }
  }

  function hideAuthModal() {
    if (authOverlay) {
      authOverlay.classList.add('hidden');
    }
    if (otpCountdownTimer) clearInterval(otpCountdownTimer);
    if (resendCooldownTimer) clearInterval(resendCooldownTimer);
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);

    if (userDropdownMenu) userDropdownMenu.classList.add('hidden');
    updateUserNavbar();
    showAuthModal('login');
    showAlert('Anda telah keluar dari akun.', 'warning');
  }

  // ── Verifikasi Token Saat Web Dibuka ────────────────────────
  async function checkExistingSession() {
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!savedToken) {
      showAuthModal('login');
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + savedToken }
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        authToken = savedToken;
        currentUser = data.user;
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        updateUserNavbar();
        hideAuthModal();
      } else {
        // Token tidak valid atau kedaluwarsa
        logout();
      }
    } catch (err) {
      console.warn('[Auth] Gagal verifikasi token me:', err.message);
      // Gunakan data cache jika offline
      const cached = localStorage.getItem(STORAGE_KEY_USER);
      if (cached) {
        try {
          currentUser = JSON.parse(cached);
          authToken = savedToken;
          updateUserNavbar();
          hideAuthModal();
          return;
        } catch (e) {}
      }
      showAuthModal('login');
    }
  }

  // ── Inisialisasi Event Listener DOM ─────────────────────────
  function init() {
    authOverlay = document.getElementById('authOverlay');
    authAlert = document.getElementById('authAlert');

    authViewLogin = document.getElementById('authViewLogin');
    authViewRegister = document.getElementById('authViewRegister');
    authViewOtp = document.getElementById('authViewOtp');

    formLogin = document.getElementById('formLogin');
    formRegister = document.getElementById('formRegister');
    panelOtpVerification = document.getElementById('panelOtpVerification');

    loginIdentifier = document.getElementById('loginIdentifier');
    loginPassword = document.getElementById('loginPassword');
    btnSubmitLogin = document.getElementById('btnSubmitLogin');

    registerUsername = document.getElementById('registerUsername');
    registerEmail = document.getElementById('registerEmail');
    registerPassword = document.getElementById('registerPassword');
    registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
    btnSubmitRegister = document.getElementById('btnSubmitRegister');

    otpInputsGroup = document.getElementById('otpInputsGroup');
    otpTargetEmailText = document.getElementById('otpTargetEmailText');
    otpCountdown = document.getElementById('otpCountdown');
    btnResendOtp = document.getElementById('btnResendOtp');
    btnSubmitOtp = document.getElementById('btnSubmitOtp');

    userProfileWrapper = document.getElementById('userProfileWrapper');
    btnUserMenu = document.getElementById('btnUserMenu');
    userAvatarInitial = document.getElementById('userAvatarInitial');
    userNameLabel = document.getElementById('userNameLabel');

    userDropdownMenu = document.getElementById('userDropdownMenu');
    dropdownAvatar = document.getElementById('dropdownAvatar');
    dropdownUsername = document.getElementById('dropdownUsername');
    dropdownEmail = document.getElementById('dropdownEmail');
    btnLogout = document.getElementById('btnLogout');

    initOtpBoxes();

    // View Navigation Links
    const linkToRegister = document.getElementById('linkToRegister') || document.getElementById('linkSwitchToRegister');
    const linkToLogin = document.getElementById('linkToLogin') || document.getElementById('linkSwitchToLogin');
    const linkBackToLoginFromOtp = document.getElementById('linkBackToLoginFromOtp') || document.getElementById('linkBackToRegister');

    if (linkToRegister) linkToRegister.addEventListener('click', (e) => { e.preventDefault(); showView('register'); });
    if (linkToLogin) linkToLogin.addEventListener('click', (e) => { e.preventDefault(); showView('login'); });
    if (linkBackToLoginFromOtp) linkBackToLoginFromOtp.addEventListener('click', (e) => { e.preventDefault(); showView('login'); });

    // Fallback Tab Switches jika ada
    const tabAuthLogin = document.getElementById('tabAuthLogin');
    const tabAuthRegister = document.getElementById('tabAuthRegister');
    if (tabAuthLogin) tabAuthLogin.addEventListener('click', () => showView('login'));
    if (tabAuthRegister) tabAuthRegister.addEventListener('click', () => showView('register'));

    // Form Submits
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => { e.preventDefault(); handleLogin(); });
    }
    if (formRegister) {
      formRegister.addEventListener('submit', (e) => { e.preventDefault(); handleRegister(); });
    }
    if (btnSubmitOtp) {
      btnSubmitOtp.addEventListener('click', handleVerifyOtp);
    }
    if (btnResendOtp) {
      btnResendOtp.addEventListener('click', handleResendOtp);
    }

    // Toggle Password Visibility
    const toggleLoginPwd = document.getElementById('toggleLoginPwd');
    const toggleRegisterPwd = document.getElementById('toggleRegisterPwd');
    const toggleRegisterConfirmPwd = document.getElementById('toggleRegisterConfirmPwd');

    if (toggleLoginPwd && loginPassword) {
      toggleLoginPwd.addEventListener('click', () => {
        const isPwd = loginPassword.type === 'password';
        loginPassword.type = isPwd ? 'text' : 'password';
        toggleLoginPwd.textContent = isPwd ? '🙈' : '👁️';
      });
    }
    if (toggleRegisterPwd && registerPassword) {
      toggleRegisterPwd.addEventListener('click', () => {
        const isPwd = registerPassword.type === 'password';
        registerPassword.type = isPwd ? 'text' : 'password';
        toggleRegisterPwd.textContent = isPwd ? '🙈' : '👁️';
      });
    }
    if (toggleRegisterConfirmPwd && registerPasswordConfirm) {
      toggleRegisterConfirmPwd.addEventListener('click', () => {
        const isPwd = registerPasswordConfirm.type === 'password';
        registerPasswordConfirm.type = isPwd ? 'text' : 'password';
        toggleRegisterConfirmPwd.textContent = isPwd ? '🙈' : '👁️';
      });
    }

    // User Profile Dropdown
    if (btnUserMenu && userDropdownMenu) {
      btnUserMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentUser) {
          showAuthModal('login');
          return;
        }
        userDropdownMenu.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (userDropdownMenu && !userDropdownMenu.contains(e.target) && !btnUserMenu.contains(e.target)) {
          userDropdownMenu.classList.add('hidden');
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin keluar (logout)?')) {
          logout();
        }
      });
    }

    // Periksa status sesi login saat startup
    checkExistingSession();
  }

  // Export module
  root.ArduiBlokAuth = {
    init,
    showAuthModal,
    hideAuthModal,
    logout,
    getToken: () => authToken,
    getUser: () => currentUser,
    isLoggedIn: () => !!authToken
  };

  // Jalankan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : this);
