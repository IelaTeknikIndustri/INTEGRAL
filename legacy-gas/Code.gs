/**
 * ====================================================================
 * INTEGRAL - Industrial Integrated Library
 * Ruang Baca Program Studi Teknik Industri UNIROW Tuban
 * FILE: code.gs
 * ====================================================================
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('INTEGRAL - Industrial Integrated Library')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function formatTglIndo(tgl) {
  if (!tgl || tgl === "-") return "-";
  var str = String(tgl).trim();
  if (str.indexOf("||") > -1) {
    str = str.split("||")[0].trim();
  }

  var d = new Date(str);
  if (isNaN(d.getTime())) {
    return str.length > 15 ? str.substring(0, 15) : str;
  }

  var bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return d.getDate() + " " + bln[d.getMonth()] + " " + d.getFullYear();
}

function formatTglSimpan(d) {
  var year = d.getFullYear();
  var month = ("0" + (d.getMonth() + 1)).slice(-2);
  var day = ("0" + d.getDate()).slice(-2);
  return year + "-" + month + "-" + day;
}

/**
 * Membaca nilai konfigurasi dari sheet Config berdasarkan Key.
 * Jika tidak ditemukan, mengembalikan defaultValue.
 */
function getConfigValue(key, defaultValue) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shConfig = ss.getSheetByName("Config");
    if (shConfig && shConfig.getLastRow() > 1) {
      var data = shConfig.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === key) {
          var val = data[i][1];
          if (val !== "" && val !== null && val !== undefined) return val;
        }
      }
    }
  } catch (e) {}
  return defaultValue !== undefined ? defaultValue : "";
}

/**
 * Mengubah stok buku berdasarkan ID di seluruh sheet katalog.
 * @param {Spreadsheet} ss - Spreadsheet aktif
 * @param {string} bukuId - ID buku
 * @param {number} delta - Perubahan stok (+1 untuk tambah, -1 untuk kurang)
 */
function updateStokBuku(ss, bukuId, delta) {
  var sheetNames = ["Buku Literatur", "Laporan KP", "Skripsi"];
  for (var s = 0; s < sheetNames.length; s++) {
    var sheet = ss.getSheetByName(sheetNames[s]);
    if (!sheet || sheet.getLastRow() <= 1) continue;

    var raw = sheet.getDataRange().getDisplayValues();
    var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var idxId = headers.indexOf("id");
    var idxStok = headers.indexOf("stok");
    if (idxId === -1 || idxStok === -1) continue;

    for (var i = 1; i < raw.length; i++) {
      if (String(raw[i][idxId]).trim() === String(bukuId).trim()) {
        var currentStok = Number(raw[i][idxStok]) || 1;
        var newStok = Math.max(0, currentStok + delta);
        sheet.getRange(i + 1, idxStok + 1).setValue(newStok);
        return true;
      }
    }
  }
  return false;
}

/**
 * Mengembalikan stok +1 berdasarkan string detail buku (judul) dari sheet peminjaman.
 * Digunakan saat buku ditandai dikembalikan.
 * @param {Spreadsheet} ss - Spreadsheet aktif
 * @param {string} detailBukuStr - String detail buku (misal: "Judul Buku | RAK: RAK 1 BARIS 1")
 */
function kembalikanStokDariDetail(ss, detailBukuStr) {
  var cleanTitle = detailBukuStr.replace("[DIKEMBALIKAN]", "").replace("[RUSAK]", "").split(" | RAK: ")[0].trim();
  if (!cleanTitle) return;
  var sheetNames = ["Buku Literatur", "Laporan KP", "Skripsi"];
  for (var s = 0; s < sheetNames.length; s++) {
    var sheet = ss.getSheetByName(sheetNames[s]);
    if (!sheet || sheet.getLastRow() <= 1) continue;
    var raw = sheet.getDataRange().getDisplayValues();
    var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var idxJudul = headers.indexOf("judul");
    var idxStok = headers.indexOf("stok");
    if (idxJudul === -1 || idxStok === -1) continue;
    for (var i = 1; i < raw.length; i++) {
      if (raw[i][idxJudul].trim().toLowerCase() === cleanTitle.toLowerCase()) {
        var currentStok = Number(raw[i][idxStok]) || 0;
        sheet.getRange(i + 1, idxStok + 1).setValue(currentStok + 1);
        return;
      }
    }
  }
}

