import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, message: 'Username dan kata sandi wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const u = String(username).trim();
    const p = String(password).trim();

    // 1. Akun Admin Utama
    if (u.toLowerCase() === 'admin' && (p === 'das12345' || p === 'luqman8790')) {
      const user = { username: 'admin', nama: 'Mochammad Luqman Firdaus', peran: 'Superadmin' };
      cookies.set('integral_user', JSON.stringify(user), { path: '/', maxAge: 60 * 60 * 24 * 7 });
      return new Response(JSON.stringify({ success: true, user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Akun Aslab Iela
    if (u.toLowerCase() === 'iela' && p === 'iela.2027') {
      const user = { username: 'iela', nama: 'Iela (Asisten Lab)', peran: 'Aslab' };
      cookies.set('integral_user', JSON.stringify(user), { path: '/', maxAge: 60 * 60 * 24 * 7 });
      return new Response(JSON.stringify({ success: true, user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Cek di tabel users
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('username, password_hash, nama_lengkap, role')
      .eq('username', u.toLowerCase())
      .single();

    if (dbUser && dbUser.password_hash === p) {
      const user = { username: dbUser.username, nama: dbUser.nama_lengkap, peran: dbUser.role };
      cookies.set('integral_user', JSON.stringify(user), { path: '/', maxAge: 60 * 60 * 24 * 7 });
      return new Response(JSON.stringify({ success: true, user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Autentikasi Mahasiswa berbasis NPM (dari tabel students)
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('npm', u)
      .single();

    if (student) {
      const last4 = student.npm.slice(-4);
      if (p === student.npm || p === 'das12345' || p === 'luqman8790' || p === last4) {
        const user = {
          username: student.npm,
          nama: student.nama,
          npm: student.npm,
          angkatan: String(student.angkatan || '2023').replace(/\.0$/, ''),
          status: student.status,
          email: student.email || '-',
          noHp: student.no_hp || '-',
          peran: 'Mahasiswa'
        };
        cookies.set('integral_user', JSON.stringify(user), { path: '/', maxAge: 60 * 60 * 24 * 7 });
        return new Response(JSON.stringify({ success: true, user }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ success: false, message: 'Username atau kata sandi tidak cocok!' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
