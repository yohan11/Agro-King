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

      // Calendrier Quotidien des Conseils et Étapes du Bot AgroKing (J1 à J45)
      const DAILY_ADVICE = {
        1: { stage: "Démarrage & Chauffage (J1)", msg: "🐥 Jour 1 : Température à 32-35°C, distribuez de l'eau tiède avec vitamines antistress + aliment démarrage sur alvéoles." },
        2: { stage: "Contrôle du Jabot (J2)", msg: "🔎 Jour 2 : Vérifiez les jabots des poussins le matin. 95% doivent être pleins et souples (signe d'un bon démarrage)." },
        3: { stage: "Vaccination HB1 (J3)", msg: "💉 Jour 3 : Administration du 1er vaccin Newcastle (HB1 / Clon 30) par goutte oculaire ou eau sans chlore." },
        5: { stage: "Gestion de la litière (J5)", msg: "🌾 Jour 5 : Retournez la litière sous les abreuvoirs pour éviter toute humidité propice aux coccidioses." },
        7: { stage: "Vaccin Gumboro 1 & Pesée (J7)", msg: "💉 Jour 7 : 1er vaccin Gumboro dans l'eau de boisson + 1ère pesée témoin (cible : 160-180g)." },
        10: { stage: "Aération & Densité (J10)", msg: "💨 Jour 10 : Élargissez l'espace de garde et aérez sans créer de courant d'air direct sur les poussins." },
        12: { stage: "Préparation Croissance (J12)", msg: "🥣 Jour 12 : Dans 2 jours, transition vers l'aliment Croissance. Préparez vos mangeoires trémies." },
        14: { stage: "Transition Aliment Croissance & Gumboro 2 (J14)", msg: "🔄 Jour 14 : Rappel vaccin Gumboro 2. Démarrez la transition alimentaire (50% Démarrage / 50% Croissance)." },
        18: { stage: "Surveillance Coccidiose (J18)", msg: "🔬 Jour 18 : Surveillez l'aspect des fientes. Distribuez un hépato-protecteur ou anticoccidien préventif si besoin." },
        21: { stage: "Rappel Newcastle Lasota (J21)", msg: "💉 Jour 21 : Rappel vaccin Newcastle souche Lasota. Les besoins en eau augmentent, multipliez les abreuvoirs." },
        25: { stage: "Préparation Finition (J25)", msg: "🥣 Jour 25 : Dans 3 jours, passage à l'aliment Finition. Vos poulets entrent dans la phase de prise de masse rapide." },
        28: { stage: "Transition Aliment Finition (J28)", msg: "🍗 Jour 28 : Passage à l'Aliment Finition AgroKing. Assurez une distribution d'eau fraîche à volonté." },
        32: { stage: "Contrôle Poids & Température (J32)", msg: "⚖️ Jour 32 : Pesez un échantillon de 10 poulets. Cible moyenne : 1.5 kg à 1.7 kg." },
        35: { stage: "Ventilation Nocturne (J35)", msg: "🌙 Jour 35 : Attention aux coups de chaleur en journée. Distribuez des électrolytes / vitamines C aux heures chaudes." },
        39: { stage: "Arrêt Médications (J39)", msg: "⛔ Jour 39 : Arrêt strict de tout antibiotique ou traitement pour respecter le délai d'attente avant commercialisation." },
        42: { stage: "Maturité & Vente (J42)", msg: "🎉 Jour 42 : Vos poulets sont prêts pour l'abattage et la vente (2.0 à 2.5 kg). Contactez le réseau AgroKing pour l'écoulement !" }
      };

      if (DAILY_ADVICE[diffDays]) {
        reminderStage = DAILY_ADVICE[diffDays].stage;
        reminderMessage = DAILY_ADVICE[diffDays].msg;
      } else if (diffDays <= 45) {
        reminderStage = `Suivi Élevage (Jour ${diffDays}/42)`;
        reminderMessage = `📊 AgroBot (Jour ${diffDays}/42) : Contrôlez la propreté de l'eau, l'éclairage et la consommation d'aliments. Tous vos indicateurs sont au vert !`;
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