function login(username, password) {
  try {
    var u = String(username || "").trim();
    var p = String(password || "").trim();

    if ((u === "admin" && (p === "das12345" || p === "luqman8790"))) {
      return {
        success: true,
        user: { username: "admin", nama: "Mochammad Luqman Firdaus", peran: "Superadmin" }
      };
    }
    if (u === "iela" && p === "iela.2027") {
      return {
        success: true,
        user: { username: "iela", nama: "Iela (Asisten Lab)", peran: "Aslab" }
      };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Pengguna");
    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getDisplayValues();
      for (var i = 1; i < data.length; i++) {
        var rowUser = data[i][0].trim();
        var rowPass = data[i][1].trim();
        var rowNama = data[i][2] || rowUser;
        var rowRole = data[i][3] || "Aslab";

        if (rowUser.toLowerCase() === u.toLowerCase() && rowPass === p) {
          return {
            success: true,
            user: { username: rowUser, nama: rowNama, peran: rowRole }
          };
        }
      }
    }

    // Autentikasi Mahasiswa berbasis NPM
    var shMhs = ss.getSheetByName("Mahasiswa");
    if (shMhs && shMhs.getLastRow() > 1) {
      var rawMhs = shMhs.getDataRange().getDisplayValues();
      var hMhs = rawMhs[0].map(function(h) { return String(h).trim().toLowerCase(); });
      var idxNama = hMhs.indexOf("nama");
      var idxNpm = hMhs.indexOf("npm");
      var idxAngkatan = hMhs.indexOf("angkatan");
      var idxStatus = hMhs.indexOf("status");
      var idxEmail = hMhs.indexOf("email");
      var idxHp = hMhs.indexOf("no_hp") > -1 ? hMhs.indexOf("no_hp") : hMhs.indexOf("no hp");

      for (var j = 1; j < rawMhs.length; j++) {
        var mNpm = idxNpm > -1 ? rawMhs[j][idxNpm].trim() : "";
        var mNama = idxNama > -1 ? rawMhs[j][idxNama].trim() : "";
        if (mNpm && (mNpm.toLowerCase() === u.toLowerCase())) {
          if (p === mNpm || p === "das12345" || p === "luqman8790" || p === mNpm.substring(mNpm.length - 4)) {
            var angkatan = idxAngkatan > -1 ? rawMhs[j][idxAngkatan] : "2023";
            return {
              success: true,
              user: {
                username: mNpm,
                nama: mNama || ("Mahasiswa " + mNpm),
                npm: mNpm,
                angkatan: angkatan,
                status: idxStatus > -1 ? rawMhs[j][idxStatus] : "Aktif",
                email: idxEmail > -1 ? rawMhs[j][idxEmail] : "-",
                noHp: idxHp > -1 ? rawMhs[j][idxHp] : "-",
                peran: "Mahasiswa"
              }
            };
          }
        }
      }
    }

    return { success: false, message: "Username atau kata sandi tidak cocok!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function getInitialData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var dataLit = bacaKoleksiBuku(ss, "Buku Literatur");
    var dataKp = bacaKoleksiBuku(ss, "Laporan KP");
    var dataSkripsi = bacaKoleksiBuku(ss, "Skripsi");
    var dataRusak = bacaKoleksiBuku(ss, "Buku Rusak");

    var hitungStok = function(arr) {
      return arr.reduce(function(tot, b) {
        return tot + (Number(b.stok) || 1);
      }, 0);
    };
    var totalStok = hitungStok(dataLit) + hitungStok(dataKp) + hitungStok(dataSkripsi);

    var dataMhs = bacaDataMahasiswa(ss);
    var dataRiwayat = bacaDataRiwayat(ss);

    var cAktif = 0;
    var cTerlambat = 0;
    var cKembali = 0;

    dataRiwayat.forEach(function(r) {
      if (r.status === "aktif") cAktif++;
      else if (r.status === "terlambat") cTerlambat++;
      else if (r.status === "dikembalikan") cKembali++;
    });

    var semuaBuku = [].concat(dataLit, dataKp, dataSkripsi);

    return {
      success: true,
      data: {
        stats: {
          lit: dataLit.length,
          kp: dataKp.length,
          skripsi: dataSkripsi.length,
          totalStok: totalStok,
          mahasiswa: dataMhs.length,
          aktif: cAktif,
          terlambat: cTerlambat,
          dikembalikan: cKembali
        },
        mahasiswa: dataMhs,
        bukuPinjam: semuaBuku,
        bukuRusak: dataRusak,
        riwayat: dataRiwayat
      }
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function bacaKoleksiBuku(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var raw = sheet.getDataRange().getDisplayValues();
  var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });

  var idxId = headers.indexOf("id");
  var idxJudul = headers.indexOf("judul");
  var idxPenulis = headers.indexOf("penulis");
  var idxTahun = headers.indexOf("tahun_terbit") > -1 ? headers.indexOf("tahun_terbit") : headers.indexOf("tahun");
  var idxStok = headers.indexOf("stok");
  var idxRak = headers.indexOf("rak");
  var idxKet = headers.indexOf("keterangan");

  var list = [];
  for (var i = 1; i < raw.length; i++) {
    var judul = idxJudul > -1 ? raw[i][idxJudul] : raw[i][1];
    if (!judul || judul.trim() === "") continue;

    list.push({
      id: idxId > -1 ? raw[i][idxId] : String(i),
      judul: judul.trim(),
      penulis: idxPenulis > -1 ? raw[i][idxPenulis] : "-",
      tahun: idxTahun > -1 ? raw[i][idxTahun] : "-",
      stok: idxStok > -1 ? (Number(raw[i][idxStok]) || 1) : 1,
      rak: idxRak > -1 ? raw[i][idxRak] : "Ruang Baca TI",
      kategori: sheetName,
      keterangan: idxKet > -1 ? raw[i][idxKet] : "-"
    });
  }
  return list;
}

function bacaDataMahasiswa(ss) {
  var sheet = ss.getSheetByName("Mahasiswa");
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var raw = sheet.getDataRange().getDisplayValues();
  var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });

  var idxNama = headers.indexOf("nama");
  var idxNpm = headers.indexOf("npm");
  var idxAngkatan = headers.indexOf("angkatan");
  var idxStatus = headers.indexOf("status");
  var idxEmail = headers.indexOf("email");
  var idxHp = headers.indexOf("no_hp") > -1 ? headers.indexOf("no_hp") : headers.indexOf("no hp");

  var list = [];
  for (var i = 1; i < raw.length; i++) {
    var nama = idxNama > -1 ? raw[i][idxNama] : raw[i][0];
    var npm = idxNpm > -1 ? raw[i][idxNpm] : raw[i][1];
    if (!nama && !npm) continue;

    var angkatan = idxAngkatan > -1 ? raw[i][idxAngkatan] : "";
    if (!angkatan && npm && npm.length >= 6) {
      var thn = npm.substring(4, 6);
      angkatan = !isNaN(thn) ? "20" + thn : "2023";
    }

    list.push({
      no: i,
      nama: nama || "-",
      npm: npm || "-",
      angkatan: angkatan || "2023",
      status: idxStatus > -1 ? (raw[i][idxStatus] || "Aktif") : "Aktif",
      email: idxEmail > -1 ? raw[i][idxEmail] : "-",
      noHp: idxHp > -1 ? raw[i][idxHp] : "-"
    });
  }
  return list;
}

function bacaDataRiwayat(ss) {
  var sheet = ss.getSheetByName("Peminjaman");
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var raw = sheet.getDataRange().getDisplayValues();
  var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });

  var idxId = headers.indexOf("no");
  var idxMhs = headers.indexOf("mahasiswa");
  var idxTglPinjam = headers.indexOf("tgl pinjam");
  var idxBatas = headers.indexOf("batas kembali");
  var idxStatus = headers.indexOf("status");
  var idxDenda = headers.indexOf("denda");
  var idxDetail = headers.indexOf("detail buku");

  var mhsList = bacaDataMahasiswa(ss);

  var list = [];
  var seenIds = {};
  for (var i = 1; i < raw.length; i++) {
    var mhs = idxMhs > -1 ? raw[i][idxMhs] : raw[i][1];
    if (!mhs || mhs.trim() === "") continue;

    var matchMhs = mhsList.find(function(m) {
      return String(m.npm).trim() === String(mhs).trim();
    });
    if (matchMhs && matchMhs.nama) {
      mhs = matchMhs.nama.toUpperCase();
    }

    var rawValId = idxId > -1 ? String(raw[i][idxId]).trim() : "";
    // Pastikan ID transaksi unik: jika kosong/duplikat, buat ID unik berbasis baris sheet
    var idTrx = (rawValId && rawValId !== "-" && !seenIds[rawValId]) ? rawValId : ("TRX-" + (i + 1));
    seenIds[idTrx] = true;

    var tglPinjamRaw = idxTglPinjam > -1 ? raw[i][idxTglPinjam] : "-";
    var batasRaw = idxBatas > -1 ? raw[i][idxBatas] : "-";

    var tglPinjam = formatTglIndo(tglPinjamRaw);
    var batasKembali = formatTglIndo(batasRaw);

    var status = idxStatus > -1 ? raw[i][idxStatus].toLowerCase().trim() : "aktif";
    var denda = idxDenda > -1 ? raw[i][idxDenda] : "-";
    var detail = idxDetail > -1 ? raw[i][idxDetail] : "-";

    var parseDate = new Date(tglPinjamRaw.indexOf("||") > -1 ? tglPinjamRaw.split("||")[0].trim() : tglPinjamRaw).getTime();
    if (isNaN(parseDate)) parseDate = 0;

    list.push({
      idTransaksi: idTrx,
      sheetRow: i + 1,
      mahasiswa: mhs,
      tglPinjam: tglPinjam,
      batasKembali: batasKembali,
      status: status,
      denda: denda,
      detailBuku: detail,
      timestamp: parseDate
    });
  }

  list.sort(function(a, b) {
    return b.timestamp - a.timestamp;
  });

  return list.map(function(item, idx) {
    return {
      noUrut: idx + 1,
      idTransaksi: item.idTransaksi,
      sheetRow: item.sheetRow,
      mahasiswa: item.mahasiswa,
      tglPinjam: item.tglPinjam,
      batasKembali: item.batasKembali,
      status: item.status,
      denda: item.denda,
      detailBuku: item.detailBuku
    };
  });
}

