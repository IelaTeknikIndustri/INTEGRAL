export interface Collection {
  id: string;
  kategori: 'Buku Literatur' | 'Laporan KP' | 'Skripsi';
  judul: string;
  penulis: string;
  tahun_terbit: string;
  stok: number;
  rak: string;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  npm: string;
  nama: string;
  angkatan: string;
  status: 'Aktif' | 'Alumni' | 'Cuti';
  email?: string;
  no_hp?: string;
  created_at?: string;
}

export interface User {
  id: string;
  username: string;
  nama_lengkap: string;
  role: 'Superadmin' | 'Aslab' | 'Staff';
  status: 'Aktif' | 'Nonaktif';
}

export interface Loan {
  id: string;
  student_npm: string;
  tgl_pinjam: string;
  batas_kembali: string;
  tgl_kembali?: string | null;
  status: 'Dipinjam' | 'Selesai' | 'Terlambat';
  total_denda: number;
  hari_terlambat: number;
  last_reminder_sent?: string | null;
  created_at?: string;
  students?: Student;
  loan_items?: LoanItem[];
}

export interface LoanItem {
  id: string;
  loan_id: string;
  collection_id: string;
  status: 'Dipinjam' | 'Dikembalikan' | 'Rusak';
  tgl_kembali?: string | null;
  keterangan?: string | null;
  collections?: Collection;
}

export interface Clearance {
  id: string;
  student_npm: string;
  nomor_surat: string;
  kode_validasi: string;
  issued_at: string;
  petugas_nama: string;
  students?: Student;
}

