import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const GET: APIRoute = async () => {
  try {
    const { data } = await supabaseAdmin
      .from('configs')
      .select('value')
      .eq('key', 'TEMPLATE_SURAT_BEBAS')
      .single();

    return new Response(JSON.stringify({
      success: true,
      template: data?.value || null
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
    const { template } = await request.json();

    if (!template) {
      return new Response(JSON.stringify({ success: false, message: 'Template tidak boleh kosong' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabaseAdmin
      .from('configs')
      .upsert({
        key: 'TEMPLATE_SURAT_BEBAS',
        value: template
      });

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: 'Template surat bebas pustaka berhasil disimpan di basis data!'
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

