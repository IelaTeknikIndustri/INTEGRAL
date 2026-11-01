import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, message: 'Username dan password wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, password_hash, nama_lengkap, role, status')
      .eq('username', username.trim().toLowerCase())
      .eq('status', 'Aktif')
      .single();

    if (error || !user || user.password_hash !== password) {
      return new Response(JSON.stringify({ success: false, message: 'Username atau password salah!' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set secure auth session cookie
    cookies.set('integral_user', JSON.stringify({
      id: user.id,
      username: user.username,
      nama: user.nama_lengkap,
      role: user.role
    }), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return new Response(JSON.stringify({
      success: true,
      user: {
        username: user.username,
        nama: user.nama_lengkap,
        role: user.role
      }
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

