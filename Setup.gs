/**
 * ====================================================================
 * INTEGRAL - Industrial Integrated Library
 * Ruang Baca Program Studi Teknik Industri UNIROW Tuban
 * FILE: setup.gs
 * ====================================================================
 */

var DEFAULT_TEMPLATE_SURAT = 
  '<div style="text-align:center; border-bottom:3px double #000; padding-bottom:10px; margin-bottom:16px;">\n' +
  '  <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">\n' +
  '    <tr>\n' +
  '      <td style="width:90px; text-align:center; vertical-align:middle;">\n' +
  '        <img src="https://i.ibb.co/kskd8DBN/1.png" alt="UNIROW" style="height:70px; object-fit:contain;">\n' +
  '      </td>\n' +
  '      <td style="text-align:center; vertical-align:middle;">\n' +
  '        <h3 style="font-size:15pt; margin:0; text-transform:uppercase; font-weight:bold; letter-spacing:0.5px;">UNIVERSITAS PGRI RONGGOLAWE (UNIROW) TUBAN</h3>\n' +
  '        <h4 style="font-size:13pt; margin:3px 0; text-transform:uppercase; font-weight:bold;">PROGRAM STUDI TEKNIK INDUSTRI</h4>\n' +
  '        <h5 style="font-size:11pt; margin:0; text-transform:uppercase; font-weight:bold;">RUANG BACA &amp; PUSTAKA INTEGRAL</h5>\n' +
  '        <p style="font-size:8.5pt; margin:3px 0 0 0; font-style:italic;">Jl. Manunggal No. 61 Tuban, Jawa Timur 62319 &bull; Email: industri@unirow.ac.id</p>\n' +
  '      </td>\n' +
  '      <td style="width:90px; text-align:center; vertical-align:middle;">\n' +
  '        <img src="https://i.ibb.co/xqkdqtmp/2-1.png" alt="INTEGRAL" style="height:65px; object-fit:contain;">\n' +
  '      </td>\n' +
  '    </tr>\n' +
  '  </table>\n' +
  '</div>\n\n' +
  '<div style="text-align:center; margin-bottom:20px;">\n' +
  '  <h4 style="font-size:13pt; text-decoration:underline; margin:0 0 4px 0; text-transform:uppercase; font-weight:bold;">SURAT KETERANGAN BEBAS RUANG BACA</h4>\n' +
  '  <div style="font-size:11pt;">Nomor: {{NOMOR_SURAT}}</div>\n' +
  '</div>\n\n' +
  '<p style="font-size:11pt; line-height:1.6; margin-bottom:12px;">\n' +
  '  Koordinator Ruang Baca Program Studi Teknik Industri Universitas PGRI Ronggolawe (UNIROW) Tuban dengan ini menerangkan bahwa:\n' +
  '</p>\n\n' +
  '<table style="width:100%; font-size:11pt; margin-bottom:14px; border-collapse:collapse;">\n' +
  '  <tr><td style="width:230px; padding:3px 0;">Nama Mahasiswa</td><td style="width:15px;">:</td><td><strong>{{NAMA}}</strong></td></tr>\n' +
  '  <tr><td style="padding:3px 0;">Nomor Pokok Mahasiswa (NPM)</td><td>:</td><td><strong>{{NPM}}</strong></td></tr>\n' +
  '  <tr><td style="padding:3px 0;">Program Studi</td><td>:</td><td>Teknik Industri (S-1)</td></tr>\n' +
  '  <tr><td style="padding:3px 0;">Angkatan / Status</td><td>:</td><td>{{ANGKATAN}} / {{STATUS}}</td></tr>\n' +
  '</table>\n\n' +
  '<p style="font-size:11pt; line-height:1.6; margin-bottom:10px;">\n' +
  '  Berdasarkan pemeriksaan basis data sistem terintegrasi (INTEGRAL), mahasiswa yang bersangkutan dinyatakan <strong>TELAH BEBAS DARI SEGALA TANGGUNGAN</strong>, meliputi:\n' +
  '</p>\n\n' +
  '<ol style="font-size:11pt; line-height:1.6; margin-left:22px; margin-bottom:14px;">\n' +
  '  <li>Peminjaman buku literatur dan referensi teks kuliah.</li>\n' +
  '  <li>Peminjaman naskah Laporan Kerja Praktik (KP).</li>\n' +
  '  <li>Peminjaman naskah Tugas Akhir / Skripsi sarjana.</li>\n' +
  '  <li>Tunggakan denda keterlambatan pengembalian buku (Rp 0 / Lunas).</li>\n' +
  '</ol>\n\n' +
  '<p style="font-size:11pt; line-height:1.6; margin-bottom:24px;">\n' +
  '  Surat keterangan ini diterbitkan secara sah oleh sistem untuk dipergunakan sebagai persyaratan pendaftaran Yudisium, Bebas Pustaka Fakultas, dan Pengambilan Ijazah Wisuda.\n' +
  '</p>\n\n' +
  '<div style="display:flex; justify-content:space-between; font-size:11pt; margin-top:20px;">\n' +
  '  <div style="border:1px solid #000; padding:10px; width:220px; text-align:center; height:90px;">\n' +
  '    <div style="font-size:8.5pt; margin-bottom:4px;">Verifikasi Sistem INTEGRAL:</div>\n' +
  '    <div style="font-weight:bold; font-size:10pt; margin-top:16px;">{{KODE_VALIDASI}}</div>\n' +
  '  </div>\n' +
  '  <div style="text-align:center; width:240px;">\n' +
  '    <div>{{TANGGAL_SURAT}}</div>\n' +
  '    <div>Petugas Ruang Baca TI,</div>\n' +
  '    <div style="height:55px;"></div>\n' +
  '    <div style="font-weight:bold; text-decoration:underline;">Mochammad Luqman Firdaus</div>\n' +
  '    <div>NIP/NIDN. 0715088901</div>\n' +
  '  </div>\n' +
  '</div>';

