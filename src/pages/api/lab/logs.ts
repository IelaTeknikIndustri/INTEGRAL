import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export interface LabLogItem {
  id: string;
  lab: 'Lab Komputer' | 'Lab Ergonomi' | 'Lab Manufaktur';
  peminjam: string;
  identitas: string;
  keperluan: string;
  jumlah_orang: number | string;
  checkin_time: string;
  aslab_checkin: string;
  status: 'AKTIF' | 'SELESAI';
  checkout_time?: string | null;
  aslab_checkout?: string | null;
  kondisi_selesai?: string | null;
  created_at: string;
}

const DEFAULT_SAMPLE_LOGS: LabLogItem[] = [
  {
    id: 'LAB-20261112-001',
    lab: 'Lab Komputer',
    peminjam: 'Dimas Aditya (Kelompok Praktikum CAD)',
    identitas: 'NPM 1411220012 / TI-5A',
    keperluan: 'Praktikum Desain Produk & Pemodelan SolidWorks',
    jumlah_orang: 18,
    checkin_time: '2026-11-12 13:30 WIB',
    aslab_checkin: 'Mochammad Luqman Firdaus',
    status: 'AKTIF',
    checkout_time: null,
    aslab_checkout: null,
    kondisi_selesai: null,
    created_at: new Date().toISOString()
  },
  {
    id: 'LAB-20261111-002',
    lab: 'Lab Ergonomi',
    peminjam: 'Rina Wulandari (Riset Tugas Akhir)',
    identitas: 'NPM 1411210045 / TI-7B',
    keperluan: 'Pengukuran Biomekanika Kerja & RULA/REBA Kursi Operator',
    jumlah_orang: 4,
    checkin_time: '2026-11-11 09:15 WIB',
    aslab_checkin: 'Iela (Asisten Lab)',
    status: 'SELESAI',
    checkout_time: '2026-11-11 11:45 WIB',
    aslab_checkout: 'Iela (Asisten Lab)',
    kondisi_selesai: 'Alat ukur antropometri rapi & PC dimatikan',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'LAB-20261110-003',
    lab: 'Lab Manufaktur',
    peminjam: 'Himpunan Mahasiswa Teknik Industri (HMTI)',
    identitas: 'Organisasi Mahasiswa TI UNIROW',
    keperluan: 'Persiapan Proyek Fabrikasi & Pemotongan Akrilik Expo',
    jumlah_orang: 8,
    checkin_time: '2026-11-10 14:00 WIB',
    aslab_checkin: 'Mochammad Luqman Firdaus',
    status: 'SELESAI',
    checkout_time: '2026-11-10 17:15 WIB',
    aslab_checkout: 'Mochammad Luqman Firdaus',
    kondisi_selesai: 'Mesin cutting mati, sisa material dibersihkan',
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
];

async function getStoredLogs(): Promise<LabLogItem[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('configs')
      .select('value')
      .eq('key', 'LAB_LOGS_DATA')
      .single();

    if (error || !data || !data.value) {
      // Inisialisasi awal dengan sample data jika belum ada di Supabase
      await supabaseAdmin.from('configs').upsert({
        key: 'LAB_LOGS_DATA',
        value: JSON.stringify(DEFAULT_SAMPLE_LOGS),
        keterangan: 'Data log peminjaman dan akses 3 laboratorium TI UNIROW'
      });
      return DEFAULT_SAMPLE_LOGS;
    }

    const parsed = JSON.parse(data.value);
    return Array.isArray(parsed) ? parsed : DEFAULT_SAMPLE_LOGS;
  } catch (e) {
    return DEFAULT_SAMPLE_LOGS;
  }
}

async function saveStoredLogs(logs: LabLogItem[]) {
  const { error } = await supabaseAdmin
    .from('configs')
    .upsert({
      key: 'LAB_LOGS_DATA',
      value: JSON.stringify(logs),
      keterangan: 'Data log peminjaman dan akses 3 laboratorium TI UNIROW',
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

export const GET: APIRoute = async () => {
  try {
    const logs = await getStoredLogs();
    return new Response(JSON.stringify({
      success: true,
      logs
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action } = body;
    const logs = await getStoredLogs();

    if (action === 'checkin') {
      const { lab, peminjam, identitas, keperluan, jumlah_orang, aslab_checkin, checkin_time } = body;

      if (!lab || !peminjam || !keperluan || !aslab_checkin) {
        return new Response(JSON.stringify({ success: false, message: 'Harap lengkapi semua data wajib check-in!' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Cek apakah lab sedang aktif digunakan orang lain
      const labInUse = logs.find(l => l.lab === lab && l.status === 'AKTIF');
      if (labInUse) {
        return new Response(JSON.stringify({
          success: false,
          message: `${lab} saat ini masih aktif digunakan oleh ${labInUse.peminjam}. Harap check-out terlebih dahulu!`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randPart = Math.floor(100 + Math.random() * 900);
      const newId = `LAB-${datePart}-${randPart}`;

      const newLog: LabLogItem = {
        id: newId,
        lab,
        peminjam: String(peminjam).trim(),
        identitas: String(identitas || '-').trim(),
        keperluan: String(keperluan).trim(),
        jumlah_orang: jumlah_orang ? String(jumlah_orang).trim() : '1 Orang',
        checkin_time: checkin_time || (now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'),
        aslab_checkin: String(aslab_checkin).trim(),
        status: 'AKTIF',
        checkout_time: null,
        aslab_checkout: null,
        kondisi_selesai: null,
        created_at: now.toISOString()
      };

      logs.unshift(newLog);
      await saveStoredLogs(logs);

      return new Response(JSON.stringify({
        success: true,
        message: `Check-in ${lab} untuk ${newLog.peminjam} berhasil dicatat!`,
        log: newLog
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'checkout') {
      const { id, aslab_checkout, kondisi_selesai, checkout_time } = body;

      if (!id || !aslab_checkout) {
        return new Response(JSON.stringify({ success: false, message: 'ID log dan Aslab Check-Out wajib diisi!' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const logIndex = logs.findIndex(l => l.id === id);
      if (logIndex === -1) {
        return new Response(JSON.stringify({ success: false, message: 'Data log penggunaan lab tidak ditemukan!' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const now = new Date();
      logs[logIndex].status = 'SELESAI';
      logs[logIndex].checkout_time = checkout_time || (now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
      logs[logIndex].aslab_checkout = String(aslab_checkout).trim();
      logs[logIndex].kondisi_selesai = String(kondisi_selesai || 'Kondisi ruangan rapi & aman').trim();

      await saveStoredLogs(logs);

      return new Response(JSON.stringify({
        success: true,
        message: `Check-out ${logs[logIndex].lab} berhasil! Fasilitas kini telah berstatus Tersedia.`,
        log: logs[logIndex]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, message: 'Action tidak valid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
