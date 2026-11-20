import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, judul, penulis, tahun, tahun_terbit, rak, kategori, stok } = body;

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

    const th = tahun_terbit ?? tahun;
    if (th !== undefined && th !== null) updatePayload.tahun_terbit = String(th).trim();
    if (kategori) updatePayload.kategori = String(kategori).trim();
    if (stok !== undefined && stok !== null && !isNaN(Number(stok))) {
      updatePayload.stok = Math.max(0, parseInt(String(stok), 10));
    }

    const cleanId = String(id).trim().replace(/\.0$/, '');
    const { error } = await supabaseAdmin
      .from('collections')
      .update(updatePayload)
      .in('id', [cleanId, cleanId + '.0']);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: 'Data koleksi buku berhasil diperbarui!' }), {
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
