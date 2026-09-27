// app/api/send-notification/route.ts

import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

if (!admin.apps.length) {
  const projectId  = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }
}

const INVALID_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
]);

export async function POST(request: Request) {
  try {
    const { userId, title, body, orderId } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing userId, title, or body' },
        { status: 400 }
      );
    }

    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin tidak terkonfigurasi' },
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
          icon:  'https://langitanco-superapp.vercel.app/logo.png',
          badge: 'https://langitanco-superapp.vercel.app/icon-bedge.png',
          tag:   orderId ? `order-${orderId}` : `notif-${userId}`,
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

    const fcmResponse = await admin.messaging().sendEachForMulticast(message as any);

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