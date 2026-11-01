import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

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