function setupDatabase() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var schemas = [
      {
        name: "Config",
        headers: ["Key", "Value", "Keterangan"],
        defaultRows: [
          ["TARIF_DENDA_PER_HARI", 1000, "Nominal denda keterlambatan pengembalian buku per hari (Rp)"],
          ["BATAS_PINJAM_HARI", 7, "Durasi standar peminjaman buku (hari)"],
          ["MAKS_PINJAM_BUKU", 2, "Maksimal peminjaman buku sekaligus per mahasiswa"],
          ["NAMA_SENDER", "INTEGRAL Library UNIROW", "Nama pengirim notifikasi email bot"],
          ["NAMA_PRODI", "Ruang Baca Teknik Industri UNIROW", "Nama institusi perpustakaan prodi"],
          ["LOGO_EMAIL_URL", "https://i.ibb.co/4RjHXJ9j/Desain-tanpa-judul-4.png", "Logo kop email reminder"],
          ["TEMPLATE_SURAT_BEBAS", DEFAULT_TEMPLATE_SURAT, "Template HTML resmi Surat Bebas Ruang Baca"],
          ["GEMINI_API_KEY", "", "Google Gemini AI API Key untuk Smart Scanner Vision & Asisten Riset TI"]
        ]
      },
      {
        name: "Pengguna",
        headers: ["Username", "Password", "Nama Lengkap", "Role", "Status"],
        defaultRows: [
          ["admin", "das12345", "Mochammad Luqman Firdaus", "Superadmin", "Aktif"],
          ["iela", "iela.2027", "Iela (Asisten Lab)", "Aslab", "Aktif"]
        ]
      },
      {
        name: "Buku Literatur",
        headers: ["id", "judul", "penulis", "tahun_terbit", "stok", "rak"],
        defaultRows: [
          ["1060", "AKUNTANSI MANAJERIAL Buku 1", "A. Totok Budisantoso", "2018", 2, "RAK 1 BARIS 1"],
          ["1061", "The Handbook of Quality and Service Improvement Tools", "Julia RA Taylor", "2019", 1, "RAK 1 BARIS 2"],
          ["1062", "MANAGERIAL ACCOUNTING Sixth Edition", "RAY H. GARRISON", "2017", 1, "RAK 1 BARIS 1"],
          ["1064", "Service, Quality & Satisfaction Edisi 3", "Fandy Tjiptono, Ph.D", "2020", 1, "RAK 1 BARIS 3"]
        ]
      },
      {
        name: "Laporan KP",
        headers: ["id", "judul", "penulis", "tahun_terbit", "stok", "rak"],
        defaultRows: [
          ["2001", "Laporan KP di PT. Semen Indonesia (Persero) Tbk Pabrik Tuban", "Ahmad Rizky Pratama", "2024", 1, "RAK 3 BARIS 1"],
          ["2002", "Laporan KP Manajemen Proyek Atap Baja di PT. BCA Tuban", "Sony Dwi Irawan", "2024", 1, "RAK 3 BARIS 1"]
        ]
      },
      {
        name: "Skripsi",
        headers: ["id", "judul", "penulis", "tahun_terbit", "stok", "rak"],
        defaultRows: [
          ["3001", "Analisis Postur Kerja Operator Menggunakan Metode RULA & REBA", "Budi Santoso", "2025", 1, "RAK 4 BARIS 1"],
          ["3002", "Optimasi Rantai Pasok Pupuk Menggunakan Metode Linear Programming", "Siti Nurhaliza", "2025", 1, "RAK 4 BARIS 2"],
          ["3003", "Penerapan Lean Six Sigma untuk Meminimasi Cacat Produk Paving", "Mochamad Rizky", "2026", 1, "RAK 4 BARIS 1"]
        ]
      },
      {
        name: "Buku Rusak",
        headers: ["id", "judul", "penulis", "tahun_terbit", "stok", "rak", "keterangan"],
        defaultRows: []
      },
      {
        name: "Mahasiswa",
        headers: ["nama", "npm", "angkatan", "status", "email", "no_hp"],
        defaultRows: [
          ["MOCHAMMAD LUQMAN FIRDAUS", "1411230105", "2023", "Aktif", "luqmanfirdaus@gmail.com", "085712345678"],
          ["SONY DWI IRAWAN", "210301001", "2021", "Aktif", "sonydwi@gmail.com", "081234567890"],
          ["BUDI SANTOSO", "220301008", "2022", "Aktif", "budi@gmail.com", "089876543210"],
          ["AHMAD DAHLAN", "200301015", "2020", "Alumni", "dahlan@gmail.com", "082345678901"]
        ]
      },
      {
        name: "Peminjaman",
        headers: ["No", "Mahasiswa", "Tgl Pinjam", "Batas Kembali", "Status", "Denda", "Hari Terlambat", "Last Reminder Sent", "Detail Buku", "Tgl Kembali"],
        defaultRows: []
      }
    ];

    schemas.forEach(function(schema) {
      var sheet = ss.getSheetByName(schema.name);
      if (!sheet) {
        sheet = ss.insertSheet(schema.name);
        sheet.appendRow(schema.headers);
        if (schema.defaultRows && schema.defaultRows.length > 0) {
          schema.defaultRows.forEach(function(row) {
            sheet.appendRow(row);
          });
        }
        sheet.getRange(1, 1, 1, schema.headers.length)
             .setFontWeight("bold")
             .setBackground("#240D57")
             .setFontColor("#FFFFFF");
      } else {
        // Jika sheet Config sudah ada, sinkronkan key yang belum terdaftar secara otomatis
        if (schema.name === "Config" && sheet.getLastRow() > 0) {
          var dataConfig = sheet.getDataRange().getValues();
          var existingKeys = dataConfig.map(function(r) { return String(r[0]).trim(); });

          schema.defaultRows.forEach(function(row) {
            var targetKey = String(row[0]).trim();
            if (existingKeys.indexOf(targetKey) === -1) {
              sheet.appendRow(row);
              Logger.log("Menambahkan key baru ke Config: " + targetKey);
            }
          });
        } else if (sheet.getLastRow() === 0) {
          sheet.appendRow(schema.headers);
          if (schema.defaultRows && schema.defaultRows.length > 0) {
            schema.defaultRows.forEach(function(row) {
              sheet.appendRow(row);
            });
          }
          sheet.getRange(1, 1, 1, schema.headers.length)
               .setFontWeight("bold")
               .setBackground("#240D57")
               .setFontColor("#FFFFFF");
        }
      }
      Logger.log("Sheet " + schema.name + " berhasil diproses.");
    });

    return { success: true, message: "Sinkronisasi database & penambahan key Config berhasil!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}