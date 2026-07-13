// app/api/webhooks/payunit/route.js
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request) {
    try {
        const payload = await request.json();

        // Structure envoyée par PayUnit (peut varier légèrement selon le PSP) :
        // {
        //   transaction_id: "agroking-pack100-xxx",
        //   transaction_status: "SUCCESS" | "FAILED" | "PENDING" | "CANCELLED",
        //   transaction_amount: 25000,
        //   transaction_gateway: "mtnmomo" | "orange",
        //   ...
        // }

        const { transaction_id, transaction_status, transaction_gateway } = payload;

        if (!transaction_id) {
            return NextResponse.json({ error: "transaction_id manquant" }, { status: 400 });
        }

        console.log(`Webhook PayUnit reçu: ${transaction_id} -> ${transaction_status}`);

        // On cherche par le champ transactionId (pas _id), donc on passe par
        // le client MongoDB directement plutôt que par db.update() de lib/db.js
        const client = await clientPromise;
        const database = client.db("agroking");

        const updated = await database.collection("payment").findOneAndUpdate(
            { transactionId: transaction_id },
            {
                $set: {
                    status: transaction_status,
                    provider: transaction_gateway || null,
                    updatedAt: new Date(),
                },
            },
            { returnDocument: "after" }
        );

        const updatedDoc = updated.value || updated;

        if (!updatedDoc || !updatedDoc._id) {
            console.warn(`Transaction ${transaction_id} introuvable en base`);
            // On répond quand même 200 pour éviter que PayUnit ne re-tente indéfiniment
            return NextResponse.json({ received: true, warning: "transaction inconnue" });
        }

        // Si le paiement est confirmé, on peut ici déclencher la suite :
        // - marquer la commande liée (orderId) comme payée dans "orders"
        // - notifier l'éleveur (SMS/email/notification)
        if (transaction_status === "SUCCESS" && updatedDoc.orderId) {
            await database.collection("orders").findOneAndUpdate(
                { _id: updatedDoc.orderId },
                { $set: { paymentStatus: "PAID", status: "Confirmée", paidAt: new Date() } }
            );
        }

        // PayUnit attend une réponse 200 pour confirmer la bonne réception
        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error("Erreur webhook PayUnit:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}