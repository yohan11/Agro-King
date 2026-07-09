// app/api/payment/initiate/route.js
import { NextResponse } from "next/server";
import { initiatePayment } from "@/lib/payunit";
import db from "@/lib/db";

export async function POST(request) {
    try {
        const body = await request.json();
        const { amount, packType, farmerId, orderId } = body;

        if (!amount || !packType || !farmerId) {
            return NextResponse.json(
                { error: "Paramètres manquants: amount, packType, farmerId requis" },
                { status: 400 }
            );
        }

        // Identifiant unique de transaction, utile pour retrouver la commande côté AgroKing
        const transactionId = `agroking-${packType}-${farmerId}-${Date.now()}`;

        const result = await initiatePayment({
            amount,
            transactionId,
        });

        // Enregistre la transaction en base avec le statut "PENDING"
        // (table "payment", cohérent avec ton dossier app/api/payment)
        await db.insert("payment", {
            transactionId,
            farmerId,
            packType,
            orderId: orderId || null,
            amount,
            status: "PENDING",
            provider: null, // rempli plus tard via le webhook (mtnmomo / orange)
            createdAt: new Date(),
        });

        return NextResponse.json({
            transactionUrl: result.transaction_url,
            transactionId,
        });
    } catch (error) {
        console.error("Erreur PayUnit initiate:", error);
        return NextResponse.json(
            { error: error.message || "Erreur lors de l'initialisation du paiement" },
            { status: 500 }
        );
    }
}