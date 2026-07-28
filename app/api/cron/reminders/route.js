import { NextResponse } from 'next/server';
import clientPromise from "@/lib/mongodb";
import webpush from 'web-push';

export async function GET() {
  return handleReminders();
}

export async function POST() {
  return handleReminders();
}

async function handleReminders() {
  try {
    const client = await clientPromise;
    const db = client.db("agroking");
    
    const cycles = await db.collection("cycles").find({}).toArray();
    const users = await db.collection("users").find({}).toArray();
    const pushSubs = await db.collection("push_subscriptions").find({}).toArray();

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails('mailto:support@agroking.cm', publicKey, privateKey);
    }

    const sentReminders = [];
    const now = new Date();

    for (const cycle of cycles) {
      if (!cycle.start_date) continue;
      const startDate = new Date(cycle.start_date);
      const diffMs = now - startDate;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // 1-indexed days

      let reminderMessage = null;
      let reminderStage = null;

      // 2 to 3 days before Day 14 (Day 11-12)
      if (diffDays >= 11 && diffDays <= 12) {
        reminderStage = 'Croissance (Jour 14)';
        reminderMessage = `⚡ Rappel AgroKing : Dans 2 à 3 jours (Jour 14), vos poussins passeront à l'Aliment Croissance. Préparez le vaccin Newcastle !`;
      } 
      // 2 to 3 days before Day 28 (Day 25-26)
      else if (diffDays >= 25 && diffDays <= 26) {
        reminderStage = 'Finition (Jour 28)';
        reminderMessage = `⚡ Rappel AgroKing : Dans 2 à 3 jours (Jour 28), vos volailles passeront à l'Aliment Finition pour maximiser la rentabilité.`;
      } 
      // 2 to 3 days before Day 42 (Day 39-40)
      else if (diffDays >= 39 && diffDays <= 40) {
        reminderStage = 'Vente & Fin de Cycle (Jour 42)';
        reminderMessage = `🎉 Rappel AgroKing : Dans 2 à 3 jours (Jour 42), votre cycle sera terminé. Préparez la commercialisation de vos poulets !`;
      }
      // Demo fallback: if triggered manually for any active cycle
      else if (diffDays < 11) {
        reminderStage = 'Prochaine Étape (Jour 14)';
        reminderMessage = `⚡ Rappel AgroKing (Cycle Jour ${diffDays}/42) : Prochaine étape Aliment Croissance & Vaccin dans ${14 - diffDays} jours !`;
      }

      if (reminderMessage) {
        const farmerId = (cycle.user_id || cycle.farmer_id)?.toString();
        const farmer = users.find(u => (u._id && u._id.toString() === farmerId) || (u.id && u.id.toString() === farmerId));

        // Save in-app notification
        await db.collection("notifications").insertOne({
          user_id: farmerId,
          title: `📢 Rappel Étape : ${reminderStage}`,
          message: reminderMessage,
          created_at: new Date().toISOString(),
          read: false
        });

        // Send Push notification if subscription exists for farmer or admin
        const farmerSubs = pushSubs.filter(s => s.user_id?.toString() === farmerId || s.role === 'admin' || !s.user_id);
        if (publicKey && privateKey && farmerSubs.length > 0) {
          const payload = JSON.stringify({
            title: `📢 Rappel Étape : ${reminderStage}`,
            body: reminderMessage,
            icon: '/icon512_maskable.png',
            badge: '/icon512_maskable.png',
            url: 'https://agroking-app.vercel.app/farmer'
          });
          await Promise.allSettled(farmerSubs.map(s => webpush.sendNotification(s.subscription, payload)));
        }

        sentReminders.push({
          farmer_name: farmer ? farmer.name : 'Éleveur',
          days_elapsed: diffDays,
          stage: reminderStage,
          message: reminderMessage
        });
      }
    }

    return NextResponse.json({
      success: true,
      reminders_sent_count: sentReminders.length,
      reminders: sentReminders
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
