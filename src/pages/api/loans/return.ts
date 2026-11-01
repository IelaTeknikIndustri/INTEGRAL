import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { loan_item_id, aksi = 'kembali', keterangan = '' } = await request.json();

    if (!loan_item_id) {
      return new Response(JSON.stringify({ success: false, message: 'ID item peminjaman wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Ambil detail item peminjaman
    const { data: item, error: itemErr } = await supabaseAdmin
      .from('loan_items')
      .select('id, loan_id, collection_id, status, collections(id, judul, stok)')
      .eq('id', loan_item_id)
      .single();

    if (itemErr || !item) {
      return new Response(JSON.stringify({ success: false, message: 'Item peminjaman tidak ditemukan' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (item.status !== 'Dipinjam') {
      return new Response(JSON.stringify({ success: false, message: `Buku ini sudah berstatus ${item.status}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date().toISOString();

    if (aksi === 'rusak') {
      // Tandai rusak dan catat ke damaged_books
      await supabaseAdmin
        .from('loan_items')
        .update({ status: 'Rusak', tgl_kembali: now, keterangan: keterangan || 'Buku dilaporkan rusak/hilang' })
        .eq('id', loan_item_id);

      await supabaseAdmin.from('damaged_books').insert({
        collection_id: item.collection_id,
        judul: (item.collections as any)?.judul || 'Tidak diketahui',
        keterangan: keterangan || 'Dilaporkan rusak saat peminjaman'
      });
    } else {
      // Kembalikan normal: update item + tambah stok buku +1
      await supabaseAdmin
        .from('loan_items')
        .update({ status: 'Dikembalikan', tgl_kembali: now })
        .eq('id', loan_item_id);

      const currentStock = (item.collections as any)?.stok || 0;
      await supabaseAdmin
        .from('collections')
        .update({ stok: currentStock + 1 })
        .eq('id', item.collection_id);
    }

    // 2. Periksa apakah semua item di transaksi ini sudah selesai
    const { data: remainingItems } = await supabaseAdmin
      .from('loan_items')
      .select('id')
      .eq('loan_id', item.loan_id)
      .eq('status', 'Dipinjam');

    if (!remainingItems || remainingItems.length === 0) {
      await supabaseAdmin
        .from('loans')
        .update({
          status: 'Selesai',
          tgl_kembali: new Date().toISOString().split('T')[0]
        })
        .eq('id', item.loan_id);
    }

    return new Response(JSON.stringify({
      success: true,
      message: aksi === 'rusak' ? 'Buku berhasil dicatat rusak/hilang.' : 'Buku berhasil dikembalikan dan stok diperbarui!'
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

