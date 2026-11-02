import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.some(cell => cell.trim().length > 0)) lines.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    if (row.some(cell => cell.trim().length > 0)) lines.push(row);
  }
  return lines;
}

function formatTglIndo(tglVal: string): string {
  if (!tglVal || tglVal === '-') return '-';
  const raw = tglVal.includes('||') ? tglVal.split('||')[0].trim() : tglVal.trim();
  const d = new Date(raw);
  if (isNaN(d.getTime())) return tglVal;
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const dd = ('0' + d.getDate()).slice(-2);
  const mm = bulan[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
}

export const GET: APIRoute = async () => {
  try {
    // 1. Ambil seluruh koleksi buku dari Supabase
    const { data: collections = [], error: colErr } = await supabaseAdmin
      .from('collections')
      .select('id, judul, penulis, tahun_terbit, stok, rak, kategori')
      .order('id', { ascending: true });

    if (colErr) throw colErr;

    // 2. Ambil seluruh mahasiswa dari Supabase
    const { data: students = [], error: stuErr } = await supabaseAdmin
      .from('students')
      .select('npm, nama, angkatan, status, email, no_hp')
      .order('nama', { ascending: true });

    if (stuErr) throw stuErr;

    // Map student lookup for name and NPM
    const studentMap = new Map<string, string>();
    for (const s of students) {
      const cleanNpm = String(s.npm).trim();
      studentMap.set(cleanNpm, s.nama.toUpperCase());
      studentMap.set(cleanNpm + '.0', s.nama.toUpperCase());
    }

    // 3. Ambil riwayat peminjaman dari peminjaman_history.csv
    const csvPath = path.resolve('supabase_csv/peminjaman_history.csv');
    let riwayat: any[] = [];

    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const rows = parseCSV(csvContent);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 5 && row[1]) {
          const rawId = row[0]?.trim() || `TRX-${i}`;
          let mhs = row[1]?.trim() || '-';
          
          // Resolve NPM to Student Name if it was stored as NPM
          if (studentMap.has(mhs)) {
            mhs = studentMap.get(mhs)!;
          } else {
            const cleanM = mhs.replace(/\.0$/, '');
            if (studentMap.has(cleanM)) {
              mhs = studentMap.get(cleanM)!;
            }
          }

          const tglPinjamRaw = row[2]?.trim() || '-';
          const batasKembaliRaw = row[3]?.trim() || '-';
          const rawStatus = (row[4]?.trim() || 'dikembalikan').toLowerCase();
          const denda = row[5]?.trim() || '-';
          const hariTerlambat = row[6]?.trim() || '0';
          const lastReminder = row[7]?.trim() || '-';
          const detailBuku = row[8]?.trim() || '';
          const tglKembali = row[9]?.trim() || '-';

          const status = (rawStatus === 'selesai' || rawStatus === 'kembali') ? 'dikembalikan' : rawStatus;

          riwayat.push({
            noUrut: i,
            id: rawId,
            idTransaksi: rawId,
            sheetRow: i + 1,
            mahasiswa: mhs,
            tglPinjam: formatTglIndo(tglPinjamRaw),
            batasKembali: formatTglIndo(batasKembaliRaw),
            status: status,
            denda: denda,
            hariTerlambat: hariTerlambat,
            lastReminder: lastReminder,
            detailBuku: detailBuku,
            tglKembali: formatTglIndo(tglKembali)
          });
        }
      }
    }

    // Ambil juga transaksi baru dari tabel loans Supabase jika ada
    const { data: newLoans = [] } = await supabaseAdmin
      .from('loans')
      .select(`
        id, student_npm, tgl_pinjam, batas_kembali, status, total_denda, hari_terlambat, tgl_kembali,
        students(nama),
        loan_items(collections(judul, rak))
      `);

    if (newLoans && newLoans.length > 0) {
      for (let i = 0; i < newLoans.length; i++) {
        const nl = newLoans[i];
        const mhsNama = (nl.students as any)?.nama || studentMap.get(nl.student_npm) || nl.student_npm;
        const details = (nl.loan_items as any[])?.map(li => `${li.collections?.judul || 'Buku'} | RAK: ${li.collections?.rak || '-'}`).join(' || ') || '';
        const rawSt = (nl.status || 'aktif').toLowerCase();
        const st = (rawSt === 'selesai' || rawSt === 'kembali') ? 'dikembalikan' : rawSt;

        riwayat.unshift({
          noUrut: riwayat.length + 1,
          id: nl.id,
          idTransaksi: nl.id,
          sheetRow: riwayat.length + 2,
          mahasiswa: mhsNama,
          tglPinjam: formatTglIndo(nl.tgl_pinjam),
          batasKembali: formatTglIndo(nl.batas_kembali),
          status: st,
          denda: nl.total_denda > 0 ? `Rp ${nl.total_denda.toLocaleString('id-ID')}` : '-',
          hariTerlambat: String(nl.hari_terlambat || 0),
          lastReminder: '-',
          detailBuku: details,
          tglKembali: formatTglIndo(nl.tgl_kembali || '-')
        });
      }
    }

    // Ambil buku rusak dari Supabase jika ada
    const { data: damaged = [] } = await supabaseAdmin
      .from('damaged_books')
      .select('*');

    const bukuRusakList = (damaged || []).map((d, idx) => ({
      id: d.id || String(idx + 1),
      judul: d.collection_id || 'Buku Rusak',
      penulis: '-',
      tahun: '-',
      stok: d.jumlah || 1,
      rak: 'Ruang Baca TI',
      kategori: 'Buku Rusak',
      keterangan: d.keterangan || '-'
    }));

    // 4. Hitung statistik
    const dataLit = collections.filter(c => c.kategori === 'Buku Literatur');
    const dataKp = collections.filter(c => c.kategori === 'Laporan KP');
    const dataSkripsi = collections.filter(c => c.kategori === 'Skripsi');

    const totalStok = collections.reduce((acc, c) => acc + (Number(c.stok) || 1), 0);

    let cAktif = 0;
    let cTerlambat = 0;
    let cKembali = 0;

    riwayat.forEach(r => {
      const st = (r.status || '').toLowerCase();
      if (st === 'aktif' || st === 'dipinjam') cAktif++;
      else if (st === 'terlambat') cTerlambat++;
      else if (st === 'dikembalikan') cKembali++;
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        stats: {
          lit: dataLit.length,
          kp: dataKp.length,
          skripsi: dataSkripsi.length,
          totalStok: totalStok,
          mahasiswa: students.length,
          aktif: cAktif,
          terlambat: cTerlambat,
          dikembalikan: cKembali
        },
        mahasiswa: students.map((s, idx) => ({
          no: idx + 1,
          npm: s.npm,
          nama: s.nama,
          angkatan: String(s.angkatan || '2023').replace(/\.0$/, ''),
          status: s.status || 'Aktif',
          email: s.email || '-',
          noHp: s.no_hp || '-'
        })),
        bukuPinjam: collections.map(c => ({
          id: c.id,
          judul: c.judul,
          penulis: c.penulis || '-',
          tahun: c.tahun_terbit || '-',
          kategori: c.kategori,
          rak: c.rak || 'Ruang Baca TI',
          stok: Number(c.stok) || 1,
          keterangan: c.keterangan || '-'
        })),
        bukuRusak: bukuRusakList,
        riwayat: riwayat
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
