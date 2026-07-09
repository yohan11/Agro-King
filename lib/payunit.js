// lib/payunit.js

const PAYUNIT_BASE_URL = process.env.PAYUNIT_BASE_URL || "https://gateway.payunit.net";

function getAuthHeaders() {
    const { PAYUNIT_API_USER, PAYUNIT_API_PASSWORD, PAYUNIT_APP_TOKEN, PAYUNIT_MODE } = process.env;

    if (!PAYUNIT_API_USER || !PAYUNIT_API_PASSWORD || !PAYUNIT_APP_TOKEN) {
        throw new Error("Variables PayUnit manquantes dans .env.local");
    }

    const basicAuth = Buffer.from(`${PAYUNIT_API_USER}:${PAYUNIT_API_PASSWORD}`).toString("base64");

    return {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
        "x-api-key": PAYUNIT_APP_TOKEN,
        "mode": PAYUNIT_MODE || "test",
    };
}

/**
 * Initialise un paiement sur PayUnit.
 * @param {Object} params
 * @param {number} params.amount - Montant en FCFA (XAF)
 * @param {string} params.transactionId - Identifiant unique côté AgroKing (ex: pack_xxx)
 * @param {string} [params.returnUrl] - URL de redirection après paiement
 */
export async function initiatePayment({ amount, transactionId, returnUrl }) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    const body = {
        total_amount: amount,
        currency: "XAF",
        transaction_id: transactionId,
        return_url: returnUrl || `${appUrl}/paiement/retour`,
        notify_url: `${appUrl}/api/webhooks/payunit`,
        payment_country: "CM",
    };

    const response = await fetch(`${PAYUNIT_BASE_URL}/api/gateway/initialize`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || data.status !== "SUCCESS") {
        throw new Error(data.message || "Échec de l'initialisation du paiement PayUnit");
    }

    return data.data; // contient transaction_url, t_id, providers, etc.
}

/**
 * Vérifie le statut d'une transaction.
 * @param {string} transactionId
 */
export async function getPaymentStatus(transactionId) {
    const response = await fetch(
        `${PAYUNIT_BASE_URL}/api/gateway/paymentstatus/${transactionId}`,
        {
            method: "GET",
            headers: getAuthHeaders(),
        }
    );

    const data = await response.json();
    return data;
}