function simpanPeminjamanBaru(npmOrNama, listBukuIds) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shPinjam = ss.getSheetByName("Peminjaman");
    if (!shPinjam) throw new Error("Sheet Peminjaman tidak ditemukan!");

    var mhsList = bacaDataMahasiswa(ss);
    var cleanInput = String(npmOrNama || "").trim();
    var matchMhs = mhsList.find(function(m) {
      return String(m.npm).trim() === cleanInput ||
             String(m.nama).toLowerCase().trim() === cleanInput.toLowerCase() ||
             cleanInput.indexOf(String(m.npm).trim()) > -1 ||
             cleanInput.toLowerCase().indexOf(String(m.nama).toLowerCase().trim()) > -1;
    });
    var namaMahasiswa = matchMhs ? matchMhs.nama.toUpperCase() : cleanInput.toUpperCase();

    var semuaKatalog = [].concat(
      bacaKoleksiBuku(ss, "Buku Literatur"),
      bacaKoleksiBuku(ss, "Laporan KP"),
      bacaKoleksiBuku(ss, "Skripsi")
    );

    // Validasi stok sebelum menyimpan peminjaman
    var bukuDipilih = [];
    for (var b = 0; b < listBukuIds.length; b++) {
      var idBuku = listBukuIds[b];
      var match = semuaKatalog.find(function(bk) { return String(bk.id) === String(idBuku); });
      if (match && (Number(match.stok) || 0) < 1) {
        return { success: false, message: "Stok buku \"" + match.judul + "\" sedang habis (0 eksemplar). Tidak bisa dipinjam!" };
      }
      bukuDipilih.push(match ? match.judul + " | RAK: " + match.rak : "Buku ID " + idBuku + " | RAK: Ruang Baca");
    }

    var now = new Date();
    var batas = new Date();
    var batasPinjamHari = Number(getConfigValue("BATAS_PINJAM_HARI", 7)) || 7;
    batas.setDate(now.getDate() + batasPinjamHari);

    var rawExisting = shPinjam.getDataRange().getDisplayValues();
    var hExisting = rawExisting[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var idxExistingNo = hExisting.indexOf("no");
    var maxExistingNo = 0;
    for (var er = 1; er < rawExisting.length; er++) {
      var valStr = idxExistingNo > -1 ? String(rawExisting[er][idxExistingNo]) : "";
      var numMatch = valStr.match(/\d+/);
      if (numMatch) {
        var numVal = parseInt(numMatch[0], 10);
        if (!isNaN(numVal) && numVal > maxExistingNo) maxExistingNo = numVal;
      }
    }
    var nextNo = maxExistingNo + 1;
    shPinjam.appendRow([
      nextNo,
      namaMahasiswa,
      formatTglSimpan(now),
      formatTglSimpan(batas),
      "aktif",
      "-",
      0,
      "",
      bukuDipilih.join(" || "),
      ""
    ]);

    // Kurangi stok buku yang dipinjam
    listBukuIds.forEach(function(id) {
      updateStokBuku(ss, id, -1);
    });

    return { success: true, message: "Peminjaman untuk " + namaMahasiswa + " berhasil dicatat!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function aksiBukuIndividual(idTransaksi, idxBuku, aksi, namaMhsOptional) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Peminjaman");
    var raw = sheet.getDataRange().getDisplayValues();
    var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });

    var idxNo = headers.indexOf("no");
    var idxMhs = headers.indexOf("mahasiswa");
    var idxDetail = headers.indexOf("detail buku");
    var idxStatus = headers.indexOf("status");
    var idxDenda = headers.indexOf("denda");
    var idxBatas = headers.indexOf("batas kembali");
    var idxTglKembali = headers.indexOf("tgl kembali");

    var targetMhs = namaMhsOptional ? String(namaMhsOptional).trim().toLowerCase() : "";
    var targetId = String(idTransaksi || "").trim();

    var rowIndex = -1;

    // Strategi 1: Cocokkan ID Transaksi DAN Nama Mahasiswa (Tingkat akurasi 100%)
    if (targetMhs && idxMhs > -1) {
      for (var i = 1; i < raw.length; i++) {
        var rowId = idxNo > -1 ? String(raw[i][idxNo]).trim() : "";
        var rowMhs = String(raw[i][idxMhs]).trim().toLowerCase();
        var matchMhs = rowMhs.indexOf(targetMhs) > -1 || targetMhs.indexOf(rowMhs) > -1;

        if (matchMhs && (rowId === targetId || targetId === ("TRX-" + (i + 1)))) {
          rowIndex = i + 1;
          break;
        }
      }
    }

    // Strategi 2: Jika belum ketemu dan ada targetMhs, cari baris aktif/terlambat milik mahasiswa tsb
    if (rowIndex === -1 && targetMhs && idxMhs > -1) {
      for (var i = 1; i < raw.length; i++) {
        var rowMhs = String(raw[i][idxMhs]).trim().toLowerCase();
        var rowSt = idxStatus > -1 ? String(raw[i][idxStatus]).trim().toLowerCase() : "";
        var matchMhs = rowMhs.indexOf(targetMhs) > -1 || targetMhs.indexOf(rowMhs) > -1;
        if (matchMhs && rowSt !== "dikembalikan") {
          rowIndex = i + 1;
          break;
        }
      }
    }

    // Strategi 3: Cocokkan ID Transaksi saja
    if (rowIndex === -1 && targetId) {
      for (var i = 1; i < raw.length; i++) {
        var rowId = idxNo > -1 ? String(raw[i][idxNo]).trim() : "";
        if (rowId === targetId || targetId === ("TRX-" + (i + 1))) {
          rowIndex = i + 1;
          break;
        }
      }
    }

    // Strategi 4: Jika targetId format "TRX-<nomor_baris>"
    if (rowIndex === -1 && targetId.indexOf("TRX-") === 0) {
      var rowFromId = parseInt(targetId.replace("TRX-", ""), 10);
      if (!isNaN(rowFromId) && rowFromId >= 2 && rowFromId <= raw.length) {
        rowIndex = rowFromId;
      }
    }

    if (rowIndex === -1) throw new Error("Transaksi #" + idTransaksi + " (" + (namaMhsOptional || "") + ") tidak ditemukan!");

    var bukuArr = String(sheet.getRange(rowIndex, idxDetail + 1).getValue()).split(" || ");
    var namaMahasiswa = String(sheet.getRange(rowIndex, idxMhs + 1).getValue()).trim();

    var mhsList = bacaDataMahasiswa(ss);
    var matchMhs = mhsList.find(function(m) { return String(m.npm).trim() === namaMahasiswa; });
    if (matchMhs && matchMhs.nama) namaMahasiswa = matchMhs.nama.toUpperCase();

    var allReturned = false;

    if (aksi === "kembali") {
      if (bukuArr[idxBuku].indexOf("[DIKEMBALIKAN]") === -1) {
        bukuArr[idxBuku] += " [DIKEMBALIKAN]";
        // Kembalikan stok buku ke katalog
        kembalikanStokDariDetail(ss, bukuArr[idxBuku]);
      }
      allReturned = bukuArr.every(function(b) {
        return b.indexOf("[DIKEMBALIKAN]") > -1 || b.indexOf("[RUSAK]") > -1;
      });
      sheet.getRange(rowIndex, idxDetail + 1).setValue(bukuArr.join(" || "));

      if (allReturned) {
        sheet.getRange(rowIndex, idxStatus + 1).setValue("dikembalikan");
        sheet.getRange(rowIndex, idxDenda + 1).setValue("-");
        sheet.getRange(rowIndex, idxTglKembali + 1).setValue(formatTglSimpan(new Date()));
      }
      return { success: true, message: "Buku berhasil ditandai dikembalikan!", allReturned: allReturned };
    } else if (aksi === "perpanjang") {
      var curStr = sheet.getRange(rowIndex, idxBatas + 1).getValue();
      var clean = String(curStr).indexOf("||") > -1 ? String(curStr).split("||")[0].trim() : curStr;
      var curBatas = new Date(clean);
      curBatas.setHours(23, 59, 59, 999);

      var today = new Date();
      var isLewatBatas = isNaN(curBatas.getTime()) || (today > curBatas);

      if (isLewatBatas) {
        var bukuJudulAsli = bukuArr[idxBuku].replace("[DIKEMBALIKAN]", "").replace("[RUSAK]", "").trim();
        if (bukuArr[idxBuku].indexOf("[DIKEMBALIKAN]") === -1) {
          bukuArr[idxBuku] += " [DIKEMBALIKAN]";
        }
        allReturned = bukuArr.every(function(b) {
          return b.indexOf("[DIKEMBALIKAN]") > -1 || b.indexOf("[RUSAK]") > -1;
        });
        sheet.getRange(rowIndex, idxDetail + 1).setValue(bukuArr.join(" || "));
        if (allReturned) {
          sheet.getRange(rowIndex, idxStatus + 1).setValue("dikembalikan");
          sheet.getRange(rowIndex, idxDenda + 1).setValue("-");
          sheet.getRange(rowIndex, idxTglKembali + 1).setValue(formatTglSimpan(today));
        }

        var newBatas = new Date();
        newBatas.setDate(today.getDate() + 7);
        var maxNoAppend = 0;
        for (var er = 1; er < raw.length; er++) {
          var valStr = idxNo > -1 ? String(raw[er][idxNo]) : "";
          var numMatch = valStr.match(/\d+/);
          if (numMatch) {
            var numVal = parseInt(numMatch[0], 10);
            if (!isNaN(numVal) && numVal > maxNoAppend) maxNoAppend = numVal;
          }
        }
        var nextNo = maxNoAppend + 1;
        sheet.appendRow([
          nextNo,
          namaMahasiswa,
          formatTglSimpan(today),
          formatTglSimpan(newBatas),
          "aktif",
          "-",
          0,
          "",
          bukuJudulAsli,
          ""
        ]);

        return {
          success: true,
          message: "Buku telah melewati batas. Transaksi lama ditutup dan transaksi baru untuk " + namaMahasiswa + " (7 hari ke depan) berhasil dibuat!",
          allReturned: allReturned
        };
      } else {
        curBatas.setDate(curBatas.getDate() + 7);
        sheet.getRange(rowIndex, idxBatas + 1).setValue(formatTglSimpan(curBatas));
        return { success: true, message: "Masa pinjam untuk " + namaMahasiswa + " berhasil diperpanjang 7 hari!", allReturned: false };
      }
    } else if (aksi === "rusak") {
      if (bukuArr[idxBuku].indexOf("[RUSAK]") === -1) {
        bukuArr[idxBuku] += " [RUSAK]";
      }
      sheet.getRange(rowIndex, idxDetail + 1).setValue(bukuArr.join(" || "));
      
      var shRusak = ss.getSheetByName("Buku Rusak");
      if (shRusak) {
        var cleanJudul = bukuArr[idxBuku].replace("[RUSAK]", "").replace("[DIKEMBALIKAN]", "").split(" | RAK: ")[0].trim();
        shRusak.appendRow([shRusak.getLastRow(), cleanJudul, "-", "-", 1, "Ruang Baca TI", "Kerusakan dari Transaksi #" + idTransaksi]);
      }
      return { success: true, message: "Buku berhasil dicatat sebagai rusak/hilang!" };
    }
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function kembalikanBukuRow(idTransaksi, namaMhsOptional) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Peminjaman");
    var raw = sheet.getDataRange().getDisplayValues();
    var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });

    var idxNo = headers.indexOf("no");
    var idxMhs = headers.indexOf("mahasiswa");
    var idxDetail = headers.indexOf("detail buku");
    var idxStatus = headers.indexOf("status");
    var idxDenda = headers.indexOf("denda");
    var idxTglKembali = headers.indexOf("tgl kembali");

    var targetMhs = namaMhsOptional ? String(namaMhsOptional).trim().toLowerCase() : "";
    var targetId = String(idTransaksi || "").trim();

    var row = -1;

    // Strategi 1: Cocokkan ID Transaksi DAN Nama Mahasiswa
    if (targetMhs && idxMhs > -1) {
      for (var i = 1; i < raw.length; i++) {
        var rowId = idxNo > -1 ? String(raw[i][idxNo]).trim() : "";
        var rowMhs = String(raw[i][idxMhs]).trim().toLowerCase();
        var matchMhs = rowMhs.indexOf(targetMhs) > -1 || targetMhs.indexOf(rowMhs) > -1;
        if (matchMhs && (rowId === targetId || targetId === ("TRX-" + (i + 1)))) {
          row = i + 1;
          break;
        }
      }
    }

    // Strategi 2: Cocokkan ID Transaksi saja
    if (row === -1 && targetId) {
      for (var i = 1; i < raw.length; i++) {
        var rowId = idxNo > -1 ? String(raw[i][idxNo]).trim() : "";
        if (rowId === targetId || targetId === ("TRX-" + (i + 1))) {
          row = i + 1;
          break;
        }
      }
    }

    // Strategi 3: Format TRX-<baris>
    if (row === -1 && targetId.indexOf("TRX-") === 0) {
      var rowFromId = parseInt(targetId.replace("TRX-", ""), 10);
      if (!isNaN(rowFromId) && rowFromId >= 2 && rowFromId <= raw.length) {
        row = rowFromId;
      }
    }

    if (row === -1) throw new Error("Transaksi #" + idTransaksi + " (" + (namaMhsOptional || "") + ") tidak ditemukan!");

    var booksRaw = String(raw[row - 1][idxDetail]).split(" || ");
    var books = booksRaw.map(function(b) {
      if (b.indexOf("[DIKEMBALIKAN]") === -1 && b.indexOf("[RUSAK]") === -1) {
        kembalikanStokDariDetail(ss, b);
        return b + " [DIKEMBALIKAN]";
      }
      return b;
    });
    sheet.getRange(row, idxDetail + 1).setValue(books.join(" || "));
    sheet.getRange(row, idxStatus + 1).setValue("dikembalikan");
    sheet.getRange(row, idxDenda + 1).setValue("-");
    sheet.getRange(row, idxTglKembali + 1).setValue(formatTglSimpan(new Date()));
    return { success: true, message: "Seluruh buku transaksi #" + idTransaksi + " berhasil dikembalikan!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function perbaruiDendaOtomatis() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Peminjaman");
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, message: "Data kosong." };

    var raw = sheet.getDataRange().getDisplayValues();
    var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });

    var idxBatas = headers.indexOf("batas kembali");
    var idxStatus = headers.indexOf("status");
    var idxDenda = headers.indexOf("denda");
    var idxHari = headers.indexOf("hari terlambat");

    var tarifDenda = Number(getConfigValue("TARIF_DENDA_PER_HARI", 1000)) || 1000;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var updated = 0;

    for (var i = 1; i < raw.length; i++) {
      if (raw[i][idxStatus].toLowerCase().trim() !== "dikembalikan") {
        var btsRaw = String(raw[i][idxBatas]);
        if (btsRaw.indexOf("||") > -1) btsRaw = btsRaw.split("||")[0].trim();
        var dBatas = new Date(btsRaw);
        dBatas.setHours(0, 0, 0, 0);

        if (!isNaN(dBatas.getTime()) && today > dBatas) {
          var selisih = Math.floor((today - dBatas) / (1000 * 60 * 60 * 24));
          var nominalDenda = selisih * tarifDenda;
          sheet.getRange(i + 1, idxStatus + 1).setValue("terlambat");
          sheet.getRange(i + 1, idxDenda + 1).setValue("Rp " + nominalDenda.toLocaleString("id-ID"));
          sheet.getRange(i + 1, idxHari + 1).setValue(selisih);
          updated++;
        }
      }
    }
    return { success: true, message: updated + " data denda berhasil diperbarui!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function bersihkanDataGandaSemua() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Peminjaman");
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, message: "Data sudah bersih." };

    var raw = sheet.getDataRange().getDisplayValues();
    var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });

    var idxMhs = headers.indexOf("mahasiswa");
    var idxTgl = headers.indexOf("tgl pinjam");
    var idxDetail = headers.indexOf("detail buku");

    var map = {};
    var rowsToDelete = [];

    for (var i = 1; i < raw.length; i++) {
      var tgl = String(raw[i][idxTgl]).trim();
      if (tgl.indexOf("||") > -1) tgl = tgl.split("||")[0].trim();
      var key = String(raw[i][idxMhs]).trim() + "_" + tgl;

      if (!map[key]) {
        map[key] = i + 1;
      } else {
        var targetRow = map[key];
        var additionalDetail = raw[i][idxDetail];
        var existing = sheet.getRange(targetRow, idxDetail + 1).getValue();
        sheet.getRange(targetRow, idxDetail + 1).setValue(existing + " || " + additionalDetail);
        rowsToDelete.push(i + 1);
      }
    }

    for (var j = rowsToDelete.length - 1; j >= 0; j--) {
      sheet.deleteRow(rowsToDelete[j]);
    }
    return { success: true, message: rowsToDelete.length + " transaksi duplikat berhasil disatukan!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function verifikasiBebasPustaka(query) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var q = String(query).toLowerCase().trim();
    var m = bacaDataMahasiswa(ss).find(function(item) {
      return item.npm.toLowerCase().indexOf(q) > -1 || item.nama.toLowerCase().indexOf(q) > -1;
    }) || { nama: query, npm: query, prodi: "Teknik Industri" };

    var eligible = true;
    var totalDenda = 0;

    bacaDataRiwayat(ss).forEach(function(r) {
      if (r.mahasiswa.toLowerCase().indexOf(m.nama.toLowerCase()) > -1 || r.mahasiswa.toLowerCase().indexOf(m.npm.toLowerCase()) > -1) {
        if (r.status !== "dikembalikan") eligible = false;
        if (r.denda && r.denda !== "-") totalDenda += Number(r.denda.replace(/[^0-9]/g, "")) || 0;
      }
    });

    var dt = new Date();
    var ymd = dt.getFullYear() + ("0" + (dt.getMonth() + 1)).slice(-2) + ("0" + dt.getDate()).slice(-2);
    var nomorSurat = "BP/" + (m.npm || "TI") + "/" + ymd;

    return {
      eligible: eligible && (totalDenda === 0),
      mhs: m,
      totalDenda: totalDenda,
      nomorSurat: nomorSurat
    };
  } catch (err) {
    return { eligible: false, message: err.toString() };
  }
}

