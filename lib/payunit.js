import { PayunitClient } from '@payunit/nodejs-sdk';

const { PAYUNIT_API_USER, PAYUNIT_API_PASSWORD, PAYUNIT_APP_TOKEN, PAYUNIT_MODE, NEXT_PUBLIC_APP_URL } = process.env;

if (!PAYUNIT_API_USER || !PAYUNIT_API_PASSWORD || !PAYUNIT_APP_TOKEN) {
    console.warn("Variables PayUnit manquantes dans .env.local, le paiement risque d'échouer");
}

let client = null;

try {
    client = new PayunitClient({
        apiKey: PAYUNIT_APP_TOKEN,
        apiUsername: PAYUNIT_API_USER,
        apiPassword: PAYUNIT_API_PASSWORD,
        mode: PAYUNIT_MODE || 'test',
    });
} catch (error) {
    console.error("Erreur lors de l'initialisation du SDK PayUnit", error);
}

/**
 * Initialise un paiement sur PayUnit.
 * @param {Object} params
 * @param {number} params.amount - Montant en FCFA (XAF)
 * @param {string} params.transactionId - Identifiant unique côté AgroKing (ex: pack_xxx)
 * @param {string} [params.returnUrl] - URL de redirection après paiement
 */
export async function initiatePayment({ amount, transactionId, returnUrl }) {
    if (!client) throw new Error("PayunitClient non initialisé (vérifiez vos variables d'environnement)");
    const appUrl = NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const payment = await client.collections.initiatePayment({
        total_amount: amount,
        currency: 'XAF',
        transaction_id: transactionId,
        return_url: returnUrl || `${appUrl}/farmer`,
        notify_url: `${appUrl}/api/webhook/payunit`,
        payment_country: 'CM',
        redirect_on_failed: 'yes'
    });

    return payment;
}

/**
 * Vérifie le statut d'une transaction.
 * @param {string} transactionId
 */
export async function getPaymentStatus(transactionId) {
    if (!client) throw new Error("PayunitClient non initialisé");
    return await client.collections.getTransactionStatus(transactionId);
}