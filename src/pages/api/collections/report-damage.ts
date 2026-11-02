import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, judul, kategori, catatan } = await request.json();

    if (!id || !judul) {
      return new Response(JSON.stringify({ success: false, message: 'ID dan Judul wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Catat ke tabel damaged_books jika ada
    await supabaseAdmin.from('damaged_books').insert({
      collection_id: String(id).trim(),
      keterangan: String(catatan || 'Dilaporkan rusak/hilang').trim(),
      jumlah: 1
    });

    // 2. Kurangi stok koleksi
    const { data: book } = await supabaseAdmin
      .from('collections')
      .select('stok')
      .eq('id', String(id).trim())
      .single();

    if (book) {
      const newStock = Math.max(0, (book.stok || 1) - 1);
      await supabaseAdmin
        .from('collections')
        .update({ stok: newStock })
        .eq('id', String(id).trim());
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Buku "${judul}" berhasil dicatat sebagai rusak/hilang!`
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

