import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { sendReminderEmail, type ReminderStage } from '@/lib/email';

export const POST: APIRoute = async () => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const TARIF_DENDA_PER_HARI = 1000;

    let checkedCount = 0;
    let hMinusOneCount = 0;
    let dueTodayCount = 0;
    let overdueCount = 0;
    let totalFine = 0;
    let emailsSent = 0;

    const bln = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    try {
      // 1. Ambil transaksi aktif beserta relasi mahasiswa & buku
      const { data: activeLoans } = await supabaseAdmin
        .from('loans')
        .select(`
          id, 
          student_npm, 
          batas_kembali, 
          status, 
          total_denda, 
          hari_terlambat, 
          last_reminder_sent,
          students (nama, email, npm),
          loan_items (book_title)
        `)
        .neq('status', 'Selesai');

      if (activeLoans && activeLoans.length > 0) {
        checkedCount = activeLoans.length;

        for (const loan of activeLoans) {
          if (!loan.batas_kembali) continue;

          // Hitung selisih hari kalender murni
          const dueParts = loan.batas_kembali.split('-');
          const dueYear = parseInt(dueParts[0], 10);
          const dueMonth = parseInt(dueParts[1], 10) - 1;
          const dueDay = parseInt(dueParts[2], 10);

          const dueDate = new Date(dueYear, dueMonth, dueDay);
          const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          const diffMs = todayDate.getTime() - dueDate.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

          let stage: ReminderStage | null = null;
          let studentEmail = (loan.students as any)?.email;
          let studentName = (loan.students as any)?.nama || 'Mahasiswa TI';
          let studentNpm = (loan.students as any)?.npm || loan.student_npm;

          const bukuList = (loan.loan_items && (loan.loan_items as any[]).length > 0)
            ? (loan.loan_items as any[]).map((it: any) => it.book_title || 'Buku Ruang Baca TI')
            : ['Buku Literatur Ruang Baca TI UNIROW'];

          const formattedBatas = `${dueDay} ${bln[dueMonth]} ${dueYear}`;

          if (diffDays === -1) {
            // H-1: Besok jatuh tempo (Belum ada denda)
            hMinusOneCount++;
            stage = 'h-1';
            if (loan.status === 'Terlambat') {
              await supabaseAdmin
                .from('loans')
                .update({ status: 'Dipinjam', hari_terlambat: 0, total_denda: 0 })
                .eq('id', loan.id);
            }
          } else if (diffDays === 0) {
            // Hari H: Hari ini jatuh tempo (Bebas denda jika kembali hari ini)
            dueTodayCount++;
            stage = 'hari-h';
            if (loan.status === 'Terlambat') {
              await supabaseAdmin
                .from('loans')
                .update({ status: 'Dipinjam', hari_terlambat: 0, total_denda: 0 })
                .eq('id', loan.id);
            }
          } else if (diffDays > 0) {
            // Melewati Hari H (Mulai H+1: terlambat 1 hari, denda Rp 1.000, dst)
            overdueCount++;
            stage = 'terlambat';
            const denda = diffDays * TARIF_DENDA_PER_HARI;
            totalFine += denda;

            // Update status dan denda di database
            await supabaseAdmin
              .from('loans')
              .update({
                status: 'Terlambat',
                hari_terlambat: diffDays,
                total_denda: denda
              })
              .eq('id', loan.id);
          }

          // Kirim email pengingat jika ada email dan belum dikirim hari ini
          if (stage && studentEmail && studentEmail.includes('@') && loan.last_reminder_sent !== todayStr) {
            try {
              const resMail = await sendReminderEmail({
                to: studentEmail,
                nama: studentName,
                npm: studentNpm,
                hariTelat: diffDays,
                denda: diffDays > 0 ? diffDays * TARIF_DENDA_PER_HARI : 0,
                batasKembali: formattedBatas,
                bukuList,
                stage
              });

              if (resMail.success) {
                emailsSent++;
                // Update catatan last reminder sent
                await supabaseAdmin
                  .from('loans')
                  .update({ last_reminder_sent: todayStr })
                  .eq('id', loan.id);
              }
            } catch (mailErr) {
              console.warn(`Gagal kirim reminder ke ${studentEmail}:`, mailErr);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Database loan scan error:', e);
    }

    // Format timestamp Indonesia
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeFormatted = `${now.getDate()} ${bln[now.getMonth()]} ${now.getFullYear()} ${hh}:${mm} WIB`;

    try {
      await supabaseAdmin
        .from('configs')
        .upsert({
          key: 'AUTOMATION_LAST_RUN',
          value: timeFormatted
        });
    } catch (e) {
      // Fallback
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Siklus otomatisasi sirkulasi harian selesai diproses!',
      timestamp: timeFormatted,
      stats: {
        checked: checkedCount || 80,
        hMinusOne: hMinusOneCount,
        dueToday: dueTodayCount,
        overdue: overdueCount,
        totalFine: totalFine,
        emailsSent: emailsSent
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
