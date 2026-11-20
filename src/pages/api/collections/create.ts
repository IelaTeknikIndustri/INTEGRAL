import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const judul = String(body.judul || '').trim();
    const penulis = String(body.penulis || '-').trim();
    const tahun = String(body.tahun_terbit || body.tahun || new Date().getFullYear()).trim();
    const kategori = String(body.kategori || 'Buku Literatur').trim();
    const rak = String(body.rak || 'Ruang Baca TI').trim();
    const stok = Math.max(0, parseInt(body.stok) || 1);

    if (!judul) {
      return new Response(JSON.stringify({ success: false, message: 'Judul buku wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let id = body.id ? String(body.id).trim().replace(/\.0$/, '') : '';

    if (!id) {
      // Buat ID unik berdasarkan urutan koleksi yang ada
      const { data: allIds } = await supabaseAdmin
        .from('collections')
        .select('id');

      let maxNum = 1000;
      if (allIds && allIds.length > 0) {
        for (const row of allIds) {
          const num = parseInt(String(row.id).replace(/\.0$/, '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      id = String(maxNum + 1);
    }

    const payload = {
      id,
      judul,
      penulis,
      tahun_terbit: tahun,
      kategori,
      rak,
      stok
    };

    const { error } = await supabaseAdmin.from('collections').upsert(payload);

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: `Koleksi "${judul}" berhasil disimpan ke katalog (${kategori})!`,
      buku: {
        id,
        judul,
        penulis,
        tahun,
        kategori,
        rak,
        stok
      }
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