function getSuratTemplate() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shConfig = ss.getSheetByName("Config");
    if (!shConfig) return { success: false, template: null };

    var data = shConfig.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === "TEMPLATE_SURAT_BEBAS") {
        return { success: true, template: data[i][1] };
      }
    }
    return { success: true, template: null };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function simpanSuratTemplate(htmlContent) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shConfig = ss.getSheetByName("Config");
    if (!shConfig) throw new Error("Sheet Config tidak ditemukan!");

    var data = shConfig.getDataRange().getValues();
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === "TEMPLATE_SURAT_BEBAS") {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex > -1) {
      shConfig.getRange(rowIndex, 2).setValue(htmlContent);
    } else {
      shConfig.appendRow(["TEMPLATE_SURAT_BEBAS", htmlContent, "Template HTML Surat Bebas Ruang Baca Resmi"]);
    }
    return { success: true, message: "Template surat berhasil disimpan di sheet Config!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * ====================================================================
 * MANAJEMEN CRUD KATALOG BUKU & MAHASISWA
 * ====================================================================
 */

function tambahBukuBaru(kategori, bukuData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = kategori || "Buku Literatur";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Kategori sheet '" + sheetName + "' tidak ditemukan!");

    var raw = sheet.getDataRange().getDisplayValues();
    var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var idxId = headers.indexOf("id");
    var idxJudul = headers.indexOf("judul");
    var idxPenulis = headers.indexOf("penulis");
    var idxTahun = headers.indexOf("tahun_terbit") > -1 ? headers.indexOf("tahun_terbit") : headers.indexOf("tahun");
    var idxStok = headers.indexOf("stok");
    var idxRak = headers.indexOf("rak");

    var newId = bukuData.id || String(sheet.getLastRow() > 1 ? (Number(raw[raw.length - 1][idxId > -1 ? idxId : 0]) + 1 || (sheet.getLastRow() + 1000)) : 1001);
    var row = [];
    for (var c = 0; c < headers.length; c++) {
      var col = headers[c];
      if (col === "id") row.push(newId);
      else if (col === "judul") row.push(bukuData.judul || "");
      else if (col === "penulis") row.push(bukuData.penulis || "-");
      else if (col === "tahun_terbit" || col === "tahun") row.push(bukuData.tahun || String(new Date().getFullYear()));
      else if (col === "stok") row.push(Number(bukuData.stok) || 1);
      else if (col === "rak") row.push(bukuData.rak || "RAK 1 BARIS 1");
      else if (col === "keterangan") row.push(bukuData.keterangan || "-");
      else row.push("");
    }

    sheet.appendRow(row);
    return {
      success: true,
      message: "Koleksi buku '" + bukuData.judul + "' berhasil disimpan ke database!",
      buku: {
        id: String(newId),
        judul: bukuData.judul,
        penulis: bukuData.penulis || "-",
        tahun: bukuData.tahun || String(new Date().getFullYear()),
        stok: Number(bukuData.stok) || 1,
        rak: bukuData.rak || "RAK 1 BARIS 1",
        kategori: sheetName
      }
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function editBukuKatalog(kategori, id, updatedData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetNames = kategori && kategori !== "SEMUA" ? [kategori] : ["Buku Literatur", "Laporan KP", "Skripsi", "Buku Rusak"];
    for (var s = 0; s < sheetNames.length; s++) {
      var sheet = ss.getSheetByName(sheetNames[s]);
      if (!sheet || sheet.getLastRow() <= 1) continue;
      var raw = sheet.getDataRange().getDisplayValues();
      var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });
      var idxId = headers.indexOf("id");
      var idxJudul = headers.indexOf("judul");
      var idxPenulis = headers.indexOf("penulis");
      var idxTahun = headers.indexOf("tahun_terbit") > -1 ? headers.indexOf("tahun_terbit") : headers.indexOf("tahun");
      var idxStok = headers.indexOf("stok");
      var idxRak = headers.indexOf("rak");
      var idxKet = headers.indexOf("keterangan");

      for (var i = 1; i < raw.length; i++) {
        if (String(raw[i][idxId]).trim() === String(id).trim()) {
          var rowNum = i + 1;
          if (updatedData.judul !== undefined && idxJudul > -1) sheet.getRange(rowNum, idxJudul + 1).setValue(updatedData.judul);
          if (updatedData.penulis !== undefined && idxPenulis > -1) sheet.getRange(rowNum, idxPenulis + 1).setValue(updatedData.penulis);
          if (updatedData.tahun !== undefined && idxTahun > -1) sheet.getRange(rowNum, idxTahun + 1).setValue(updatedData.tahun);
          if (updatedData.stok !== undefined && idxStok > -1) sheet.getRange(rowNum, idxStok + 1).setValue(Number(updatedData.stok) || 0);
          if (updatedData.rak !== undefined && idxRak > -1) sheet.getRange(rowNum, idxRak + 1).setValue(updatedData.rak);
          if (updatedData.keterangan !== undefined && idxKet > -1) sheet.getRange(rowNum, idxKet + 1).setValue(updatedData.keterangan);
          return { success: true, message: "Data buku #" + id + " berhasil diperbarui di database!" };
        }
      }
    }
    throw new Error("Buku ID #" + id + " tidak ditemukan!");
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function hapusBukuKatalog(kategori, id) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetNames = kategori && kategori !== "SEMUA" ? [kategori] : ["Buku Literatur", "Laporan KP", "Skripsi", "Buku Rusak"];
    for (var s = 0; s < sheetNames.length; s++) {
      var sheet = ss.getSheetByName(sheetNames[s]);
      if (!sheet || sheet.getLastRow() <= 1) continue;
      var raw = sheet.getDataRange().getDisplayValues();
      var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });
      var idxId = headers.indexOf("id");
      if (idxId === -1) continue;

      for (var i = 1; i < raw.length; i++) {
        if (String(raw[i][idxId]).trim() === String(id).trim()) {
          sheet.deleteRow(i + 1);
          return { success: true, message: "Koleksi buku ID #" + id + " berhasil dihapus dari database!" };
        }
      }
    }
    throw new Error("Buku ID #" + id + " tidak ditemukan!");
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function catatBukuRusakDatabase(bukuData, keterangan) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shRusak = ss.getSheetByName("Buku Rusak");
    if (!shRusak) {
      shRusak = ss.insertSheet("Buku Rusak");
      shRusak.appendRow(["id", "judul", "penulis", "tahun_terbit", "stok", "rak", "keterangan"]);
    }
    var nextId = shRusak.getLastRow();
    shRusak.appendRow([
      nextId,
      bukuData.judul || "-",
      bukuData.penulis || "-",
      bukuData.tahun || "-",
      1,
      bukuData.rak || "Ruang Baca TI",
      keterangan || "Kerusakan koleksi"
    ]);

    if (bukuData.id) {
      updateStokBuku(ss, bukuData.id, -1);
    }
    return { success: true, message: "Buku berhasil dicatat ke data Buku Rusak & stok katalog diperbarui!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function tambahMahasiswaBaru(mhsData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Mahasiswa");
    if (!sheet) throw new Error("Sheet Mahasiswa tidak ditemukan!");

    var npm = String(mhsData.npm || "").trim();
    var nama = String(mhsData.nama || "").trim().toUpperCase();
    if (!npm || !nama) throw new Error("NPM dan Nama mahasiswa wajib diisi!");

    var raw = sheet.getDataRange().getDisplayValues();
    var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var idxNpm = headers.indexOf("npm");
    if (idxNpm > -1) {
      for (var i = 1; i < raw.length; i++) {
        if (raw[i][idxNpm].trim().toLowerCase() === npm.toLowerCase()) {
          throw new Error("Mahasiswa dengan NPM " + npm + " sudah terdaftar!");
        }
      }
    }

    var angkatan = mhsData.angkatan || (npm.length >= 6 ? "20" + npm.substring(4, 6) : "2023");
    sheet.appendRow([
      nama,
      npm,
      angkatan,
      mhsData.status || "Aktif",
      mhsData.email || (npm + "@unirow.ac.id"),
      mhsData.noHp || "-"
    ]);

    return { success: true, message: "Mahasiswa " + nama + " (" + npm + ") berhasil didaftarkan!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function importDataCsvDatabase(tipe, csvText) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var lines = csvText.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
    if (lines.length <= 1) throw new Error("Data CSV tidak memiliki baris data yang cukup.");

    var parseCsvLine = function(text) {
      var re = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
      var arr = [];
      var match;
      while ((match = re.exec(text)) !== null) {
        var str = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
        arr.push(str ? str.trim() : "");
      }
      return arr;
    };

    var sheet;
    var count = 0;

    if (tipe === "mahasiswa") {
      sheet = ss.getSheetByName("Mahasiswa");
      if (!sheet) throw new Error("Sheet Mahasiswa tidak ditemukan!");

      var headerCols = parseCsvLine(lines[0]).map(function(h) { return h.toLowerCase().trim(); });
      var idxNama = headerCols.indexOf("nama");
      var idxNpm = headerCols.indexOf("npm");
      var idxAngkatan = headerCols.indexOf("angkatan");
      var idxStatus = headerCols.indexOf("status");
      var idxEmail = headerCols.indexOf("email");
      var idxHp = headerCols.indexOf("no_hp") > -1 ? headerCols.indexOf("no_hp") : (headerCols.indexOf("no hp") > -1 ? headerCols.indexOf("no hp") : headerCols.indexOf("nohp"));

      var hasHeader = (idxNama > -1 || idxNpm > -1);
      var startIdx = hasHeader ? 1 : 0;

      for (var i = startIdx; i < lines.length; i++) {
        var cols = parseCsvLine(lines[i]);
        if (cols.length >= 2) {
          var nama = hasHeader && idxNama > -1 ? cols[idxNama] : cols[0];
          var npm = hasHeader && idxNpm > -1 ? cols[idxNpm] : cols[1];
          if (!nama && !npm) continue;

          var angkatan = hasHeader && idxAngkatan > -1 ? cols[idxAngkatan] : (cols[2] || "");
          if (!angkatan && npm && npm.length >= 6) {
            angkatan = "20" + npm.substring(4, 6);
          }
          var status = hasHeader && idxStatus > -1 ? (cols[idxStatus] || "Aktif") : (cols[3] || "Aktif");
          var email = hasHeader && idxEmail > -1 ? (cols[idxEmail] || "-") : (cols[4] || "-");
          var noHp = hasHeader && idxHp > -1 ? (cols[idxHp] || "-") : (cols[5] || "-");

          sheet.appendRow([
            (nama || "").toUpperCase(),
            String(npm || "").replace(/^'/, ''),
            angkatan || "2023",
            status || "Aktif",
            email || "-",
            String(noHp || "-").replace(/^'/, '')
          ]);
          count++;
        }
      }
    } else {
      var sheetName = tipe || "Buku Literatur";
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error("Sheet " + sheetName + " tidak ditemukan!");

      var bHeaderCols = parseCsvLine(lines[0]).map(function(h) { return h.toLowerCase().trim(); });
      var bIdxId = bHeaderCols.indexOf("id");
      var bIdxJudul = bHeaderCols.indexOf("judul");
      var bIdxPenulis = bHeaderCols.indexOf("penulis");
      var bIdxTahun = bHeaderCols.indexOf("tahun_terbit") > -1 ? bHeaderCols.indexOf("tahun_terbit") : bHeaderCols.indexOf("tahun");
      var bIdxStok = bHeaderCols.indexOf("stok");
      var bIdxRak = bHeaderCols.indexOf("rak");

      var bHasHeader = (bIdxJudul > -1 || bIdxId > -1);
      var bStartIdx = bHasHeader ? 1 : 0;

      for (var j = bStartIdx; j < lines.length; j++) {
        var bCols = parseCsvLine(lines[j]);
        if (bCols.length >= 2) {
          var bJudul = bHasHeader && bIdxJudul > -1 ? bCols[bIdxJudul] : bCols[1];
          if (!bJudul || bJudul.trim() === "") continue;

          var bId = bHasHeader && bIdxId > -1 ? bCols[bIdxId] : (bCols[0] || String(sheet.getLastRow() + 1000));
          var bPenulis = bHasHeader && bIdxPenulis > -1 ? bCols[bIdxPenulis] : (bCols[2] || "-");
          var bTahun = bHasHeader && bIdxTahun > -1 ? bCols[bIdxTahun] : (bCols[3] || String(new Date().getFullYear()));
          var bStok = bHasHeader && bIdxStok > -1 ? (Number(bCols[bIdxStok]) || 1) : (Number(bCols[4]) || 1);
          var bRak = bHasHeader && bIdxRak > -1 ? bCols[bIdxRak] : (bCols[5] || "Ruang Baca TI");

          sheet.appendRow([bId, bJudul, bPenulis, bTahun, bStok, bRak]);
          count++;
        }
      }
    }

    return { success: true, message: "Berhasil mengimpor " + count + " baris data ke sheet " + (sheet ? sheet.getName() : "") + "!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function getGeminiApiKey() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shConfig = ss.getSheetByName("Config");
    if (shConfig && shConfig.getLastRow() > 1) {
      var data = shConfig.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === "GEMINI_API_KEY") {
          var key = String(data[i][1]).trim();
          if (key && key !== "") return key;
        }
      }
    }
  } catch (e) {}
  return "";
}

