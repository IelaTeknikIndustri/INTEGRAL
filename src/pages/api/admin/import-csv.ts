import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

function parseFlexibleCSV(rawText: string): string[][] {
  let text = rawText.replace(/^\uFEFF/, '').trim();
  // Strip Excel sep= header if present
  if (/^sep=.;?\r?\n/i.test(text)) {
    text = text.replace(/^sep=.;?\r?\n/i, '');
  }

  // Detect delimiter from first line (; vs ,)
  const firstLine = text.split(/\r?\n/)[0] || '';
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delim = semiCount > commaCount ? ';' : ',';

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
    } else if (c === delim && !inQuotes) {
      row.push(cur.trim());
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(cur.trim());
      cur = '';
      if (row.some(cell => cell.length > 0)) lines.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    if (row.some(cell => cell.length > 0)) lines.push(row);
  }
  return lines;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const targetSheet = String(body.targetSheet || 'mahasiswa').trim();
    const csvText = String(body.txt || body.csvText || '').trim();

    if (!csvText) {
      return new Response(JSON.stringify({ success: false, message: 'Data CSV kosong!' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const rows = parseFlexibleCSV(csvText);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Tidak ada baris CSV yang valid.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const firstRowLower = rows[0].map(c => c.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    const hasHeader = firstRowLower.some(h =>
      ['nama', 'npm', 'judul', 'penulis', 'kategori', 'angkatan', 'email', 'rak'].includes(h)
    );
    const dataRows = hasHeader ? rows.slice(1) : rows;

    if (dataRows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Hanya terdapat baris header, belum ada baris data.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (targetSheet.toLowerCase() === 'mahasiswa') {
      const idxNama = firstRowLower.findIndex(h => h.includes('nama'));
      const idxNpm = firstRowLower.findIndex(h => h.includes('npm') || h.includes('nim'));
      const idxAngkatan = firstRowLower.findIndex(h => h.includes('angkatan') || h.includes('tahun'));
      const idxStatus = firstRowLower.findIndex(h => h.includes('status'));
      const idxEmail = firstRowLower.findIndex(h => h.includes('email'));
      const idxHp = firstRowLower.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp'));

      const payload: any[] = [];
      for (const r of dataRows) {
        if (r.length < 2) continue;
        const cleanCell = (v?: string) => String(v || '').replace(/^'+/, '').trim();

        let nama = '';
        let npm = '';
        let angkatan = '';
        let status = 'Aktif';
        let email = '';
        let no_hp = '-';

        if (hasHeader && idxNama > -1 && idxNpm > -1) {
          nama = cleanCell(r[idxNama]).toUpperCase();
          npm = cleanCell(r[idxNpm]).replace(/\.0$/, '');
          angkatan = idxAngkatan > -1 ? cleanCell(r[idxAngkatan]) : '';
          status = idxStatus > -1 ? (cleanCell(r[idxStatus]) || 'Aktif') : 'Aktif';
          email = idxEmail > -1 ? cleanCell(r[idxEmail]) : '';
          no_hp = idxHp > -1 ? (cleanCell(r[idxHp]) || '-') : '-';
        } else {
          // Positional fallback: check if r[0] is No (1, 2, 3...)
          const offset = /^\d{1,4}$/.test(cleanCell(r[0])) && r.length >= 3 ? 1 : 0;
          const c1 = cleanCell(r[offset]);
          const c2 = cleanCell(r[offset + 1]);
          if (/^\d{6,}/.test(c1)) {
            npm = c1.replace(/\.0$/, '');
            nama = c2.toUpperCase();
          } else {
            nama = c1.toUpperCase();
            npm = c2.replace(/\.0$/, '');
          }
          angkatan = cleanCell(r[offset + 2]) || '';
          status = cleanCell(r[offset + 3]) || 'Aktif';
          email = cleanCell(r[offset + 4]) || '';
          no_hp = cleanCell(r[offset + 5]) || '-';
        }

        if (!npm || !nama) continue;
        if (!angkatan || !/^\d{4}$/.test(angkatan)) {
          angkatan = (npm.length >= 6 && !isNaN(Number(npm.substring(4, 6))))
            ? '20' + npm.substring(4, 6)
            : '2023';
        }
        if (!email) email = `${npm}@unirow.ac.id`;

        payload.push({
          npm,
          nama,
          angkatan,
          status,
          email,
          no_hp
        });
      }

      if (payload.length === 0) {
        return new Response(JSON.stringify({ success: false, message: 'Tidak ditemukan baris mahasiswa (NPM & Nama) yang valid.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const { error } = await supabaseAdmin.from('students').upsert(payload, { onConflict: 'npm' });
      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: `Berhasil mengimpor & memperbarui ${payload.length} data mahasiswa ke Supabase!`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Import Koleksi Buku (Buku Literatur / Laporan KP / Skripsi)
      const { data: allIds } = await supabaseAdmin.from('collections').select('id');
      let maxNum = 1000;
      if (allIds) {
        for (const item of allIds) {
          const n = parseInt(String(item.id).replace(/[^0-9]/g, ''), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }

      const idxId = firstRowLower.findIndex(h => h === 'id' || h === 'kode');
      const idxJudul = firstRowLower.findIndex(h => h.includes('judul'));
      const idxPenulis = firstRowLower.findIndex(h => h.includes('penulis') || h.includes('pengarang') || h.includes('penyusun'));
      const idxTahun = firstRowLower.findIndex(h => h.includes('tahun'));
      const idxStok = firstRowLower.findIndex(h => h.includes('stok') || h.includes('jumlah'));
      const idxRak = firstRowLower.findIndex(h => h.includes('rak') || h.includes('lokasi'));
      const idxKat = firstRowLower.findIndex(h => h.includes('kategori'));

      const payload: any[] = [];
      for (const r of dataRows) {
        if (r.length < 1) continue;
        let id = '';
        let judul = '';
        let penulis = '-';
        let tahun_terbit = String(new Date().getFullYear());
        let stok = 1;
        let rak = 'Ruang Baca TI';
        let kategori = targetSheet;

        if (hasHeader && idxJudul > -1) {
          id = idxId > -1 ? r[idxId] : '';
          judul = r[idxJudul] || '';
          penulis = idxPenulis > -1 ? (r[idxPenulis] || '-') : '-';
          tahun_terbit = idxTahun > -1 ? (r[idxTahun] || '-') : '-';
          stok = idxStok > -1 ? (parseInt(r[idxStok], 10) || 1) : 1;
          rak = idxRak > -1 ? (r[idxRak] || 'Ruang Baca TI') : 'Ruang Baca TI';
          kategori = (idxKat > -1 && r[idxKat]) ? r[idxKat] : targetSheet;
        } else {
          // Positional: ID, JUDUL, PENULIS, TAHUN, STOK, RAK
          if (r.length >= 5 && /^\d+$/.test(r[0])) {
            id = r[0];
            judul = r[1] || '';
            penulis = r[2] || '-';
            tahun_terbit = r[3] || '-';
            stok = parseInt(r[4], 10) || 1;
            rak = r[5] || 'Ruang Baca TI';
          } else {
            judul = r[0] || '';
            penulis = r[1] || '-';
            tahun_terbit = r[2] || '-';
            stok = parseInt(r[3], 10) || 1;
            rak = r[4] || 'Ruang Baca TI';
          }
        }

        if (!judul.trim()) continue;
        if (!id.trim()) {
          maxNum++;
          id = String(maxNum);
        }

        payload.push({
          id: id.trim(),
          judul: judul.trim(),
          penulis: penulis.trim() || '-',
          tahun_terbit: tahun_terbit.trim() || '-',
          stok: Math.max(0, stok),
          rak: rak.trim() || 'Ruang Baca TI',
          kategori: kategori.trim() || targetSheet
        });
      }

      if (payload.length === 0) {
        return new Response(JSON.stringify({ success: false, message: 'Tidak ditemukan baris koleksi buku yang valid.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const { error } = await supabaseAdmin.from('collections').upsert(payload, { onConflict: 'id' });
      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: `Berhasil mengimpor & memperbarui ${payload.length} koleksi (${targetSheet}) ke Supabase!`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
