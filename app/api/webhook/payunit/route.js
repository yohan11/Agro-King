import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

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
        if (transaction_status === "SUCCESS") {
            let order = null;
            let finalOrderId = updatedDoc.orderId;

            if (!finalOrderId && updatedDoc.orderDetails) {
                const newOrder = {
                    user_id: updatedDoc.farmerId,
                    ...updatedDoc.orderDetails,
                    status: "Confirmée",
                    paymentStatus: "PAID",
                    paidAt: new Date(),
                    created_at: new Date().toISOString()
                };
                const insertRes = await database.collection("orders").insertOne(newOrder);
                finalOrderId = insertRes.insertedId;
                order = newOrder;
                order._id = finalOrderId;
                
                await database.collection("payment").updateOne(
                    { _id: updatedDoc._id },
                    { $set: { orderId: finalOrderId } }
                );
            } else if (finalOrderId) {
                const orderDoc = await database.collection("orders").findOneAndUpdate(
                    { _id: finalOrderId },
                    { $set: { paymentStatus: "PAID", status: "Confirmée", paidAt: new Date() } }
                );
                order = orderDoc.value || orderDoc;
            }

            if (order && !order.is_aliments_seuls) {
                // Ensure a cycle is created only when payment is effectively done
                const existingCycle = await database.collection("cycles").findOne({ order_id: finalOrderId });
                if (!existingCycle) {
                    let startDate = new Date().toISOString();
                    if (order.delivery_date) {
                        // Ensure the date string is valid, or fallback to current
                        const parsedDate = new Date(order.delivery_date);
                        if (!isNaN(parsedDate.getTime())) {
                            startDate = parsedDate.toISOString();
                        }
                    }

                    await database.collection("cycles").insertOne({
                        user_id: order.user_id,
                        order_id: order.id || order._id,
                        chicks: order.chicks,
                        pack_id: order.pack_id || order.chicks,
                        start_date: startDate
                    });

                    // Deduct stock upon successful payment
                    const chicksCount = Number(order.chicks);
                    if (chicksCount > 0) {
                        const stockList = await database.collection('feed_stock').find({}).toArray();
                        let globalStock = stockList.find(s => s._id === 'global' || s.id === 'global');
                        if (!globalStock && stockList.length > 0) {
                            globalStock = stockList[0];
                        }
                        if (globalStock) {
                            let demarrageDeduction = chicksCount * 0.01;
                            let croissanceDeduction = chicksCount * 0.04;
                            let finitionDeduction = chicksCount * 0.05;

                            await database.collection('feed_stock').updateOne(
                                { _id: globalStock._id },
                                { $set: {
                                    demarrage: Math.max(0, (globalStock.demarrage || 0) - demarrageDeduction),
                                    croissance: Math.max(0, (globalStock.croissance || 0) - croissanceDeduction),
                                    finition: Math.max(0, (globalStock.finition || 0) - finitionDeduction)
                                }}
                            );
                        }
                    }
                }
            }

            // Envoi du SMS de confirmation via Orange
            if (order && order.user_id) {
                const farmer = await database.collection("users").findOne({
                    $or: [
                        { id: order.user_id },
                        { _id: order.user_id }
                    ]
                });
                
                if (farmer && farmer.phone) {
                    // Extract a short readable ID: last 6 characters of finalOrderId
                    const shortId = finalOrderId.toString().slice(-6).toUpperCase();
                    const orderDate = new Date().getFullYear();
                    const readableRef = `AK-${orderDate}-${shortId}`;
                    
                    const waMessage = `AgroKing: Paiement recu avec succes ✅\nVotre commande *${readableRef}* est confirmee.\nMerci de votre confiance!`;
                    
                    // Fire and forget, don't await to avoid blocking PayUnit webhook response
                    sendWhatsAppMessage(farmer.phone, waMessage).catch(err => {
                        console.error("Erreur asynchrone WhatsApp:", err);
                    });
                }
            }
        }

        // PayUnit attend une réponse 200 pour confirmer la bonne réception
        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error("Erreur webhook PayUnit:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}