/**
 * Pemrosesan Multimodal Vision OCR Menggunakan Gemini 2.5 / 2.0 / 1.5 Flash
 */
function prosesScannerDenganAI(base64Image, mimeType) {
  try {
    var apiKey = getGeminiApiKey();
    if (!apiKey || apiKey === "") {
      return {
        success: false,
        message: "API Key Gemini belum diatur di sheet Config (baris GEMINI_API_KEY)."
      };
    }

    var cleanBase64 = String(base64Image || "");
    if (cleanBase64.indexOf(",") > -1) {
      cleanBase64 = cleanBase64.split(",")[1];
    }
    var cleanMime = mimeType || "image/jpeg";

    var promptText = 
      "Kamu adalah asisten pustakawan AI cerdas untuk Ruang Baca Teknik Industri Universitas PGRI Ronggolawe (UNIROW) Tuban. " +
      "Analisis gambar foto buku, sampul naskah, atau barcode berikut secara akurat. " +
      "Ekstrak informasi buku ke dalam format JSON murni (tanpa pembungkus markdown ```json): " +
      "{\n" +
      '  "judul": "Judul lengkap buku atau naskah",\n' +
      '  "penulis": "Nama penulis atau penyusun (atau \'-\' jika tidak tertera)",\n' +
      '  "tahun": "Tahun terbit 4 digit (misal: 2024)",\n' +
      '  "kategori": "Buku Literatur / Laporan KP / Skripsi",\n' +
      '  "rak": "RAK 1 BARIS 1 / RAK 2 BARIS 1 / RAK 3 BARIS 1 / RAK 4 BARIS 1",\n' +
      '  "ringkasan": "Deskripsi topik buku singkat (maksimal 15 kata)"\n' +
      "}";

    var payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2
      }
    };

    // Model resmi Google Generative AI dengan fallback otomatis
    var models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    var lastError = "";

    for (var m = 0; m < models.length; m++) {
      var modelName = models[m];
      var endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + encodeURIComponent(apiKey);
      var options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      try {
        var response = UrlFetchApp.fetch(endpoint, options);
        var responseCode = response.getResponseCode();
        var resultText = response.getContentText();

        if (responseCode === 200) {
          var parsedRes = JSON.parse(resultText);
          if (parsedRes.candidates && parsedRes.candidates.length > 0 && parsedRes.candidates[0].content && parsedRes.candidates[0].content.parts) {
            var rawCandidate = parsedRes.candidates[0].content.parts[0].text;
            var cleanJson = rawCandidate.replace(/```json/gi, "").replace(/```/g, "").trim();

            var firstBrace = cleanJson.indexOf("{");
            var lastBrace = cleanJson.lastIndexOf("}");
            if (firstBrace > -1 && lastBrace > -1) {
              cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }

            var bookData = JSON.parse(cleanJson);
            return {
              success: true,
              data: bookData,
              message: "Metadata buku berhasil diekstrak oleh " + modelName + "!"
            };
          }
        } else {
          try {
            var errObj = JSON.parse(resultText);
            lastError = (errObj.error && errObj.error.message) ? errObj.error.message : ("HTTP " + responseCode);
          } catch (err) {
            lastError = "HTTP " + responseCode + ": " + resultText.substring(0, 100);
          }
        }
      } catch (callErr) {
        lastError = callErr.toString();
      }
    }

    return {
      success: false,
      message: "Gagal memproses AI: " + lastError
    };
  } catch (err) {
    return {
      success: false,
      message: "Gagal memproses AI: " + err.toString()
    };
  }
}

