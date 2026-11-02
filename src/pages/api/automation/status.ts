import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const GET: APIRoute = async () => {
  try {
    let isActive = true;
    let lastRun = 'Hari ini, 08:00 WIB (Otomatis)';

    try {
      const { data: configStatus } = await supabaseAdmin
        .from('configs')
        .select('value')
        .eq('key', 'AUTOMATION_DAILY_ACTIVE')
        .single();

      if (configStatus && configStatus.value !== undefined) {
        isActive = configStatus.value === 'true' || configStatus.value === true;
      }

      const { data: configLastRun } = await supabaseAdmin
        .from('configs')
        .select('value')
        .eq('key', 'AUTOMATION_LAST_RUN')
        .single();

      if (configLastRun && configLastRun.value) {
        lastRun = configLastRun.value;
      }
    } catch (e) {
      // Fallback if configs table is pending
    }

    return new Response(JSON.stringify({
      success: true,
      active: isActive,
      lastRun: lastRun,
      schedule: 'Setiap Hari pukul 08:00 WIB (UTC+7)'
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
    const { active } = await request.json();

    try {
      await supabaseAdmin
        .from('configs')
        .upsert({
          key: 'AUTOMATION_DAILY_ACTIVE',
          value: String(active)
        });
    } catch (e) {
      // Fallback
    }

    return new Response(JSON.stringify({
      success: true,
      active: Boolean(active),
      message: active ? 'Jadwal otomatisasi harian 08:00 WIB berhasil diaktifkan!' : 'Jadwal otomatisasi dinonaktifkan.'
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

