import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export interface BookScanResult {
  judul: string;
  penulis: string;
  tahun: string;
  kategori: 'Buku Literatur' | 'Laporan KP' | 'Skripsi';
  rak: string;
}

/**
 * AI Multimodal Vision: Scan book cover, thesis cover, or barcode
 */
export async function scanBookWithVision(base64Image: string, mimeType: string = 'image/jpeg'): Promise<BookScanResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  const prompt = `
Kamu adalah pustakawan AI cerdas untuk Ruang Baca Teknik Industri UNIROW Tuban.
Analisis foto buku, sampul naskah KP/Skripsi, atau barcode berikut secara akurat.
Ekstrak informasi ke dalam JSON murni (tanpa pembungkus markdown):
{
  "judul": "Judul lengkap buku atau naskah",
  "penulis": "Nama penulis atau '-' jika tidak tertera",
  "tahun": "Tahun terbit 4 digit (misal: 2024)",
  "kategori": "Buku Literatur / Laporan KP / Skripsi",
  "rak": "RAK 1 BARIS 1 / RAK 2 KOLOM 1 BARIS 1 / RAK 3 BARIS 1 / RAK 4 BARIS 1 / ARSIP"
}
Petunjuk:
- Jika ada kata 'LAPORAN KERJA PRAKTIK' atau 'PT', kategorikan sebagai 'Laporan KP' (biasanya RAK 1).
- Jika ada kata 'SKRIPSI', 'ANALISIS', 'PENGARUH' atau tugas akhir mahasiswa TI, kategorikan 'Skripsi' (biasanya RAK 2).
- Selain itu kategorikan 'Buku Literatur' (biasanya RAK 3).
`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType
      }
    }
  ]);

  const text = result.response.text().trim();
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr) as BookScanResult;
}

/**
 * AI Research Assistant: Industrial Engineering Consultation
 */
export async function askResearchAssistant(pertanyaan: string, studentName: string = 'Mahasiswa TI', contextTitles: string = ''): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemInstruction = `
Kamu adalah INTEGRAL AI, Asisten Riset Cerdas Ruang Baca Program Studi Teknik Industri Universitas PGRI Ronggolawe (UNIROW) Tuban.
Nama mahasiswa yang sedang bertanya: ${studentName}.
Tugasmu:
1. Berikan konsultasi keilmuan Teknik Industri yang mendalam, terstruktur, ramah, dan solutif.
2. Gunakan metodologi standar Teknik Industri yang relevan: Lean Manufacturing, Six Sigma, Ergonomi (RULA, REBA, QEC), Supply Chain Management (SCOR), Quality Function Deployment (QFD), Taguchi, Riset Operasi / Linier Programming, OEE, TPM, Balanced Scorecard, dll.
3. Bila relevan, referensikan judul koleksi buku, laporan KP, atau skripsi yang ada di Ruang Baca TI UNIROW berikut:
${contextTitles}
Format jawaban dengan markdown yang rapi, gunakan bullet point dan penekanan yang jelas.
`;

  const result = await model.generateContent([
    systemInstruction,
    `Pertanyaan Mahasiswa: ${pertanyaan}`
  ]);

  return result.response.text();
}

