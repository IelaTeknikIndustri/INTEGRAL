import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const trxId = body.idTransaksi || body.activeTrxId || body.trxId || body.loan_id;
    const loanItemId = body.loan_item_id;

    if (!trxId && !loanItemId) {
      return new Response(JSON.stringify({ success: false, message: 'ID transaksi atau ID item wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Jika mengembalikan seluruh transaksi (trxId)
    if (trxId) {
      // 1. Ambil items terkait transaksi jika ada di Supabase
      const { data: items } = await supabaseAdmin
        .from('loan_items')
        .select('id, collection_id, status')
        .eq('loan_id', trxId);

      if (items && items.length > 0) {
        for (const item of items) {
          if (item.status === 'Dipinjam') {
            await supabaseAdmin
              .from('loan_items')
              .update({ status: 'Dikembalikan', tgl_kembali: today })
              .eq('id', item.id);

            // Tambah stok koleksi
            const { data: col } = await supabaseAdmin
              .from('collections')
              .select('stok')
              .eq('id', item.collection_id)
              .single();

            if (col) {
              await supabaseAdmin
                .from('collections')
                .update({ stok: (col.stok || 0) + 1 })
                .eq('id', item.collection_id);
            }
          }
        }
      }

      // Update status loan di Supabase
      await supabaseAdmin
        .from('loans')
        .update({ status: 'Selesai', tgl_kembali: today })
        .eq('id', trxId);

      return new Response(JSON.stringify({
        success: true,
        message: 'Seluruh buku pada transaksi berhasil ditandai telah dikembalikan!'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Jika mengembalikan item individual (loanItemId)
    const { data: item, error: itemErr } = await supabaseAdmin
      .from('loan_items')
      .select('id, loan_id, collection_id, status, collections(id, judul, stok)')
      .eq('id', loanItemId)
      .single();

    if (itemErr || !item) {
      return new Response(JSON.stringify({ success: false, message: 'Item peminjaman tidak ditemukan' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await supabaseAdmin
      .from('loan_items')
      .update({ status: 'Dikembalikan', tgl_kembali: today })
      .eq('id', loanItemId);

    const currentStock = (item.collections as any)?.stok || 0;
    await supabaseAdmin
      .from('collections')
      .update({ stok: currentStock + 1 })
      .eq('id', item.collection_id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Buku berhasil dikembalikan!'
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
