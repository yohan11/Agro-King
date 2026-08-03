// app/api/payment/initiate/route.js
import { NextResponse } from "next/server";
import { initiatePayment } from "@/lib/payunit";
import db from "@/lib/db";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

function calculateFinancialBreakdown(packType, amount, chicksCount, feedBreakdown, isReform = false) {
    let costPartner = 0;
    let costDelivery = 0;
    let costTotal = 0;
    let margin = 0;
    let feedRequirements = { demarrage: 0, croissance: 0, finition: 0 };

    const chicks = Number(chicksCount) || 0;
    const pType = (packType || '').toLowerCase();

    if (pType.includes('100')) {
        costPartner = 243200;
        costDelivery = 15000;
        costTotal = 258200;
        margin = amount - costTotal;
        feedRequirements = { demarrage: 1, croissance: 4, finition: 5 };
    } else if (pType.includes('200')) {
        costPartner = 486400;
        costDelivery = 30000;
        costTotal = 516400;
        margin = amount - costTotal;
        feedRequirements = { demarrage: 2, croissance: 8, finition: 10 };
    } else if (pType.includes('reform') || pType.includes('réforme') || isReform) {
        const mult = chicks > 0 ? chicks / 100 : 1;
        costPartner = 74100 * mult;
        costDelivery = 0;
        costTotal = 78000 * mult;
        margin = amount - costTotal;
        feedRequirements = { demarrage: 0, croissance: 0, finition: 4 * mult };
    } else if (pType.includes('aliments')) {
        const dem = feedBreakdown?.demarrage || 0;
        const croiss = feedBreakdown?.croissance || 0;
        const fin = feedBreakdown?.finition || 0;
        costPartner = (dem * 21375) + (croiss * 20425) + (fin * 18525);
        costDelivery = 0;
        costTotal = costPartner;
        margin = amount - costTotal;
        feedRequirements = { demarrage: dem, croissance: croiss, finition: fin };
    } else if (chicks > 0) {
        const mult = chicks / 100;
        costPartner = Math.round(243200 * mult);
        costDelivery = Math.round(15000 * mult);
        costTotal = costPartner + costDelivery;
        margin = amount - costTotal;
        feedRequirements = { 
            demarrage: Math.round(1 * mult), 
            croissance: Math.round(4 * mult), 
            finition: Math.round(5 * mult) 
        };
    } else {
        costPartner = Math.round(amount * 0.95);
        costTotal = costPartner;
        margin = amount - costTotal;
    }

    return {
        cost_partner: costPartner,
        cost_delivery: costDelivery,
        cost_total_agroking: costTotal,
        margin_agroking: margin,
        feed_requirements: feedRequirements
    };
}

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

        // Fetch farmer info
        let farmer = null;
        try {
            farmer = await database.collection("users").findOne({ _id: new ObjectId(farmerId) });
        } catch(e) {
            farmer = await database.collection("users").findOne({ phone: farmerId });
        }

        const farmerName = farmer?.name || 'Éleveur';
        const farmerPhone = farmer?.phone || 'Non spécifié';

        const financial = calculateFinancialBreakdown(
            packType, 
            amount, 
            orderDetails?.chicks || 0, 
            orderDetails?.feed_breakdown,
            orderDetails?.is_reform
        );

        // 1. Create order record in "orders" collection
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
            is_reform: !!orderDetails?.is_reform,
            status: "En attente",
            paymentStatus: "PENDING",
            amount: amount,
            cost_partner: financial.cost_partner,
            cost_delivery: financial.cost_delivery,
            margin_agroking: financial.margin_agroking,
            feed_requirements: financial.feed_requirements,
            created_at: new Date().toISOString()
        };

        const insertedOrder = await database.collection("orders").insertOne(newOrderObj);
        const createdOrderId = insertedOrder.insertedId.toString();
        const shortId = createdOrderId.slice(-6).toUpperCase();
        const receiptNumber = `REC-${new Date().getFullYear()}-${shortId}`;

        // 2. SAVE PAYMENT RECEIPT IN "receipts" COLLECTION
        await database.collection("receipts").insertOne({
            receipt_number: receiptNumber,
            order_id: createdOrderId,
            user_id: farmerId,
            farmer_id: farmerId,
            farmer_name: farmerName,
            farmer_phone: farmerPhone,
            pack_type: packType,
            chicks_count: orderDetails?.chicks || 0,
            bags_count: orderDetails?.bags || 0,
            delivery_location: orderDetails?.delivery_location || 'Non spécifié',
            amount: amount,
            payment_method: "PayUnit / Mobile Money",
            status: "Payé & Confirmé",
            feed_requirements: financial.feed_requirements,
            created_at: new Date().toISOString()
        });

        // Also update order with receipt details
        await database.collection("orders").updateOne(
            { _id: insertedOrder.insertedId },
            { $set: { receipt_number: receiptNumber, receipt_id: createdOrderId } }
        );

        // 3. Generate PayUnit transaction ID
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

        // 4. Save transaction record in "payment" table
        await database.collection("payment").insertOne({
            transactionId,
            farmerId,
            packType,
            orderId: createdOrderId,
            orderDetails,
            amount,
            cost_partner: financial.cost_partner,
            margin_agroking: financial.margin_agroking,
            status: "PENDING",
            provider: null,
            createdAt: new Date(),
        });

        // 5. Trigger Web Push notification to Admin
        try {
            const { sendAdminPushNotification } = require('@/lib/push');
            const orderTitle = '🚨 Nouvelle Commande !';
            const orderBody = `${farmerName} (${farmerPhone}) a commandé : ${packType} (${amount.toLocaleString('fr-FR')} FCFA) à ${orderDetails?.delivery_location || 'sa ferme'}. Reçu ${receiptNumber} enregistré.`;
            sendAdminPushNotification(orderTitle, orderBody, 'https://agroking-admin.vercel.app/dashboard').catch(console.error);
        } catch (e) {
            console.error("Push error:", e);
        }

        return NextResponse.json({
            transactionUrl: result.transaction_url || (result.data && result.data.transaction_url) || `${dynamicAppUrl}/payment-success?transaction_id=${transactionId}&order_id=${createdOrderId}`,
            transactionId,
            orderId: createdOrderId,
            receiptNumber
        });
    } catch (error) {
        console.error("Erreur PayUnit initiate:", error);
        return NextResponse.json(
            { error: error.message || "Erreur lors de l'initialisation du paiement" },
            { status: 500 }
        );
    }
}