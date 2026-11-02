import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { sendReminderEmail, generateReminderEmailHtml, determineReminderStage, type ReminderStage } from '@/lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }

    const targetEmail = body.targetEmail || 'luqmanf667@gmail.com';
    const isTest = body.isTest !== false;
    let stage: ReminderStage = body.stage || 'terlambat';

    let nama = body.nama || 'Mochammad Luqman Firdaus';
    let npm = body.npm || '1411230105';
    let hariTelat = body.hariTelat;
    let denda = body.denda;
    let batasKembali = body.batasKembali;
    let bukuList = body.bukuList || [
      'AKUNTANSI MANAJERIAL Buku 1 (RAY H. GARRISON)',
      'Service, Quality & Satisfaction Edisi 3 (Fandy Tjiptono, Ph.D)'
    ];

    const now = new Date();
    const bln = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Atur tanggal dan angka default berdasarkan stage yang dipilih untuk simulasi pengujian
    if (!batasKembali) {
      if (stage === 'h-1') {
        const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
        batasKembali = `${tomorrow.getDate()} ${bln[tomorrow.getMonth()]} ${tomorrow.getFullYear()} (Besok)`;
        hariTelat = -1;
        denda = 0;
      } else if (stage === 'hari-h') {
        batasKembali = `${now.getDate()} ${bln[now.getMonth()]} ${now.getFullYear()} (Hari Ini)`;
        hariTelat = 0;
        denda = 0;
      } else {
        const past = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
        batasKembali = `${past.getDate()} ${bln[past.getMonth()]} ${past.getFullYear()}`;
        hariTelat = 3;
        denda = 3000;
      }
    }

    // Jika ingin mengambil data riil dari Supabase
    if (!isTest) {
      try {
        const { data: overdueLoans } = await supabaseAdmin
          .from('loans')
          .select('id, student_npm, batas_kembali, hari_terlambat, total_denda, loan_items(book_title)')
          .neq('status', 'Selesai')
          .limit(1);

        if (overdueLoans && overdueLoans.length > 0) {
          const l: any = overdueLoans[0];
          npm = l.student_npm || npm;
          hariTelat = l.hari_terlambat ?? 1;
          stage = determineReminderStage(hariTelat);
          denda = l.total_denda || (Math.max(0, hariTelat) * 1000);
          if (l.batas_kembali) {
            const d = new Date(l.batas_kembali);
            batasKembali = `${d.getDate()} ${bln[d.getMonth()]} ${d.getFullYear()}`;
          }
          if (l.loan_items && l.loan_items.length > 0) {
            bukuList = l.loan_items.map((it: any) => it.book_title || 'Buku Ruang Baca TI');
          }

          const { data: student } = await supabaseAdmin
            .from('students')
            .select('nama, email')
            .eq('npm', npm)
            .single();

          if (student && student.nama) {
            nama = student.nama;
          }
        }
      } catch (e) {
        console.warn('Database lookup for reminder:', e);
      }
    }

    const result = await sendReminderEmail({
      to: targetEmail,
      nama,
      npm,
      hariTelat,
      denda,
      batasKembali,
      bukuList,
      stage
    });

    return new Response(JSON.stringify({
      success: result.success,
      message: result.message,
      isRealDelivery: result.isRealDelivery,
      stage: result.stage,
      recipient: targetEmail,
      details: {
        stage,
        nama,
        npm,
        hariTelat,
        denda,
        batasKembali,
        bukuList
      },
      html: result.html
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      message: err.message || 'Terjadi kesalahan pemrosesan reminder.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  const targetEmail = url.searchParams.get('to') || 'luqmanf667@gmail.com';
  const stage = (url.searchParams.get('stage') as ReminderStage) || 'terlambat';

  const now = new Date();
  const bln = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  let batasKembali = '29 Oktober 2026';
  let hariTelat = 3;
  let denda = 3000;

  if (stage === 'h-1') {
    const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    batasKembali = `${tomorrow.getDate()} ${bln[tomorrow.getMonth()]} ${tomorrow.getFullYear()} (Besok)`;
    hariTelat = -1;
    denda = 0;
  } else if (stage === 'hari-h') {
    batasKembali = `${now.getDate()} ${bln[now.getMonth()]} ${now.getFullYear()} (Hari Ini)`;
    hariTelat = 0;
    denda = 0;
  }

  const html = generateReminderEmailHtml({
    to: targetEmail,
    nama: 'Mochammad Luqman Firdaus',
    npm: '1411230105',
    hariTelat,
    denda,
    batasKembali,
    stage,
    bukuList: [
      'AKUNTANSI MANAJERIAL Buku 1 (RAY H. GARRISON)',
      'Service, Quality & Satisfaction Edisi 3 (Fandy Tjiptono, Ph.D)'
    ]
  });

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
};
