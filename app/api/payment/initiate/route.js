// app/api/payment/initiate/route.js
import { NextResponse } from "next/server";
import { initiatePayment } from "@/lib/payunit";
import db from "@/lib/db";

export async function POST(request) {
    try {
        const body = await request.json();
        const { amount, packType, farmerId, orderId, orderDetails } = body;

        if (!amount || !packType || !farmerId) {
            return NextResponse.json(
                { error: "Paramètres manquants: amount, packType, farmerId requis" },
                { status: 400 }
            );
        }

        // Identifiant unique de transaction, utile pour retrouver la commande côté AgroKing
        const cleanPackType = packType.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        const transactionId = `agroking-${cleanPackType}-${farmerId}-${Date.now()}`;
        
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const dynamicAppUrl = host ? `${protocol}://${host}` : 
            (process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "https://agroking-app.vercel.app"));

        const result = await initiatePayment({
            amount,
            transactionId,
            returnUrl: `${dynamicAppUrl}/payment-success?transaction_id=${transactionId}&order_id=${orderId || ''}`
        });

        // Enregistre la transaction en base avec le statut "PENDING"
        // (table "payment", cohérent avec ton dossier app/api/payment)
        await db.insert("payment", {
            transactionId,
            farmerId,
            packType,
            orderId: orderId || null,
            orderDetails: orderDetails || null,
            amount,
            status: "PENDING",
            provider: null, // rempli plus tard via le webhook (mtnmomo / orange)
            createdAt: new Date(),
        });

        return NextResponse.json({
            transactionUrl: result.transaction_url || (result.data && result.data.transaction_url),
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