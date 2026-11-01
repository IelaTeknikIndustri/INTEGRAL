import type { APIRoute } from 'astro';
import { askResearchAssistant } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message, npm, name } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ success: false, message: 'Pertanyaan wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Retrieve sample relevant catalog items for context injection
    const { data: sampleCollections } = await supabase
      .from('collections')
      .select('judul, kategori, rak')
      .limit(20);

    const contextTitles = (sampleCollections || [])
      .map(c => `- [${c.kategori}] ${c.judul} (${c.rak})`)
      .join('\n');

    const reply = await askResearchAssistant(message, name || 'Mahasiswa TI', contextTitles);

    return new Response(JSON.stringify({
      success: true,
      reply
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Gagal terhubung ke AI: ' + (err.message || 'Coba lagi beberapa saat')
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

