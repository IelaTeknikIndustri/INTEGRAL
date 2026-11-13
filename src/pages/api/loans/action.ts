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

    const today = new Date().toISOString().split('T')[0];

    // 1. Cek apakah ada di tabel loans Supabase
    const { data: loan } = await supabaseAdmin
      .from('loans')
      .select('id, student_npm, status, batas_kembali')
      .eq('id', idTransaksi)
      .maybeSingle();

    // 2. Ambil daftar loan_items untuk transaksi ini
    const { data: items = [] } = await supabaseAdmin
      .from('loan_items')
      .select('id, collection_id, status, tgl_kembali, collections(id, judul, stok)')
      .eq('loan_id', idTransaksi)
      .order('id', { ascending: true });

    const idx = typeof idxBuku === 'number' ? idxBuku : parseInt(String(idxBuku || '0'), 10);
    const targetItem = (items && items[idx]) ? items[idx] : (items && items.find(it => it.status === 'Dipinjam'));

    let message = 'Status buku berhasil diperbarui!';

    if (aksi === 'kembali') {
      if (targetItem && targetItem.status !== 'Dikembalikan') {
        await supabaseAdmin
          .from('loan_items')
          .update({ status: 'Dikembalikan', tgl_kembali: today })
          .eq('id', targetItem.id);

        // Kembalikan stok koleksi +1
        if (targetItem.collection_id) {
          const curStok = Number((targetItem.collections as any)?.stok ?? 0);
          await supabaseAdmin
            .from('collections')
            .update({ stok: curStok + 1 })
            .eq('id', targetItem.collection_id);
        }
      }

      // Cek apakah semua buku dalam transaksi ini sudah dikembalikan/selesai
      const remainingActive = (items || []).filter((it, i) => {
        if (targetItem && it.id === targetItem.id) return false;
        if (i === idx) return false;
        const st = String(it.status || '').toLowerCase();
        return st !== 'dikembalikan' && st !== 'rusak' && st !== 'selesai';
      });

      if (loan && remainingActive.length === 0) {
        await supabaseAdmin
          .from('loans')
          .update({ status: 'Selesai', tgl_kembali: today })
          .eq('id', idTransaksi);
        message = 'Buku berhasil dikembalikan dan seluruh transaksi dinyatakan selesai!';
      } else {
        const judulBuku = (targetItem?.collections as any)?.judul || 'Buku';
        message = `"${judulBuku}" berhasil dikembalikan ke rak! (${remainingActive.length} buku lain masih dipinjam)`;
      }
    } else if (aksi === 'perpanjang') {
      if (loan) {
        const now = new Date();
        const curDue = loan.batas_kembali ? new Date(loan.batas_kembali) : now;
        const baseDate = curDue > now ? curDue : now;
        baseDate.setDate(baseDate.getDate() + 7);
        const newBatas = baseDate.toISOString().split('T')[0];

        await supabaseAdmin
          .from('loans')
          .update({
            batas_kembali: newBatas,
            status: 'Dipinjam',
            hari_terlambat: 0,
            total_denda: 0
          })
          .eq('id', idTransaksi);
      }
      message = 'Masa pinjam berhasil diperpanjang selama 7 hari ke depan!';
    } else if (aksi === 'rusak') {
      if (targetItem) {
        await supabaseAdmin
          .from('loan_items')
          .update({ status: 'Rusak', tgl_kembali: today })
          .eq('id', targetItem.id);

        if (targetItem.collection_id) {
          await supabaseAdmin.from('damaged_books').insert({
            collection_id: String(targetItem.collection_id),
            keterangan: `Rusak/hilang saat dipinjam oleh ${namaMhs || loan?.student_npm || 'Mahasiswa'}`,
            jumlah: 1
          });
        }
      }

      const remainingActive = (items || []).filter((it, i) => {
        if (targetItem && it.id === targetItem.id) return false;
        if (i === idx) return false;
        const st = String(it.status || '').toLowerCase();
        return st !== 'dikembalikan' && st !== 'rusak' && st !== 'selesai';
      });

      if (loan && remainingActive.length === 0) {
        await supabaseAdmin
          .from('loans')
          .update({ status: 'Selesai', tgl_kembali: today })
          .eq('id', idTransaksi);
      }
      const judulBuku = (targetItem?.collections as any)?.judul || 'Buku';
      message = `"${judulBuku}" telah dicatat ke daftar Buku Rusak/Hilang!`;
    }

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
