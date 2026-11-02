import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { generateValidationCode } from '@/lib/utils';
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const query = String(body.npm || body.query || '').trim();

    if (!query) {
      return new Response(JSON.stringify({ success: false, message: 'NPM atau Nama wajib dimasukkan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Ambil data mahasiswa
    let { data: student } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('npm', query)
      .maybeSingle();

    if (!student) {
      const { data: matchedByName } = await supabaseAdmin
        .from('students')
        .select('*')
        .ilike('nama', `%${query}%`)
        .limit(1);

      if (matchedByName && matchedByName.length > 0) {
        student = matchedByName[0];
      }
    }

    if (!student) {
      student = {
        npm: query,
        nama: 'MAHASISWA ' + query,
        angkatan: query.length >= 6 ? '20' + query.substring(4, 6) : '2023',
        status: 'Aktif'
      };
    }

    let isEligible = true;
    let totalDenda = 0;

    // 2. Periksa riwayat CSV
    const csvPath = path.resolve('supabase_csv/peminjaman_history.csv');
    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const rows = parseCSV(csvContent);
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 5) {
          const mhs = (row[1] || '').toLowerCase();
          const qLower = query.toLowerCase();
          const sNameLower = (student.nama || '').toLowerCase();
          const sNpmLower = (student.npm || '').toLowerCase();

          const match = mhs.includes(qLower) || mhs.includes(sNameLower) || mhs.includes(sNpmLower);
          if (match) {
            const st = (row[4] || '').toLowerCase().trim();
            if (st !== 'dikembalikan' && st !== 'selesai') {
              isEligible = false;
            }
            const dendaRaw = row[5] || '-';
            if (dendaRaw && dendaRaw !== '-') {
              const num = Number(dendaRaw.replace(/[^0-9]/g, '')) || 0;
              totalDenda += num;
            }
          }
        }
      }
    }

    // 3. Periksa tanggungan peminjaman aktif & denda di tabel loans
    const { data: activeLoans } = await supabaseAdmin
      .from('loans')
      .select('id, tgl_pinjam, batas_kembali, status, total_denda')
      .eq('student_npm', student.npm)
      .in('status', ['Dipinjam', 'Terlambat']);

    if (activeLoans && activeLoans.length > 0) {
      isEligible = false;
      for (const al of activeLoans) {
        totalDenda += al.total_denda || 0;
      }
    }

    if (totalDenda > 0) isEligible = false;

    // 4. Nomor surat dan kode validasi
    const dt = new Date();
    const ymd = dt.getFullYear() + ('0' + (dt.getMonth() + 1)).slice(-2) + ('0' + dt.getDate()).slice(-2);
    const nomorSurat = `BP/${student.npm || 'TI'}/${ymd}`;
    const kodeValidasi = generateValidationCode(student.npm || 'TI');

    return new Response(JSON.stringify({
      success: true,
      eligible: isEligible,
      cleared: isEligible,
      mhs: student,
      student: student,
      totalDenda: totalDenda,
      nomorSurat: nomorSurat,
      kodeValidasi: kodeValidasi
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
