/**
 * Firebase Admin SDK initialization.
 *
 * Used only for:
 *  - Firebase Cloud Messaging (FCM) push notifications
 *  - Firebase Storage (receipt / proof image uploads)
 *
 * Authentication is backend-managed (bcrypt + JWT). Firebase Auth is NOT used.
 *
 * If the service-account credentials are missing/invalid, the app degrades
 * gracefully: uploads fall back to local disk and notifications are stored
 * in-app only (no push). This keeps the app fully functional in demo mode.
 */
import admin from 'firebase-admin';
import { config } from './index';

let _app: admin.app.App | null = null;
let _storage: admin.storage.Storage | null = null;
let _messaging: admin.messaging.Messaging | null = null;

/** True when Firebase Admin is initialized and usable. */
export function firebaseReady(): boolean {
  return _app !== null;
}

/** Initialize the Firebase Admin app. Safe to call multiple times. */
export function initFirebase(): void {
  if (_app) return;
  const projectId = config.firebase.projectId;
  const clientEmail = config.firebase.clientEmail;
  const privateKey = config.firebase.privateKey;

  if (!projectId || !clientEmail || !privateKey) {
    console.log('[firebase] Admin SDK not configured — push & storage disabled (demo mode)');
    return;
  }

  try {
    // Prefer the service-account JSON file if present.
    _app = admin.initializeApp({
      projectId,
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: config.firebase.storageBucket || undefined,
    });
    _messaging = _app.messaging();
    if (config.firebase.storageBucket) {
      _storage = _app.storage();
    }
    console.log('[firebase] Admin SDK initialized (FCM + Storage)');
  } catch (err) {
    console.warn('[firebase] Failed to initialize Admin SDK:', (err as Error).message);
    _app = null;
  }
}

/** Upload a buffer to Firebase Storage, returning a public/signed URL. */
export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  contentType: string,
): Promise<string> {
  if (!_storage) {
    // Fallback: return a data URL (works for demo, not persistent).
    const base64 = buffer.toString('base64');
    return `data:${contentType};base64,${base64}`;
  }
  try {
    const bucket = _storage.bucket();
    const file = bucket.file(path);
    await file.save(buffer, { contentType, public: true });
    return `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(path)}`;
  } catch (err) {
    // Bucket may not exist yet, or permissions issue — fall back to data URL.
    console.warn('[firebase] Storage upload failed, using data URL fallback:', (err as Error).message);
    const base64 = buffer.toString('base64');
    return `data:${contentType};base64,${base64}`;
  }
}

/** Send an FM push notification to a device token. Returns true on success. */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
): Promise<boolean> {
  if (!_messaging) return false;
  try {
    await _messaging.send({
      token,
      notification: { title, body },
    });
    return true;
  } catch (err) {
    console.warn('[firebase] FCM send failed:', (err as Error).message);
    return false;
  }
}
