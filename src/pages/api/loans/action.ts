import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { idTransaksi, idxBuku, aksi, namaMhs } = await request.json();

    if (!idTransaksi) {
      return new Response(JSON.stringify({ success: false, message: 'ID Transaksi wajib disertakan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cek apakah ada di tabel loans Supabase
    const { data: loan } = await supabaseAdmin
      .from('loans')
      .select('id, status, batas_kembali')
      .eq('id', idTransaksi)
      .single();

    if (loan) {
      if (aksi === 'kembali') {
        await supabaseAdmin
          .from('loans')
          .update({ status: 'Selesai', tgl_kembali: new Date().toISOString().split('T')[0] })
          .eq('id', idTransaksi);
      } else if (aksi === 'perpanjang') {
        const curDate = new Date(loan.batas_kembali || new Date());
        curDate.setDate(curDate.getDate() + 7);
        await supabaseAdmin
          .from('loans')
          .update({ batas_kembali: curDate.toISOString().split('T')[0] })
          .eq('id', idTransaksi);
      }
    }

    let message = 'Status buku diperbarui!';
    if (aksi === 'kembali') message = 'Buku berhasil ditandai telah dikembalikan ke rak!';
    else if (aksi === 'perpanjang') message = 'Masa pinjam berhasil diperpanjang selama 7 hari!';
    else if (aksi === 'rusak') message = 'Buku berhasil dicatat sebagai rusak/hilang!';

    return new Response(JSON.stringify({ success: true, message }), {
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

