import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { generateValidationCode } from '@/lib/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { npm } = await request.json();

    if (!npm) {
      return new Response(JSON.stringify({ success: false, message: 'NPM wajib dimasukkan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanNpm = String(npm).trim();

    // 1. Ambil data mahasiswa
    const { data: student, error: studentErr } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('npm', cleanNpm)
      .single();

    if (studentErr || !student) {
      return new Response(JSON.stringify({ success: false, message: 'Data mahasiswa dengan NPM tersebut tidak ditemukan dalam sistem.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Periksa tanggungan peminjaman aktif & denda
    const { data: activeLoans } = await supabaseAdmin
      .from('loans')
      .select('id, tgl_pinjam, batas_kembali, status, total_denda, loan_items(collections(judul))')
      .eq('student_npm', cleanNpm)
      .in('status', ['Dipinjam', 'Terlambat']);

    const totalDenda = (activeLoans || []).reduce((acc, curr) => acc + (curr.total_denda || 0), 0);

    if (activeLoans && activeLoans.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        cleared: false,
        student,
        active_loans: activeLoans,
        total_denda: totalDenda,
        message: `Mahasiswa masih memiliki ${activeLoans.length} tanggungan peminjaman yang belum dikembalikan.`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Mahasiswa BEBAS TANGGUNGAN: Ambil atau terbitkan Surat Bebas Ruang Baca
    const { data: existingClearance } = await supabaseAdmin
      .from('clearances')
      .select('*')
      .eq('student_npm', cleanNpm)
      .single();

    if (existingClearance) {
      return new Response(JSON.stringify({
        success: true,
        cleared: true,
        student,
        clearance: existingClearance
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Terbitkan baru
    const nomorSurat = `${Math.floor(100 + Math.random() * 900)}/SK-BRB/TI-UNIROW/${new Date().getFullYear()}`;
    const kodeValidasi = generateValidationCode(cleanNpm);

    const { data: newClearance, error: createErr } = await supabaseAdmin
      .from('clearances')
      .insert({
        student_npm: cleanNpm,
        nomor_surat: nomorSurat,
        kode_validasi: kodeValidasi,
        petugas_nama: 'Mochammad Luqman Firdaus'
      })
      .select()
      .single();

    if (createErr) throw createErr;

    return new Response(JSON.stringify({
      success: true,
      cleared: true,
      student,
      clearance: newClearance
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

