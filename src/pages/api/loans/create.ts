import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const rawStudent = String(body.student_npm || body.namaPeminjam || '').trim();
    const collectionIds = body.collection_ids || body.selectedBukuIds || [];
    const durasiHari = Number(body.durasi_hari || 7);

    if (!rawStudent || !Array.isArray(collectionIds) || collectionIds.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Nama/NPM mahasiswa dan minimal 1 buku wajib dipilih' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Verifikasi mahasiswa
    // Coba ekstrak NPM jika ada (misal: "1411230105 - NAMA")
    const npmMatch = rawStudent.match(/\d{6,}/);
    let targetNpm = npmMatch ? npmMatch[0] : rawStudent;

    let { data: student } = await supabaseAdmin
      .from('students')
      .select('npm, nama')
      .eq('npm', targetNpm)
      .maybeSingle();

    if (!student) {
      // Cari berdasarkan nama
      const { data: matchedByName } = await supabaseAdmin
        .from('students')
        .select('npm, nama')
        .ilike('nama', `%${rawStudent.split(' - ')[0]}%`)
        .limit(1);

      if (matchedByName && matchedByName.length > 0) {
        student = matchedByName[0];
        targetNpm = student.npm;
      }
    }

    if (!student) {
      // Fallback: daftarkan mahasiswa otomatis jika belum ada
      targetNpm = npmMatch ? npmMatch[0] : `MHS-${Date.now().toString().slice(-4)}`;
      const namaMhs = rawStudent.includes(' - ') ? rawStudent.split(' - ')[1] : rawStudent;
      const { data: newStu } = await supabaseAdmin.from('students').insert({
        npm: targetNpm,
        nama: namaMhs.toUpperCase(),
        angkatan: targetNpm.length >= 6 ? '20' + targetNpm.substring(4, 6) : '2023',
        status: 'Aktif'
      }).select().single();
      student = newStu || { npm: targetNpm, nama: namaMhs };
    }

    // 2. Cek stok koleksi
    const { data: collections, error: colErr } = await supabaseAdmin
      .from('collections')
      .select('id, judul, stok, rak')
      .in('id', collectionIds);

    if (colErr || !collections || collections.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Buku yang dipilih tidak ditemukan dalam katalog' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    for (const c of collections) {
      if (Number(c.stok || 0) <= 0) {
        return new Response(JSON.stringify({ success: false, message: `Stok buku "${c.judul}" sedang habis (0)` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 3. Hitung tanggal pinjam & batas kembali
    const today = new Date();
    const tglPinjam = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + durasiHari);
    const batasKembali = dueDate.toISOString().split('T')[0];

    // 4. Buat record transaksi peminjaman
    const { data: newLoan, error: loanErr } = await supabaseAdmin
      .from('loans')
      .insert({
        student_npm: targetNpm,
        tgl_pinjam: tglPinjam,
        batas_kembali: batasKembali,
        status: 'Dipinjam',
        total_denda: 0
      })
      .select()
      .single();

    if (loanErr || !newLoan) throw loanErr || new Error('Gagal mencatat peminjaman');

    // 5. Tambahkan item peminjaman & kurangi stok buku
    const loanItems = collections.map(c => ({
      loan_id: newLoan.id,
      collection_id: c.id,
      status: 'Dipinjam'
    }));

    await supabaseAdmin.from('loan_items').insert(loanItems);

    for (const c of collections) {
      await supabaseAdmin
        .from('collections')
        .update({ stok: Math.max(0, (c.stok || 1) - 1) })
        .eq('id', c.id);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Peminjaman ${collections.length} buku untuk ${student.nama} berhasil dicatat!`,
      loan: newLoan
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
