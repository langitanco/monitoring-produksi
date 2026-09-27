// app/api/send-notification/route.ts

import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

const INVALID_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
]);

/**
 * Lazy-initialize Firebase Admin.
 * PENTING: jangan panggil ini di top-level module — hanya panggil
 * dari dalam request handler. Kalau dipanggil di top-level, Next.js
 * akan mengeksekusinya saat "npm run build" (collecting page data),
 * dan build akan gagal jika env var belum tersedia/valid di tahap itu.
 */
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !rawPrivateKey) {
      throw new Error('Firebase Admin env vars tidak lengkap (projectId/clientEmail/privateKey)');
    }

    // Env var biasanya menyimpan "\n" literal (backslash + n),
    // harus dikonversi jadi newline asli agar PEM valid.
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
  return admin;
}

export async function POST(request: Request) {
  try {
    const { userId, title, body, orderId } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing userId, title, or body' },
        { status: 400 }
      );
    }

    let fbAdmin: typeof admin;
    try {
      fbAdmin = getFirebaseAdmin();
    } catch (err: any) {
      console.error('🔥 Firebase Admin init error:', err.message);
      return NextResponse.json(
        { error: 'Firebase Admin tidak terkonfigurasi', details: err.message },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'monitoring_sablon' },
      }
    );

    const { data: userTokens, error } = await supabaseAdmin
      .from('user_fcm_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!userTokens || userTokens.length === 0) {
      return NextResponse.json({ success: true, sent_count: 0, note: 'No token registered' });
    }

    const uniqueTokens = [...new Set(userTokens.map((t) => t.token))];

    const message = {
      // notification: dipakai oleh SW saat app di background
      notification: { title, body },

      // data: dipakai oleh onMessage saat app di foreground
      // Semua value HARUS string
      data: {
        title,
        body,
        orderId: orderId ?? '',
        userId,
        url: 'https://langitanco-superapp.vercel.app/',
      },

      webpush: {
        notification: {
          title,
          body,
          icon: 'https://langitanco-superapp.vercel.app/logo.png',
          badge: 'https://langitanco-superapp.vercel.app/icon-bedge.png',
          tag: orderId ? `order-${orderId}` : `notif-${userId}`,
          renotify: true,
          click_action: 'https://langitanco-superapp.vercel.app/',
        },
        // fcmOptions memastikan foreground message juga di-handle
        fcmOptions: {
          link: 'https://langitanco-superapp.vercel.app/',
        },
      },
      tokens: uniqueTokens,
    };

    const fcmResponse = await fbAdmin.messaging().sendEachForMulticast(message as any);

    // Hapus token yang sudah expired
    const tokensToDelete: string[] = [];
    fcmResponse.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code ?? '';
        if (INVALID_TOKEN_ERRORS.has(errCode)) {
          tokensToDelete.push(uniqueTokens[idx]);
        }
      }
    });

    if (tokensToDelete.length > 0) {
      await supabaseAdmin
        .from('user_fcm_tokens')
        .delete()
        .in('token', tokensToDelete);
      console.log(`🗑️ ${tokensToDelete.length} token expired dihapus`);
    }

    return NextResponse.json({
      success: true,
      sent_count: fcmResponse.successCount,
      failure_count: fcmResponse.failureCount,
      cleaned_tokens: tokensToDelete.length,
    });

  } catch (error: any) {
    console.error('🔥 Error sending notification:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}