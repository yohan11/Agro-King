import { PayunitClient } from '@payunit/nodejs-sdk';

function getClient() {
    const { PAYUNIT_API_USER, PAYUNIT_API_PASSWORD, PAYUNIT_APP_TOKEN, PAYUNIT_MODE } = process.env;

    if (!PAYUNIT_API_USER || !PAYUNIT_API_PASSWORD || !PAYUNIT_APP_TOKEN) {
        throw new Error("Variables PayUnit manquantes dans les variables d'environnement (API_USER, API_PASSWORD, APP_TOKEN).");
    }

    return new PayunitClient({
        apiKey: PAYUNIT_APP_TOKEN,
        apiUsername: PAYUNIT_API_USER,
        apiPassword: PAYUNIT_API_PASSWORD,
        mode: PAYUNIT_MODE || 'test',
    });
}

/**
 * Initialise un paiement sur PayUnit.
 * @param {Object} params
 * @param {number} params.amount - Montant en FCFA (XAF)
 * @param {string} params.transactionId - Identifiant unique côté AgroKing (ex: pack_xxx)
 * @param {string} [params.returnUrl] - URL de redirection après paiement
 */
export async function initiatePayment({ amount, transactionId, returnUrl }) {
    const client = getClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agroking-app.vercel.app";

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
    const client = getClient();
    return await client.collections.getTransactionStatus(transactionId);
}