function konsultasiAiMahasiswa(pertanyaan, npmMahasiswa) {
  try {
    var apiKey = getGeminiApiKey();
    if (!apiKey || apiKey === "") {
      return {
        success: false,
        message: "Kunci API Gemini belum terpasang di database Config (baris GEMINI_API_KEY)."
      };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var mhsList = bacaDataMahasiswa(ss);
    var mhs = mhsList.find(function(m) { return String(m.npm) === String(npmMahasiswa); }) || { nama: "Mahasiswa TI" };

    var koleksi = [].concat(
      bacaKoleksiBuku(ss, "Buku Literatur").slice(0, 8),
      bacaKoleksiBuku(ss, "Laporan KP").slice(0, 6),
      bacaKoleksiBuku(ss, "Skripsi").slice(0, 8)
    );
    var daftarJudul = koleksi.map(function(k) { return "- [" + k.kategori + "] " + k.judul + " (" + k.rak + ")"; }).join("\n");

    var systemPrompt = 
      "Kamu adalah Asisten Cerdas Ruang Baca Teknik Industri UNIROW Tuban bernama INTEGRAL AI. " +
      "Nama mahasiswa yang sedang bertanya: " + mhs.nama + " (NPM: " + (npmMahasiswa || "-") + "). " +
      "Berikan rekomendasi keilmuan Teknik Industri yang mendalam, ramah, akademis, dan terstruktur. " +
      "Gunakan metode-metode standar Teknik Industri (Lean Manufacturing, Six Sigma, Ergonomi RULA/REBA, Supply Chain, SPC, Riset Operasional). " +
      "Jika relevan, sarankan referensi dari koleksi ruang baca kami berikut:\n" +
      daftarJudul + "\n\n" +
      "Jawab dalam 3-4 paragraf padat dan aplikatif.";

    var payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\nPertanyaan Mahasiswa: " + pertanyaan }]
        }
      ],
      generationConfig: {
        temperature: 0.7
      }
    };

    var models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    for (var m = 0; m < models.length; m++) {
      var modelName = models[m];
      var endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + encodeURIComponent(apiKey);
      var options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      try {
        var response = UrlFetchApp.fetch(endpoint, options);
        if (response.getResponseCode() === 200) {
          var parsed = JSON.parse(response.getContentText());
          if (parsed.candidates && parsed.candidates.length > 0 && parsed.candidates[0].content) {
            return {
              success: true,
              jawaban: parsed.candidates[0].content.parts[0].text
            };
          }
        }
      } catch (fetchErr) {}
    }

    return { success: false, message: "AI sedang sibuk atau kuota API Gemini tercapai." };
  } catch (err) {
    return {
      success: false,
      message: "Asisten AI sedang sibuk: " + err.toString()
    };
  }
}

