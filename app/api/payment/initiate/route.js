// app/api/payment/initiate/route.js
import { NextResponse } from "next/server";
import { initiatePayment } from "@/lib/payunit";
import db from "@/lib/db";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
    try {
        const body = await request.json();
        const { amount, packType, farmerId, orderDetails } = body;

        if (!amount || !packType || !farmerId) {
            return NextResponse.json(
                { error: "Paramètres manquants: amount, packType, farmerId requis" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const database = client.db("agroking");

        // Fetch farmer info for complete details
        let farmer = null;
        try {
            farmer = await database.collection("users").findOne({ _id: new ObjectId(farmerId) });
        } catch(e) {
            farmer = await database.collection("users").findOne({ phone: farmerId });
        }

        const farmerName = farmer?.name || 'Éleveur';
        const farmerPhone = farmer?.phone || 'Non spécifié';

        // 1. Create order record IMMEDIATELY in "orders" collection so it appears instantly for farmer & admin!
        const newOrderObj = {
            user_id: farmerId,
            farmer_id: farmerId,
            farmer_name: farmerName,
            farmer_phone: farmerPhone,
            unique_id: farmer?.unique_id || null,
            chicks: orderDetails?.chicks || 0,
            chicks_count: orderDetails?.chicks || 0,
            bags: orderDetails?.bags || 0,
            pack_type: packType,
            delivery_location: orderDetails?.delivery_location || 'Non spécifié',
            delivery_date: orderDetails?.delivery_date || null,
            next_bags_delivery_preference: orderDetails?.next_bags_delivery_preference || null,
            coordinates: orderDetails?.coordinates || null,
            is_aliments_seuls: !!orderDetails?.is_aliments_seuls,
            status: "En attente",
            paymentStatus: "PENDING",
            amount: amount,
            created_at: new Date().toISOString()
        };

        const insertedOrder = await database.collection("orders").insertOne(newOrderObj);
        const createdOrderId = insertedOrder.insertedId.toString();

        // 2. Generate PayUnit transaction ID
        const cleanPackType = packType.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        const transactionId = `agroking-${cleanPackType}-${farmerId}-${Date.now()}`;
        
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const dynamicAppUrl = host ? `${protocol}://${host}` : 
            (process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "https://agroking-app.vercel.app"));

        let result = { transaction_url: null };
        try {
            result = await initiatePayment({
                amount,
                transactionId,
                returnUrl: `${dynamicAppUrl}/payment-success?transaction_id=${transactionId}&order_id=${createdOrderId}`
            });
        } catch (payErr) {
            console.warn("PayUnit gateway initiation warning:", payErr.message);
        }

        // 3. Save transaction record in "payment" table
        await database.collection("payment").insertOne({
            transactionId,
            farmerId,
            packType,
            orderId: createdOrderId,
            orderDetails,
            amount,
            status: "PENDING",
            provider: null,
            createdAt: new Date(),
        });

        // 4. Trigger Web Push & WhatsApp notification to Admin immediately!
        try {
            const { sendAdminPushNotification } = require('@/lib/push');
            const orderTitle = '🚨 Nouvelle Commande (En attente de paiement) !';
            const orderBody = `${farmerName} (${farmerPhone}) a passé une commande : ${packType} (${amount} FCFA) à ${orderDetails?.delivery_location || 'sa ferme'}.`;
            sendAdminPushNotification(orderTitle, orderBody, 'https://agroking-admin.vercel.app/dashboard').catch(console.error);
        } catch (e) {
            console.error("Push error:", e);
        }

        return NextResponse.json({
            transactionUrl: result.transaction_url || (result.data && result.data.transaction_url) || `${dynamicAppUrl}/payment-success?transaction_id=${transactionId}&order_id=${createdOrderId}`,
            transactionId,
            orderId: createdOrderId
        });
    } catch (error) {
        console.error("Erreur PayUnit initiate:", error);
        return NextResponse.json(
            { error: error.message || "Erreur lors de l'initialisation du paiement" },
            { status: 500 }
        );
    }
}