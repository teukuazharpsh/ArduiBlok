/**
 * ArduiBlok — Email & OTP Service (server/mailer.js)
 * Generates OTP codes and delivers emails via:
 * 1. Resend REST API (HTTPS Port 443 - Solusi resmi Railway karena memblokir port SMTP 465/587)
 * 2. Nodemailer SMTP (Gmail / Custom SMTP untuk server lokal atau VPS)
 */

const nodemailer = require('nodemailer');
const dns = require('dns');

// Paksa resolusi DNS mendahulukan IPv4 untuk mencegah ENETUNREACH pada Railway / Docker
if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Helper: Bersihkan string dari tanda petik dua/satu dan spasi berlebih
function sanitizeEnv(val) {
  if (!val) return '';
  return String(val).replace(/^["']|["']$/g, '').trim();
}

// Helper: Hasilkan kode acak 6 digit numerik
function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Pengiriman via Resend REST API (HTTPS Port 443)
 * Sangat direkomendasikan untuk Railway karena Railway memblokir port SMTP (25, 465, 587) pada akun Free/Hobby.
 */
async function sendViaResend(apiKey, toEmail, username, otpCode, htmlContent) {
  const fromAddress = sanitizeEnv(process.env.RESEND_FROM) || 'ArduiBlok Studio <onboarding@resend.dev>';
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [toEmail],
      subject: `[${otpCode}] Kode Verifikasi Akun ArduiBlok`,
      html: htmlContent,
      text: `Halo ${username},\n\nKode verifikasi akun ArduiBlok Anda adalah: ${otpCode}\n\nKode berlaku selama 10 menit.`
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data && (data.message || data.error) ? (data.message || data.error) : JSON.stringify(data);
    throw new Error('Resend API: ' + errorMsg);
  }

  console.log(`[Mailer - Resend] Email OTP sukses terkirim ke ${toEmail} (ID: ${data.id})`);
  return {
    success: true,
    mock: false,
    message: 'Kode OTP telah dikirim ke email Anda.'
  };
}

// Buat transporter Nodemailer jika kredensial SMTP tersedia (untuk lokal atau server dengan port SMTP terbuka)
function createTransporter() {
  const host = sanitizeEnv(process.env.SMTP_HOST);
  const rawPort = sanitizeEnv(process.env.SMTP_PORT);
  const port = parseInt(rawPort || '465', 10);
  const user = sanitizeEnv(process.env.SMTP_USER);
  const rawPass = sanitizeEnv(process.env.SMTP_PASS);
  const pass = rawPass.replace(/\s+/g, '');
  const secureEnv = sanitizeEnv(process.env.SMTP_SECURE);
  const secure = secureEnv === 'true' || port === 465;

  if (user && pass) {
    const isGmail = (host && host.toLowerCase().includes('gmail')) || user.toLowerCase().endsWith('@gmail.com');
    if (isGmail) {
      return nodemailer.createTransport({
        service: 'gmail',
        family: 4,
        auth: {
          user: user,
          pass: pass
        },
        connectionTimeout: 10000,
        greetingTimeout: 7000,
        socketTimeout: 15000
      });
    }

    return nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port: isNaN(port) ? 465 : port,
      secure: secure,
      family: 4,
      auth: {
        user: user,
        pass: pass
      },
      connectionTimeout: 10000,
      greetingTimeout: 7000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return null;
}

/**
 * Mengirimkan email kode OTP ke alamat penerima
 * @param {string} toEmail - Alamat email tujuan
 * @param {string} username - Nama pengguna
 * @param {string} otpCode - Kode OTP 6 digit
 * @returns {Promise<{ success: boolean, mock: boolean, message: string }>}
 */
async function sendOtpEmail(toEmail, username, otpCode) {
  const devMock = sanitizeEnv(process.env.DEV_MOCK_OTP) === 'true';
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
  const resendApiKey = sanitizeEnv(process.env.RESEND_API_KEY);
  const transporter = createTransporter();

  // Log ke terminal server untuk kemudahan debugging dan pengujian lokal
  console.log('\n======================================================');
  console.log('  📧 [ARDUIBLOK OTP VERIFICATION CODE]');
  console.log(`  Penerima     : ${toEmail} (${username})`);
  console.log(`  Kode OTP     : >>> ${otpCode} <<<`);
  console.log('  Masa Berlaku : 10 Menit');
  console.log('======================================================\n');

  // Template email HTML modern
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .logo-title { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .logo-badge { background: #00878a; color: white; font-weight: 800; font-size: 18px; padding: 6px 12px; border-radius: 8px; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
        .otp-box { background: #f0fdfa; border: 2px dashed #00878a; border-radius: 10px; text-align: center; padding: 20px; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #00878a; margin: 0; font-family: 'Courier New', monospace; }
        .info { font-size: 14px; line-height: 1.6; color: #475569; }
        .warning { font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-title">
          <span class="logo-badge">AB</span>
          <h2 class="title">ArduiBlok Studio</h2>
        </div>
        <p class="info">Halo <b>${username}</b>,</p>
        <p class="info">Terima kasih telah mendaftar di <b>ArduiBlok</b>. Gunakan kode verifikasi (OTP) berikut untuk mengaktifkan akun Anda:</p>
        
        <div class="otp-box">
          <div class="otp-code">${otpCode}</div>
        </div>

        <p class="info">Kode ini hanya berlaku selama <b>10 menit</b>. Jangan berikan kode ini kepada siapa pun untuk keamanan akun Anda.</p>
        
        <div class="warning">
          Jika Anda tidak merasa mendaftar di ArduiBlok Studio, abaikan email ini.<br>
          &copy; ${new Date().getFullYear()} ArduiBlok — Robotika Nesklar.
        </div>
      </div>
    </body>
    </html>
  `;

  // ── Opsi 1: Pengiriman via Resend REST API (HTTPS Port 443 - Solusi Utama Railway) ──
  if (resendApiKey) {
    try {
      return await sendViaResend(resendApiKey, toEmail, username, otpCode, htmlContent);
    } catch (resendErr) {
      console.error('[Mailer Resend Error]:', resendErr.message);
      throw new Error('Gagal mengirim email via Resend API: ' + resendErr.message);
    }
  }

  // ── Opsi 2: Pengiriman via Nodemailer SMTP (Jika kredensial diset) ──
  if (!transporter) {
    if (devMock && !isProduction) {
      console.warn('[Mailer Warning] Layanan email belum diset, menggunakan mode dev mock lokal (DEV_MOCK_OTP=true)');
      return {
        success: true,
        mock: true,
        message: 'Kode OTP dicatat di konsol server (Mode Dev).'
      };
    }
    throw new Error(
      'Layanan email belum dikonfigurasi di server. ' +
      'Karena Railway memblokir port SMTP (465/587), tambahkan variabel RESEND_API_KEY di Railway Dashboard (dapatkan gratis di resend.com).'
    );
  }

  try {
    const rawFrom = sanitizeEnv(process.env.EMAIL_FROM);
    const user = sanitizeEnv(process.env.SMTP_USER);
    const fromAddress = rawFrom || `"ArduiBlok Studio" <${user}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[${otpCode}] Kode Verifikasi Akun ArduiBlok`,
      text: `Halo ${username},\n\nKode verifikasi akun ArduiBlok Anda adalah: ${otpCode}\n\nKode berlaku selama 10 menit.`,
      html: htmlContent
    });

    console.log(`[Mailer] Email OTP sukses terkirim ke ${toEmail} (MessageId: ${info.messageId})`);

    return {
      success: true,
      mock: false,
      message: 'Kode OTP telah dikirim ke email Anda.'
    };
  } catch (err) {
    console.error('[Mailer SMTP Error]:', err.message);
    
    // Deteksi jika kegagalan disebabkan blokir port SMTP oleh cloud provider (Railway)
    const isPortBlocked = err.message.includes('timeout') || 
                          err.message.includes('ETIMEDOUT') || 
                          err.message.includes('ENETUNREACH') ||
                          err.message.includes('ECONNREFUSED');

    if (isPortBlocked && isProduction) {
      throw new Error(
        'Railway memblokir port SMTP (465/587) pada akun Free/Hobby. ' +
        'Solusi resmi: Tambahkan variabel RESEND_API_KEY di Railway Variables. Dapatkan API Key gratis di https://resend.com (menggunakan HTTPS Port 443 yang tidak pernah diblokir).'
      );
    }

    if (devMock && !isProduction) {
      return {
        success: true,
        mock: true,
        message: 'Koneksi SMTP lokal bermasalah, kode dicatat di konsol server (Dev Mode).'
      };
    }

    throw new Error('Gagal mengirim email verifikasi ke ' + toEmail + ': ' + err.message);
  }
}

module.exports = {
  generateOtpCode,
  sendOtpEmail
};
