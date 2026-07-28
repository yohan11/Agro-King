import webpush from 'web-push';
import clientPromise from './mongodb';
import { sendWhatsAppMessage } from './whatsapp';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const ADMIN_PHONE = process.env.ADMIN_PHONE_NUMBER || '237621277696';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@agroking.com',
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('VAPID keys are not defined. Push notifications will not be sent.');
}

export async function sendAdminPushNotification(title, body, url = '/admin') {
  // Always trigger WhatsApp alert to Admin Phone Number
  if (ADMIN_PHONE) {
    const waText = `👑 *AGROKING ADMIN ALERT*\n\n*${title}*\n${body}\n\nAccédez au dashboard : https://agroking-admin.vercel.app/dashboard`;
    sendWhatsAppMessage(ADMIN_PHONE, waText).catch(err => console.error("Error sending WhatsApp to Admin:", err));
  }

  if (!vapidPublicKey || !vapidPrivateKey) return;

  try {
    const client = await clientPromise;
    const db = client.db('agroking');
    const subscriptions = await db.collection('push_subscriptions').find({}).toArray();

    if (subscriptions.length === 0) {
      console.log('No admin push subscriptions found.');
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      url
    });

    const sendPromises = subscriptions.map(async (subDoc) => {
      try {
        await webpush.sendNotification(subDoc.subscription, payload);
      } catch (err) {
        console.error('Error sending push notification to', subDoc.subscription.endpoint, err);
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log('Deleting expired push subscription:', subDoc._id);
          await db.collection('push_subscriptions').deleteOne({ _id: subDoc._id });
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (e) {
    console.error('Error in sendAdminPushNotification:', e);
  }
}
