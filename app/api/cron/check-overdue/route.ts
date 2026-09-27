// app/api/cron/check-overdue/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

// Inisialisasi Firebase Admin (Sama seperti route pengirim)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function GET(request: Request) {
  try {
    // 1. Setup Admin Client Supabase (Bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'monitoring_sablon' },
      }
    );

    // 2. Cari Pesanan yang TELAT (Deadline < Hari ini) & Belum Selesai
    const today = new Date().toISOString().split('T')[0];
    const { data: overdueOrders } = await supabase
      .from('orders')
      .select('id, kode_produksi, deadline, nama_pemesan')
      .lt('deadline', today) // Deadline Less Than Today
      .neq('status', 'Selesai')
      .neq('status', 'Kirim');

    if (!overdueOrders || overdueOrders.length === 0) {
      return NextResponse.json({ message: 'Tidak ada pesanan telat hari ini.' });
    }

    // 3. Cari Token User Target (Produksi, Admin, Supervisor)
    const targetRoles = ['produksi', 'admin', 'supervisor'];
    const { data: targetUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', targetRoles);
      
    if (!targetUsers || targetUsers.length === 0) {
       return NextResponse.json({ message: 'Tidak ada user dengan role target.' });
    }

    const targetUserIds = targetUsers.map(u => u.id);

    // 4. Ambil Token FCM mereka
    const { data: tokensData } = await supabase
      .from('user_fcm_tokens')
      .select('token')
      .in('user_id', targetUserIds);

    if (!tokensData || tokensData.length === 0) {
       return NextResponse.json({ message: 'User target belum mengaktifkan notifikasi.' });
    }

    const uniqueTokens = [...new Set(tokensData.map(t => t.token))];

    // 5. Kirim Notifikasi untuk SETIAP pesanan telat
    let sentCount = 0;
    
    // Agar tidak spam 100 notif jika ada 100 order telat, 
    // kita rangkum atau kirim satu per satu. Disini kita kirim per order.
    for (const order of overdueOrders) {
        const message = {
            notification: {
                title: "⚠️ ALERT: PESANAN TELAT",
                body: `Order ${order.kode_produksi} (${order.nama_pemesan}) sudah melewati deadline!`,
            },
            tokens: uniqueTokens,
        };

        const res = await admin.messaging().sendEachForMulticast(message);
        sentCount += res.successCount;
    }

    return NextResponse.json({ success: true, notif_sent: sentCount, overdue_count: overdueOrders.length });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}