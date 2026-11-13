import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async () => {
  try {
    let mergedLoans = 0;
    let cleanedStudents = 0;

    // 1. Cek dan gabungkan transaksi pinjaman ganda (mahasiswa sama + tgl_pinjam sama + status sama)
    const { data: loans = [] } = await supabaseAdmin
      .from('loans')
      .select('id, student_npm, tgl_pinjam, status, loan_items(id, collection_id)')
      .order('id', { ascending: true });

    const loanGroupMap = new Map<string, any>();
    for (const l of loans) {
      const key = `${String(l.student_npm).trim()}_${String(l.tgl_pinjam).trim()}_${String(l.status).toLowerCase().trim()}`;
      if (!loanGroupMap.has(key)) {
        loanGroupMap.set(key, l);
      } else {
        const primary = loanGroupMap.get(key);
        const primaryColIds = new Set(((primary.loan_items as any[]) || []).map(it => String(it.collection_id)));
        const dupItems = (l.loan_items as any[]) || [];

        for (const item of dupItems) {
          if (!primaryColIds.has(String(item.collection_id))) {
            await supabaseAdmin
              .from('loan_items')
              .update({ loan_id: primary.id })
              .eq('id', item.id);
            primaryColIds.add(String(item.collection_id));
          } else {
            await supabaseAdmin
              .from('loan_items')
              .delete()
              .eq('id', item.id);
          }
        }

        await supabaseAdmin.from('loans').delete().eq('id', l.id);
        mergedLoans++;
      }
    }

    // 2. Cek mahasiswa dengan NPM berakhiran .0 yang duplikat dengan NPM bersih
    const { data: students = [] } = await supabaseAdmin
      .from('students')
      .select('npm');

    const npmSet = new Set((students || []).map(s => String(s.npm)));
    for (const s of students || []) {
      const rawNpm = String(s.npm);
      if (rawNpm.endsWith('.0')) {
        const cleanNpm = rawNpm.replace(/\.0$/, '');
        if (npmSet.has(cleanNpm)) {
          await supabaseAdmin.from('students').delete().eq('npm', rawNpm);
          cleanedStudents++;
        }
      }
    }

    const totalCleaned = mergedLoans + cleanedStudents;
    const message = totalCleaned > 0
      ? `Berhasil membersihkan ${totalCleaned} data ganda (${mergedLoans} transaksi digabung, ${cleanedStudents} NPM duplikat dihapus)!`
      : `Integritas basis data terverifikasi bersih (${loans.length} transaksi & ${students.length} mahasiswa bebas duplikat)!`;

    return new Response(JSON.stringify({
      success: true,
      message,
      mergedLoans,
      cleanedStudents
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
