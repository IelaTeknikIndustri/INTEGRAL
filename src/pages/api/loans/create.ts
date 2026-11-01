import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { student_npm, collection_ids, durasi_hari = 7 } = await request.json();

    if (!student_npm || !collection_ids || !Array.isArray(collection_ids) || collection_ids.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'NPM mahasiswa dan minimal 1 buku wajib dipilih' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Verifikasi mahasiswa
    const { data: student, error: studentErr } = await supabaseAdmin
      .from('students')
      .select('npm, nama')
      .eq('npm', student_npm.trim())
      .single();

    if (studentErr || !student) {
      return new Response(JSON.stringify({ success: false, message: 'Mahasiswa tidak ditemukan' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Cek stok koleksi
    const { data: collections, error: colErr } = await supabaseAdmin
      .from('collections')
      .select('id, judul, stok')
      .in('id', collection_ids);

    if (colErr || !collections || collections.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Buku tidak ditemukan' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    for (const c of collections) {
      if (c.stok <= 0) {
        return new Response(JSON.stringify({ success: false, message: `Buku "${c.judul}" saat ini stoknya habis (0)` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 3. Hitung tanggal pinjam & batas kembali
    const today = new Date();
    const tglPinjam = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + Number(durasi_hari));
    const batasKembali = dueDate.toISOString().split('T')[0];

    // 4. Buat record transaksi peminjaman
    const { data: newLoan, error: loanErr } = await supabaseAdmin
      .from('loans')
      .insert({
        student_npm: student.npm,
        tgl_pinjam: tglPinjam,
        batas_kembali: batasKembali,
        status: 'Dipinjam',
        total_denda: 0
      })
      .select()
      .single();

    if (loanErr) throw loanErr;

    // 5. Buat items dan kurangi stok
    for (const c of collections) {
      await supabaseAdmin.from('loan_items').insert({
        loan_id: newLoan.id,
        collection_id: c.id,
        status: 'Dipinjam'
      });

      await supabaseAdmin
        .from('collections')
        .update({ stok: Math.max(0, c.stok - 1) })
        .eq('id', c.id);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Transaksi peminjaman berhasil dicatat!',
      loan_id: newLoan.id
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