function kirimBotReminderEmail() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shPinjam = ss.getSheetByName("Peminjaman");
    var mhsList = bacaDataMahasiswa(ss);

    if (!shPinjam || shPinjam.getLastRow() <= 1) {
      return { success: true, message: "Tidak ada transaksi peminjaman." };
    }

    perbaruiDendaOtomatis();

    var raw = shPinjam.getDataRange().getDisplayValues();
    var headers = raw[0].map(function(h) { return String(h).trim().toLowerCase(); });

    var idxMhs = headers.indexOf("mahasiswa");
    var idxBatas = headers.indexOf("batas kembali");
    var idxStatus = headers.indexOf("status");
    var idxDenda = headers.indexOf("denda");
    var idxHari = headers.indexOf("hari terlambat");
    var idxDetail = headers.indexOf("detail buku");
    var idxReminder = headers.indexOf("last reminder sent");

    var todayStr = formatTglSimpan(new Date());
    var sentCount = 0;
    var skipCount = 0;

    for (var i = 1; i < raw.length; i++) {
      var status = raw[i][idxStatus].toLowerCase().trim();
      var mhsNama = raw[i][idxMhs];
      var lastSent = idxReminder > -1 ? raw[i][idxReminder] : "";

      if (status === "terlambat" && lastSent !== todayStr) {
        var mhsObj = mhsList.find(function(m) {
          return m.nama.toLowerCase().indexOf(mhsNama.toLowerCase()) > -1 ||
                 mhsNama.toLowerCase().indexOf(m.nama.toLowerCase()) > -1 ||
                 (m.npm && mhsNama.indexOf(m.npm) > -1);
        });

        var emailTujuan = mhsObj ? mhsObj.email : "";
        if (!emailTujuan || emailTujuan.indexOf("@") === -1 || emailTujuan === "-") {
          skipCount++;
          continue;
        }

        var hariTelat = idxHari > -1 ? raw[i][idxHari] : "1";
        var dendaStr = idxDenda > -1 ? raw[i][idxDenda] : "Rp 1.000";
        var rawBatas = idxBatas > -1 ? raw[i][idxBatas] : "-";
        var batasKembali = formatTglIndo(rawBatas);
        var detailBuku = idxDetail > -1 ? raw[i][idxDetail] : "Buku Ruang Baca TI";

        var bukuItems = detailBuku.split(" || ").map(function(b, idx) {
          var clean = b.replace("[DIKEMBALIKAN]", "").replace("[RUSAK]", "").split(" | RAK: ")[0].trim();
          return '<li style="margin-bottom:6px;"><strong>' + (idx + 1) + '. ' + clean + '</strong></li>';
        }).join("");

        var htmlBody = 
          '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background: #ffffff;">' +
            '<div style="background: #240D57; padding: 28px 20px; text-align: center; color: white;">' +
              '<div style="background: white; width: 72px; height: 72px; border-radius: 14px; margin: 0 auto 12px auto; display: flex; align-items: center; justify-content: center; padding: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.12);">' +
                '<img src="https://i.ibb.co/M53NV70Y/1-1.png" alt="INTEGRAL" style="max-width: 100%; max-height: 100%; object-fit: contain;">' +
              '</div>' +
              '<h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">INTEGRAL Reminder</h2>' +
              '<p style="margin: 4px 0 0 0; font-size: 13px; color: #C4B5FD;">Ruang Baca Teknik Industri UNIROW</p>' +
            '</div>' +
            '<div style="padding: 24px; color: #1E293B; line-height: 1.6;">' +
              '<p style="font-size: 14px; margin-top: 0;">Halo <strong>' + mhsNama + '</strong>,</p>' +
              '<div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 12px; padding: 16px; margin: 18px 0;">' +
                '<strong style="color: #991B1B; font-size: 13px; text-transform: uppercase; display: block; margin-bottom: 4px;">Peringatan: Status Terlambat</strong>' +
                '<p style="margin: 0; font-size: 13px; color: #475569;">Buku belum dikembalikan selama <strong>' + hariTelat + ' hari</strong>.</p>' +
                '<div style="font-size: 22px; font-weight: 800; color: #DC2626; margin: 8px 0 2px 0;">Denda: ' + dendaStr + '</div>' +
                '<span style="font-size: 11px; color: #991B1B;">*' + hariTelat + ' hari x Rp 1.000</span>' +
              '</div>' +
              '<div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 18px 0;">' +
                '<div style="font-size: 12px; font-weight: 700; color: #64748B; margin-bottom: 8px; text-transform: uppercase;">Daftar Buku:</div>' +
                '<ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1E293B;">' + bukuItems + '</ul>' +
                '<div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #CBD5E1; font-size: 12.5px;">' +
                  '<span>Batas Kembali: </span><strong style="color: #DC2626;">' + batasKembali + '</strong>' +
                '</div>' +
              '</div>' +
              '<p style="font-size: 13px; color: #64748B; margin-bottom: 0;">Segera kembalikan buku ke <strong>Ruang Baca Teknik Industri UNIROW</strong> untuk menghindari akumulasi denda lebih lanjut.</p>' +
            '</div>' +
            '<div style="background: #F1F5F9; padding: 12px; text-align: center; font-size: 11px; color: #94A3B8;">' +
              'Email ini dibuat otomatis oleh Sistem Informasi Ruang Baca Terintegrasi (INTEGRAL).' +
            '</div>' +
          '</div>';

        var namaSender = String(getConfigValue("NAMA_SENDER", "INTEGRAL Library UNIROW"));
        GmailApp.sendEmail(emailTujuan, "[PERINGATAN] Terlambat Mengembalikan Buku - " + mhsNama, "", {
          htmlBody: htmlBody,
          name: namaSender
        });

        if (idxReminder > -1) {
          shPinjam.getRange(i + 1, idxReminder + 1).setValue(todayStr);
        }
        sentCount++;
      }
    }

    return {
      success: true,
      message: "Bot Reminder selesai! Berhasil mengirim " + sentCount + " email notifikasi." + (skipCount > 0 ? " (" + skipCount + " mahasiswa dilewati karena tidak ada email valid)" : "")
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * ====================================================================
 * OTOMATISASI HARIAN (JAM 08:00 PAGI WIB) VIA TIME-DRIVEN TRIGGER
 * ====================================================================
 */

/**
 * Fungsi utama yang dipicu otomatis oleh Google Cloud setiap hari jam 08:00 pagi.
 * 1. Menghitung dan memperbarui denda keterlambatan buku.
 * 2. Mengirimkan email bot reminder resmi kepada mahasiswa yang terlambat.
 * 3. Menyimpan riwayat eksekusi ke sheet 'Config'.
 */
function jadwalOtomatisJam8Pagi() {
  var logText = "";
  try {
    // 1. Perbarui denda keterlambatan otomatis
    var resDenda = perbaruiDendaOtomatis();
    logText += "Denda: " + (resDenda && resDenda.message ? resDenda.message : "OK") + " | ";

    // 2. Eksekusi pengiriman email bot reminder
    var resReminder = kirimBotReminderEmail();
    logText += "Reminder: " + (resReminder && resReminder.message ? resReminder.message : "OK");

    Logger.log("[JADWAL 08:00] Berhasil dieksekusi: " + logText);

    // Simpan catatan waktu terakhir eksekusi otomatis ke Config
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shConfig = ss.getSheetByName("Config");
    if (shConfig) {
      var data = shConfig.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === "LAST_AUTO_RUN") {
          foundRow = i + 1;
          break;
        }
      }
      var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
      if (foundRow > -1) {
        shConfig.getRange(foundRow, 2).setValue(nowStr + " WIB");
        shConfig.getRange(foundRow, 3).setValue(logText);
      } else {
        shConfig.appendRow(["LAST_AUTO_RUN", nowStr + " WIB", logText]);
      }
    }

    return { success: true, message: "Otomatisasi sukses: " + logText };
  } catch (err) {
    Logger.log("[JADWAL 08:00] Error: " + err.toString());
    return { success: false, message: err.toString() };
  }
}

