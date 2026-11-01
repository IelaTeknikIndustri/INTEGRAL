import type { APIRoute } from 'astro';

export const ALL: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('integral_user', { path: '/' });
  return redirect('/login');
};

