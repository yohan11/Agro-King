import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://Vercel-Admin-poultryfarming:AgroKing2026%21@poultryfarming.g6xtvbe.mongodb.net/?retryWrites=true&w=majority&appName=poultryfarming";

async function updateSubscriptions() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('agroking');

  const subs = await db.collection('entrepreneur_subscriptions').find({}).toArray();
  console.log(`Found ${subs.length} subscriptions to check...`);

  for (const sub of subs) {
    let newTotal = sub.montant_total_pack;
    if (sub.pack_type === 'pack-100' || !sub.pack_type) {
      newTotal = 280000;
    } else if (sub.pack_type === 'pack-200') {
      newTotal = 560000;
    } else if (sub.pack_type === 'pack-500') {
      newTotal = 1400000;
    }

    const verse = Number(sub.montant_verse) || 0;
    const restant = Math.max(0, newTotal - verse);
    const pct = Number(((verse / newTotal) * 100).toFixed(2));

    await db.collection('entrepreneur_subscriptions').updateOne(
      { _id: sub._id },
      {
        $set: {
          montant_total_pack: newTotal,
          montant_restant: restant,
          pourcentage_avancement: pct
        }
      }
    );
    console.log(`Updated subscription ${sub._id}: Total=${newTotal}, Verse=${verse}, Restant=${restant}, Pct=${pct}%`);
  }

  console.log('Migration finished successfully.');
  await client.close();
  process.exit(0);
}

updateSubscriptions().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