/**
 * Memasang atau memperbarui pemicu otomatis harian jam 08:00 pagi.
 * Pemicu ini berjalan di server Google tanpa memerlukan aplikasi tetap terbuka.
 */
function pasangTriggerOtomatisJam8Pagi() {
  try {
    // Hapus trigger lama jika sudah ada untuk fungsi yang sama agar tidak ganda
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "jadwalOtomatisJam8Pagi") {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    // Buat trigger baru jam 08:00 pagi (WIB) setiap hari
    var newTrigger = ScriptApp.newTrigger("jadwalOtomatisJam8Pagi")
      .timeBased()
      .atHour(8)
      .everyDays(1)
      .inTimezone("Asia/Jakarta")
      .create();

    return {
      success: true,
      message: "Jadwal otomatis harian pukul 08:00 WIB berhasil diaktifkan di Google Cloud!",
      triggerId: newTrigger.getUniqueId()
    };
  } catch (err) {
    return { success: false, message: "Gagal memasang trigger: " + err.toString() };
  }
}

/**
 * Memeriksa status apakah pemicu otomatis jam 08:00 pagi sedang aktif.
 */
function cekStatusTriggerOtomatis() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var aktif = false;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "jadwalOtomatisJam8Pagi") {
        aktif = true;
        break;
      }
    }

    var lastRun = getConfigValue("LAST_AUTO_RUN", "Belum pernah berjalan");

    return {
      success: true,
      aktif: aktif,
      lastRun: lastRun
    };
  } catch (err) {
    return { success: false, aktif: false, message: err.toString() };
  }
}

/**
 * Menonaktifkan pemicu otomatis jam 08:00 pagi.
 */
function nonaktifkanTriggerOtomatis() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var count = 0;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "jadwalOtomatisJam8Pagi") {
        ScriptApp.deleteTrigger(triggers[i]);
        count++;
      }
    }
    return {
      success: true,
      message: count > 0 ? "Jadwal otomatis jam 08:00 berhasil dinonaktifkan." : "Tidak ada jadwal otomatis yang sedang aktif."
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}