import nodemailer from 'nodemailer';
import fs from 'node:fs';

export type ReminderStage = 'h-1' | 'hari-h' | 'terlambat';

export interface ReminderEmailParams {
  to: string;
  nama: string;
  npm?: string;
  hariTelat?: number;
  denda?: number;
  batasKembali: string;
  bukuList: string[];
  stage?: ReminderStage;
}

export function determineReminderStage(hariTelat?: number): ReminderStage {
  if (hariTelat === undefined || hariTelat === null) return 'terlambat';
  if (hariTelat <= -1) return 'h-1';
  if (hariTelat === 0) return 'hari-h';
  return 'terlambat';
}

export function getStageMeta(stage: ReminderStage, hariTelat: number = 1, denda: number = 0) {
  if (stage === 'h-1') {
    return {
      badgeTitle: 'PENGINGAT: JATUH TEMPO BESOK',
      badgeBg: '#FEF3C7',
      badgeBorder: '#FCD34D',
      badgeColor: '#92400E',
      highlightColor: '#D97706',
      subjectTag: '[Pengingat]',
      subjectLead: 'Masa Pinjam Buku Berakhir Besok',
      introText: 'Peminjaman buku koleksi Ruang Baca Program Studi Teknik Industri UNIROW Anda akan mencapai batas akhir pengembalian <strong>besok</strong>.',
      statusBoxDesc: 'Batas pengembalian buku adalah <strong>BESOK</strong>. Buku Anda saat ini berstatus <strong>Tepat Waktu</strong> dan <strong>Bebas Denda</strong>.',
      actionAdvice: 'Mohon persiapkan dan bawa buku Anda untuk dikembalikan ke Ruang Baca TI UNIROW besok tepat waktu guna menghindari denda keterlambatan.',
      nominalDendaText: 'Rp 0 (Bebas Denda)',
      dendaNote: '*Denda baru akan dikenakan bila pengembalian melewati tanggal jatuh tempo.'
    };
  }

  if (stage === 'hari-h') {
    return {
      badgeTitle: 'PEMBERITAHUAN: JATUH TEMPO HARI INI',
      badgeBg: '#EFF6FF',
      badgeBorder: '#BFDBFE',
      badgeColor: '#1E40AF',
      highlightColor: '#2563EB',
      subjectTag: '[Penting]',
      subjectLead: 'Batas Pengembalian Buku Hari Ini',
      introText: 'Hari ini adalah <strong>batas waktu terakhir</strong> pengembalian buku koleksi Ruang Baca Program Studi Teknik Industri UNIROW yang Anda pinjam.',
      statusBoxDesc: 'Batas pengembalian buku adalah <strong>HARI INI</strong>. Status Anda saat ini masih <strong>Bebas Denda</strong> jika dikembalikan hari ini.',
      actionAdvice: 'Silakan segera membawa dan menyerahkan buku ke Meja Sirkulasi Ruang Baca TI UNIROW hari ini sebelum jam operasional perpustakaan ditutup.',
      nominalDendaText: 'Rp 0 (Kembalikan Hari Ini)',
      dendaNote: '*Keterlambatan mulai besok akan dikenakan denda akumulatif Rp 1.000 / hari.'
    };
  }

  // Stage: terlambat
  const days = Math.max(1, hariTelat);
  const fine = denda > 0 ? denda : days * 1000;
  return {
    badgeTitle: `PERINGATAN: STATUS TERLAMBAT (${days} HARI)`,
    badgeBg: '#FEF2F2',
    badgeBorder: '#FCA5A5',
    badgeColor: '#991B1B',
    highlightColor: '#DC2626',
    subjectTag: '[Peringatan]',
    subjectLead: `Terlambat Mengembalikan Buku (${days} Hari)`,
    introText: 'Sistem mendeteksi adanya keterlambatan pengembalian pinjaman buku koleksi Ruang Baca Program Studi Teknik Industri UNIROW Tuban.',
    statusBoxDesc: `Buku belum dikembalikan dan telah melampaui batas waktu selama <strong>${days} hari</strong>.`,
    actionAdvice: 'Mohon segera mengembalikan buku ke Ruang Baca Teknik Industri UNIROW untuk menghentikan penambahan denda harian serta menjaga status kelayakan Bebas Pustaka Yudisium dan Ijazah Wisuda Anda.',
    nominalDendaText: `Rp ${fine.toLocaleString('id-ID')}`,
    dendaNote: `*Tarif denda resmi: Rp 1.000 / hari keterlambatan (${days} hari x Rp 1.000).`
  };
}

