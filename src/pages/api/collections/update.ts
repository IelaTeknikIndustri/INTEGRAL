import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, judul, penulis, tahun, rak, kategori } = await request.json();

    if (!id || !judul) {
      return new Response(JSON.stringify({ success: false, message: 'ID dan Judul wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatePayload: any = {
      judul: String(judul).trim(),
      penulis: String(penulis || '-').trim(),
      rak: String(rak || 'Ruang Baca TI').trim()
    };

    if (tahun) updatePayload.tahun_terbit = String(tahun).trim();
    if (kategori) updatePayload.kategori = String(kategori).trim();

    const { error } = await supabaseAdmin
      .from('collections')
      .update(updatePayload)
      .eq('id', String(id).trim());

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: 'Data buku berhasil diperbarui!' }), {
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

