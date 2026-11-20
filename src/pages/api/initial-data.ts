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

    const collectionMap = new Map<string, any>();
    for (const c of collections) {
      const rawId = String(c.id).trim();
      const cleanId = rawId.replace(/\.0$/, '');
      collectionMap.set(rawId, c);
      collectionMap.set(cleanId, c);
    }

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

    // 3. Ambil riwayat peminjaman dari tabel loans Supabase (sumber utama)
    const { data: dbLoans = [] } = await supabaseAdmin
      .from('loans')
      .select(`
        id, student_npm, tgl_pinjam, batas_kembali, status, total_denda, hari_terlambat, tgl_kembali, created_at,
        students(nama),
        loan_items(id, status, collections(judul, rak))
      `)
      .order('tgl_pinjam', { ascending: false });

    let riwayat: any[] = [];
    const seenMap = new Set<string>();

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const TARIF_DENDA_PER_HARI = 1000;

    if (dbLoans && dbLoans.length > 0) {
      for (let i = 0; i < dbLoans.length; i++) {
        const nl = dbLoans[i];
        const mhsNama = (nl.students as any)?.nama || studentMap.get(nl.student_npm) || nl.student_npm;
        const sortedItems = ((nl.loan_items as any[]) || []).slice().sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
        const details = sortedItems.map(li => {
          const itemSt = String(li.status || '').toLowerCase();
          const prefix = itemSt === 'dikembalikan' ? '[DIKEMBALIKAN]' : (itemSt === 'rusak' ? '[RUSAK]' : '');
          return `${prefix}${li.collections?.judul || 'Buku'} | RAK: ${li.collections?.rak || '-'}`;
        }).join(' || ') || '';

        const rawSt = (nl.status || 'aktif').toLowerCase();
        let st = (rawSt === 'selesai' || rawSt === 'kembali' || rawSt === 'dikembalikan') ? 'dikembalikan' : (rawSt === 'dipinjam' ? 'aktif' : rawSt);
        let dendaNominal = Number(nl.total_denda || 0);
        let hariTelat = Number(nl.hari_terlambat || 0);

        // Kalkulasi denda real-time untuk pinjaman yang belum dikembalikan
        if (st !== 'dikembalikan' && nl.batas_kembali) {
          const dueParts = String(nl.batas_kembali).split('T')[0].split('-');
          if (dueParts.length === 3) {
            const dueMidnight = new Date(
              parseInt(dueParts[0], 10),
              parseInt(dueParts[1], 10) - 1,
              parseInt(dueParts[2], 10)
            ).getTime();
            const diffDays = Math.round((todayMidnight - dueMidnight) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
              st = 'terlambat';
              hariTelat = diffDays;
              dendaNominal = Math.max(dendaNominal, diffDays * TARIF_DENDA_PER_HARI);
            } else {
              st = 'aktif';
              hariTelat = 0;
              dendaNominal = 0;
            }
          }
        }

        const signature = `${nl.student_npm}_${nl.tgl_pinjam}`;
        seenMap.add(signature);
        seenMap.add(`${mhsNama.toUpperCase()}_${nl.tgl_pinjam}`);

        riwayat.push({
          noUrut: i + 1,
          id: String(nl.id),
          idTransaksi: String(nl.id),
          sheetRow: i + 2,
          mahasiswa: mhsNama,
          npm: String(nl.student_npm || '').replace(/\.0$/, ''),
          tglPinjam: formatTglIndo(nl.tgl_pinjam),
          batasKembali: formatTglIndo(nl.batas_kembali),
          tglHarusKembali: nl.batas_kembali,
          status: st,
          denda: dendaNominal > 0 ? `Rp ${dendaNominal.toLocaleString('id-ID')}` : '-',
          hariTerlambat: String(hariTelat),
          lastReminder: '-',
          detailBuku: details,
          tglKembali: formatTglIndo(nl.tgl_kembali || '-')
        });
      }
    }

    // Fallback: Jika ada data di CSV yang belum ada di Supabase, tambahkan tanpa duplikasi
    const csvPath = path.resolve('supabase_csv/peminjaman_history.csv');
    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const rows = parseCSV(csvContent);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 5 && row[1]) {
          const rawId = row[0]?.trim() || `TRX-${i}`;
          let mhs = row[1]?.trim() || '-';
          
          if (studentMap.has(mhs)) {
            mhs = studentMap.get(mhs)!;
          } else {
            const cleanM = mhs.replace(/\.0$/, '');
            if (studentMap.has(cleanM)) {
              mhs = studentMap.get(cleanM)!;
            }
          }

          const tglPinjamRaw = row[2]?.trim() || '-';
          const tglClean = tglPinjamRaw.split(' ')[0];
          const signature = `${mhs.toUpperCase()}_${tglClean}`;

          if (seenMap.has(signature)) continue;

          const batasKembaliRaw = row[3]?.trim() || '-';
          const rawStatus = (row[4]?.trim() || 'dikembalikan').toLowerCase();
          const denda = row[5]?.trim() || '-';
          const hariTerlambat = row[6]?.trim() || '0';
          const lastReminder = row[7]?.trim() || '-';
          const detailBuku = row[8]?.trim() || '';
          const tglKembali = row[9]?.trim() || '-';

          const status = (rawStatus === 'selesai' || rawStatus === 'kembali') ? 'dikembalikan' : rawStatus;

          riwayat.push({
            noUrut: riwayat.length + 1,
            id: rawId,
            idTransaksi: rawId,
            sheetRow: riwayat.length + 2,
            mahasiswa: mhs,
            tglPinjam: formatTglIndo(tglPinjamRaw),
            batasKembali: formatTglIndo(batasKembaliRaw),
            tglHarusKembali: batasKembaliRaw.split(' ')[0],
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

    // Ambil buku rusak dari Supabase jika ada dan perkaya dengan detail koleksi
    const { data: damaged = [] } = await supabaseAdmin
      .from('damaged_books')
      .select('*')
      .order('id', { ascending: false });

    const bukuRusakList = (damaged || []).map((d, idx) => {
      const colIdStr = String(d.collection_id || '').trim();
      const colInfo = collectionMap.get(colIdStr) || collectionMap.get(colIdStr.replace(/\.0$/, ''));
      const cleanId = String(d.collection_id || d.id || idx + 1).replace(/\.0$/, '');
      return {
        id: cleanId,
        judul: colInfo ? colInfo.judul : (d.collection_id || 'Buku Rusak'),
        penulis: colInfo ? (colInfo.penulis || '-') : '-',
        tahun: colInfo ? (colInfo.tahun_terbit || '-') : '-',
        stok: d.jumlah || 1,
        rak: colInfo ? (colInfo.rak || 'Ruang Baca TI') : 'Ruang Baca TI',
        kategori: 'Buku Rusak',
        keterangan: d.keterangan || '-'
      };
    });

    // 4. Hitung statistik
    const dataLit = collections.filter(c => c.kategori === 'Buku Literatur');
    const dataKp = collections.filter(c => c.kategori === 'Laporan KP');
    const dataSkripsi = collections.filter(c => c.kategori === 'Skripsi');

    const totalStok = collections.reduce((acc, c) => acc + (Number(c.stok) || 0), 0);

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
          aktif: cAktif + cTerlambat,
          terlambat: cTerlambat,
          dikembalikan: cKembali
        },
        mahasiswa: students.map((s, idx) => ({
          no: idx + 1,
          npm: String(s.npm || '').replace(/\.0$/, ''),
          nama: s.nama,
          angkatan: String(s.angkatan || '2023').replace(/\.0$/, ''),
          status: s.status || 'Aktif',
          email: s.email || '-',
          noHp: s.no_hp || '-'
        })),
        bukuPinjam: collections.map(c => ({
          id: String(c.id).replace(/\.0$/, ''),
          judul: c.judul,
          penulis: c.penulis || '-',
          tahun: c.tahun_terbit || '-',
          kategori: c.kategori,
          rak: c.rak || 'Ruang Baca TI',
          stok: Number(c.stok) ?? 1,
          keterangan: (c as any).keterangan || '-'
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
