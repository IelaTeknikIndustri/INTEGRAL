import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, judul, penulis, tahun_terbit, kategori, rak, stok } = await request.json();

    if (!id || !judul || !rak) {
      return new Response(JSON.stringify({ success: false, message: 'ID, Judul, dan Rak wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabaseAdmin.from('collections').upsert({
      id: String(id).trim(),
      judul: String(judul).trim(),
      penulis: String(penulis || '-').trim(),
      tahun_terbit: String(tahun_terbit || '-').trim(),
      kategori: kategori || 'Buku Literatur',
      rak: String(rak).trim(),
      stok: parseInt(stok) || 1
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: 'Koleksi berhasil disimpan!' }), {
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

