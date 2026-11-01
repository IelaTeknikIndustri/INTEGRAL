import type { APIRoute } from 'astro';
import { scanBookWithVision } from '@/lib/gemini';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { image, mimeType } = await request.json();

    if (!image) {
      return new Response(JSON.stringify({ success: false, message: 'Data gambar base64 tidak ditemukan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const bookData = await scanBookWithVision(image, mimeType || 'image/jpeg');

    return new Response(JSON.stringify({
      success: true,
      data: bookData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Gagal menganalisis gambar: ' + (err.message || 'Format tidak didukung')
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

