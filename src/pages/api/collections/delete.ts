import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, judul } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: 'ID buku wajib disertakan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabaseAdmin
      .from('collections')
      .delete()
      .eq('id', String(id).trim());

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: `Buku "${judul || id}" berhasil dihapus dari basis data!`
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

