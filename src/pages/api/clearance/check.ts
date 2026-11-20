import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { generateValidationCode } from '@/lib/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const query = String(body.npm || body.query || '').trim();

    if (!query) {
      return new Response(JSON.stringify({ success: false, message: 'NPM atau Nama wajib dimasukkan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Ambil data mahasiswa
    let { data: student } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('npm', query)
      .maybeSingle();

    if (!student) {
      const { data: matchedByName } = await supabaseAdmin
        .from('students')
        .select('*')
        .ilike('nama', `%${query}%`)
        .limit(1);

      if (matchedByName && matchedByName.length > 0) {
        student = matchedByName[0];
      }
    }

    if (!student) {
      student = {
        npm: query,
        nama: 'MAHASISWA ' + query,
        angkatan: query.length >= 6 ? '20' + query.substring(4, 6) : '2023',
        status: 'Aktif'
      };
    }

    let isEligible = true;
    let totalDenda = 0;

    // 2. Periksa tanggungan peminjaman aktif & denda di tabel loans Supabase
    const { data: activeLoans } = await supabaseAdmin
      .from('loans')
      .select('id, tgl_pinjam, batas_kembali, status, total_denda')
      .eq('student_npm', student.npm)
      .neq('status', 'Selesai');

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const TARIF_DENDA_PER_HARI = 1000;

    if (activeLoans && activeLoans.length > 0) {
      for (const al of activeLoans) {
        const st = String(al.status || '').toLowerCase();
        if (st === 'selesai' || st === 'dikembalikan' || st === 'kembali') continue;

        isEligible = false;
        let loanFine = Number(al.total_denda || 0);

        if (al.batas_kembali) {
          const dueParts = String(al.batas_kembali).split('T')[0].split('-');
          if (dueParts.length === 3) {
            const dueMidnight = new Date(
              parseInt(dueParts[0], 10),
              parseInt(dueParts[1], 10) - 1,
              parseInt(dueParts[2], 10)
            ).getTime();
            const diffDays = Math.round((todayMidnight - dueMidnight) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
              loanFine = Math.max(loanFine, diffDays * TARIF_DENDA_PER_HARI);
            }
          }
        }
        totalDenda += loanFine;
      }
    }

    if (totalDenda > 0) isEligible = false;

    // Bersihkan format angkatan dan npm dari suffix .0
    const cleanStudent = {
      ...student,
      npm: String(student.npm || '').replace(/\.0$/, ''),
      angkatan: String(student.angkatan || '2023').replace(/\.0$/, '')
    };

    // 3. Nomor surat dan kode validasi
    const dt = new Date();
    const ymd = dt.getFullYear() + ('0' + (dt.getMonth() + 1)).slice(-2) + ('0' + dt.getDate()).slice(-2);
    const nomorSurat = `BP/${cleanStudent.npm || 'TI'}/${ymd}`;
    const kodeValidasi = generateValidationCode(cleanStudent.npm || 'TI');

    return new Response(JSON.stringify({
      success: true,
      eligible: isEligible,
      cleared: isEligible,
      mhs: cleanStudent,
      student: cleanStudent,
      totalDenda: totalDenda,
      nomorSurat: nomorSurat,
      kodeValidasi: kodeValidasi
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
