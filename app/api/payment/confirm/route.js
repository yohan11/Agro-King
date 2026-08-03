import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sendAdminPushNotification } from "@/lib/push";

export async function POST(request) {
  try {
    const { orderId, transactionId } = await request.json();
    if (!orderId && !transactionId) {
      return NextResponse.json({ error: "orderId ou transactionId requis" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("agroking");

    let orderQuery = {};
    if (orderId) {
      try {
        orderQuery = { $or: [{ _id: new ObjectId(orderId) }, { id: orderId }, { receipt_id: orderId }] };
      } catch {
        orderQuery = { $or: [{ id: orderId }, { receipt_id: orderId }] };
      }
    } else if (transactionId) {
      const payDoc = await db.collection("payment").findOne({ transactionId });
      if (payDoc && payDoc.orderId) {
        try {
          orderQuery = { $or: [{ _id: new ObjectId(payDoc.orderId) }, { id: payDoc.orderId }] };
        } catch {
          orderQuery = { id: payDoc.orderId };
        }
      }
    }

    // 1. Update Order to PAID & Confirmée (En attente de livraison)
    const updatedOrder = await db.collection("orders").findOneAndUpdate(
      orderQuery,
      {
        $set: {
          status: "Confirmée",
          paymentStatus: "PAID",
          paid: true,
          paidAt: new Date(),
          updated_at: new Date().toISOString()
        }
      },
      { returnDocument: "after" }
    );

    const orderDoc = updatedOrder.value || updatedOrder;

    // 2. Update Payment record
    if (transactionId) {
      await db.collection("payment").updateOne(
        { transactionId },
        { $set: { status: "SUCCESS", updatedAt: new Date() } }
      );
    } else if (orderDoc) {
      await db.collection("payment").updateMany(
        { orderId: orderDoc._id ? orderDoc._id.toString() : orderId },
        { $set: { status: "SUCCESS", updatedAt: new Date() } }
      );
    }

    // 3. Send Admin Notification
    if (orderDoc) {
      try {
        const orderTitle = '💰 Paiement Confirmé & Reçu !';
        const orderBody = `Commande de ${orderDoc.farmer_name} (${(orderDoc.amount || 0).toLocaleString('fr-FR')} FCFA) payée avec succès ! Prête pour livraison.`;
        sendAdminPushNotification(orderTitle, orderBody, 'https://agroking-admin.vercel.app/dashboard').catch(console.error);
      } catch (e) {
        console.error("Push admin confirm error:", e);
      }
    }

    return NextResponse.json({ success: true, order: orderDoc });
  } catch (error) {
    console.error("Erreur confirmation paiement:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