export function generateReminderEmailHtml(params: ReminderEmailParams): string {
  const stage = params.stage || determineReminderStage(params.hariTelat);
  const hariTelat = params.hariTelat ?? 1;
  const denda = params.denda ?? (hariTelat > 0 ? hariTelat * 1000 : 0);
  const meta = getStageMeta(stage, hariTelat, denda);

  const bukuItemsHtml = params.bukuList.map((b, idx) => {
    const clean = b.replace('[DIKEMBALIKAN]', '').replace('[RUSAK]', '').split(' | RAK: ')[0].trim();
    return `<li style="margin-bottom:8px; line-height:1.5;"><strong>${idx + 1}. ${clean}</strong></li>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notifikasi Sirkulasi INTEGRAL</title>
</head>
<body style="margin: 0; padding: 20px 10px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Container Box -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04); text-align: left;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #240D57; background: linear-gradient(135deg, #1E0B45 0%, #240D57 100%); padding: 30px 24px; text-align: center; color: #FFFFFF;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 12px auto;">
                <tr>
                  <td style="background: #FFFFFF; width: 62px; height: 62px; border-radius: 14px; text-align: center; vertical-align: middle; padding: 6px;">
                    <img src="https://i.ibb.co/M53NV70Y/1-1.png" alt="INTEGRAL" width="50" height="50" style="display: block; margin: auto; object-fit: contain;">
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0; font-size: 21px; font-weight: 800; letter-spacing: 0.5px; color: #FFFFFF;">INTEGRAL Library Reminder</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #DDD6FE; font-weight: 500;">Ruang Baca &amp; Sirkulasi Perpustakaan Teknik Industri UNIROW</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 24px; color: #1E293B; line-height: 1.6;">
              <p style="font-size: 15px; margin: 0 0 14px 0; color: #0F172A;">
                Yth. Sdr/i <strong>${params.nama}</strong>${params.npm ? ` (NPM: ${params.npm})` : ''},
              </p>
              
              <p style="font-size: 13.5px; color: #475569; margin: 0 0 18px 0; line-height: 1.6;">
                ${meta.introText}
              </p>

              <!-- Highlight Stage Status Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${meta.badgeBg}; border: 1px solid ${meta.badgeBorder}; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <span style="display: inline-block; background-color: ${meta.highlightColor}; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 4px 9px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${meta.badgeTitle}
                    </span>
                    <p style="margin: 10px 0 6px 0; font-size: 13.5px; color: #334155; line-height: 1.5;">
                      ${meta.statusBoxDesc}
                    </p>
                    <div style="font-size: 23px; font-weight: 800; color: ${meta.highlightColor}; margin: 4px 0 2px 0;">
                      Denda: ${meta.nominalDendaText}
                    </div>
                    <span style="font-size: 11.5px; color: ${meta.badgeColor}; display: block;">
                      ${meta.dendaNote}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Loan Items Details -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                      Daftar Koleksi Buku yang Dipinjam:
                    </div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 13.5px; color: #1E293B;">
                      ${bukuItemsHtml}
                    </ul>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #CBD5E1;">
                      <tr>
                        <td style="font-size: 13px; color: #64748B;">
                          Batas Waktu Pengembalian:
                        </td>
                        <td align="right" style="font-size: 13.5px; font-weight: 700; color: ${meta.highlightColor};">
                          ${params.batasKembali}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Call -->
              <p style="font-size: 13px; color: #475569; margin: 0 0 16px 0; line-height: 1.6;">
                ${meta.actionAdvice}
              </p>

              <!-- Meja Sirkulasi Info -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-left: 3px solid #6366F1; padding-left: 12px; margin-bottom: 6px;">
                <tr>
                  <td style="font-size: 12px; color: #64748B; line-height: 1.5;">
                    <strong style="color: #1E293B;">Lokasi Layanan Sirkulasi:</strong><br>
                    Ruang Baca Program Studi Teknik Industri UNIROW Tuban<br>
                    Gedung Fakultas Teknik, Kampus UNIROW Tuban (Senin - Jumat: 08.00 - 15.30 WIB)
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Anti-Spam Compliant Footer -->
          <tr>
            <td style="background-color: #F1F5F9; border-top: 1px solid #E2E8F0; padding: 18px 24px; text-align: center; font-size: 11.5px; color: #64748B; line-height: 1.5;">
              <strong>Sistem Informasi Ruang Baca Terpadu (INTEGRAL)</strong><br>
              Program Studi Teknik Industri, Universitas PGRI Ronggolawe (UNIROW) Tuban<br>
              Jl. Manunggal No. 61, Tuban, Jawa Timur 62319 &bull; Email: <a href="mailto:ielateknikindustri@gmail.com" style="color: #4F46E5; text-decoration: none;">ielateknikindustri@gmail.com</a><br>
              <span style="font-size: 10.5px; color: #94A3B8; display: block; margin-top: 8px;">
                Anda menerima email ini sebagai notifikasi resmi atas transaksi peminjaman buku aktif di perpustakaan.
              </span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateReminderEmailText(params: ReminderEmailParams): string {
  const stage = params.stage || determineReminderStage(params.hariTelat);
  const hariTelat = params.hariTelat ?? 1;
  const denda = params.denda ?? (hariTelat > 0 ? hariTelat * 1000 : 0);
  const meta = getStageMeta(stage, hariTelat, denda);

  const bukuListText = params.bukuList.map((b, idx) => `${idx + 1}. ${b}`).join('\n');

  return `
INTEGRAL LIBRARY REMINDER
Ruang Baca & Sirkulasi Perpustakaan Teknik Industri UNIROW

Yth. Sdr/i ${params.nama}${params.npm ? ` (NPM: ${params.npm})` : ''},

${meta.badgeTitle}
--------------------------------------------------
${meta.statusBoxDesc}
Total Denda: ${meta.nominalDendaText}
Batas Pengembalian: ${params.batasKembali}

DAFTAR BUKU YANG DIPINJAM:
${bukuListText}

${meta.actionAdvice}

Lokasi Layanan Sirkulasi:
Ruang Baca Program Studi Teknik Industri UNIROW Tuban
Gedung Fakultas Teknik, Kampus UNIROW Tuban (Senin - Jumat: 08.00 - 15.30 WIB)

--------------------------------------------------
Email resmi otomatis dari Sistem INTEGRAL UNIROW.
Jl. Manunggal No. 61 Tuban, Jawa Timur 62319
Hubungi: ielateknikindustri@gmail.com
  `.trim();
}

function getSmtpCredentials() {
  let user = process.env.SMTP_USER || process.env.GMAIL_USER || '';
  let pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';

  if (!user || !pass) {
    try {
      if (fs.existsSync('.env')) {
        const lines = fs.readFileSync('.env', 'utf-8').split(/\r?\n/);
        for (const l of lines) {
          const match = l.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const k = match[1];
            const v = (match[2] || '').trim();
            if (k === 'SMTP_USER' || k === 'GMAIL_USER') user = user || v;
            if (k === 'SMTP_PASS' || k === 'GMAIL_APP_PASSWORD') pass = pass || v;
          }
        }
      }
    } catch (e) {}
  }
  return { user, pass: pass.replace(/\s+/g, '') };
}

export async function sendReminderEmail(params: ReminderEmailParams): Promise<{
  success: boolean;
  message: string;
  isRealDelivery: boolean;
  stage: ReminderStage;
  html: string;
}> {
  const stage = params.stage || determineReminderStage(params.hariTelat);
  const hariTelat = params.hariTelat ?? (stage === 'terlambat' ? 3 : (stage === 'h-1' ? -1 : 0));
  const denda = params.denda ?? (stage === 'terlambat' ? Math.max(1, hariTelat) * 1000 : 0);

  const meta = getStageMeta(stage, hariTelat, denda);
  const html = generateReminderEmailHtml({ ...params, stage, hariTelat, denda });
  const text = generateReminderEmailText({ ...params, stage, hariTelat, denda });
  const subject = `${meta.subjectTag} ${meta.subjectLead} - ${params.nama}`;
  const senderName = process.env.SENDER_NAME || 'INTEGRAL Library UNIROW';

  const { user: smtpUser, pass: smtpPass } = getSmtpCredentials();

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const messageId = `<integral-${stage}-${params.npm || 'mhs'}-${Date.now()}@gmail.com>`;

      await transporter.sendMail({
        from: `"${senderName}" <${smtpUser}>`,
        to: params.to,
        replyTo: `"${senderName}" <${smtpUser}>`,
        subject: subject,
        text: text, // Plain-text fallback for anti-spam deliverability
        html: html,
        headers: {
          'Message-ID': messageId,
          'X-Entity-Ref-ID': messageId,
          'X-Mailer': 'INTEGRAL-Library-Automated-System/2.0',
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
          'List-Unsubscribe': `<mailto:${smtpUser}?subject=Unsubscribe%20INTEGRAL>`,
          'Precedence': 'bulk'
        }
      });

      return {
        success: true,
        message: `Email pengingat tahap [${meta.badgeTitle}] berhasil dikirim nyata ke ${params.to}!`,
        isRealDelivery: true,
        stage,
        html
      };
    } catch (err: any) {
      console.error('SMTP sending error:', err);
      return {
        success: false,
        message: `Gagal mengirim lewat SMTP: ${err.message}`,
        isRealDelivery: false,
        stage,
        html
      };
    }
  }

  return {
    success: true,
    message: `Pratinjau [${meta.badgeTitle}] siap untuk ${params.to}.`,
    isRealDelivery: false,
    stage,
    html
  };
}
