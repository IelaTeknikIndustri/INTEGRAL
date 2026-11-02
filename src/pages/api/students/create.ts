import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { npm, nama, angkatan, status, email, noHp } = await request.json();

    if (!npm || !nama) {
      return new Response(JSON.stringify({ success: false, message: 'NPM dan Nama mahasiswa wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanNpm = String(npm).trim();
    const cleanNama = String(nama).trim().toUpperCase();
    const defaultAngkatan = (cleanNpm.length >= 6 && !isNaN(Number(cleanNpm.substring(4, 6))))
      ? '20' + cleanNpm.substring(4, 6)
      : (angkatan || '2023');

    const { error } = await supabaseAdmin.from('students').upsert({
      npm: cleanNpm,
      nama: cleanNama,
      angkatan: String(angkatan || defaultAngkatan).trim(),
      status: String(status || 'Aktif').trim(),
      email: String(email || `${cleanNpm}@unirow.ac.id`).trim(),
      no_hp: String(noHp || '-').trim()
    });

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: `Mahasiswa ${cleanNama} (${cleanNpm}) berhasil disimpan!`
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

