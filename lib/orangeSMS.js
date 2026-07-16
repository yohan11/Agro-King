export async function sendOrangeSMS(phoneNumber, message) {
    // 1. Récupérer les identifiants depuis les variables d'environnement
    const clientId = process.env.ORANGE_CLIENT_ID;
    const clientSecret = process.env.ORANGE_CLIENT_SECRET;
    const senderName = process.env.ORANGE_SENDER_NAME || 'AgroKing';
    
    if (!clientId || !clientSecret) {
        console.warn("Orange SMS: Identifiants manquants (ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET). Le SMS ne sera pas envoyé.");
        return { success: false, error: "Identifiants Orange non configurés" };
    }

    try {
        // 2. Générer le token d'accès
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenResponse = await fetch('https://api.orange.com/oauth/v3/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: 'grant_type=client_credentials'
        });

        if (!tokenResponse.ok) {
            const err = await tokenResponse.text();
            throw new Error(`Erreur authentification Orange: ${err}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Formater le numéro de téléphone (s'assurer qu'il a le format international, ex: +237...)
        // L'API Orange requiert souvent le format: +2376XXXXXXXX
        let formattedPhone = phoneNumber.replace(/[^0-9+]/g, '');
        if (!formattedPhone.startsWith('+')) {
            // Si pas de +, on ajoute +237 par défaut (Cameroun)
            formattedPhone = `+237${formattedPhone}`;
        }

        // 3. Envoyer le SMS
        // L'URL de l'API SMS dépend de la zone, mais la syntaxe globale est souvent celle-ci :
        const smsUrl = `https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B${senderName}/requests`;
        
        const smsBody = {
            outboundSMSMessageRequest: {
                address: `tel:${formattedPhone}`,
                senderAddress: `tel:+${senderName}`,
                outboundSMSTextMessage: {
                    message: message
                }
            }
        };

        const smsResponse = await fetch(smsUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(smsBody)
        });

        if (!smsResponse.ok) {
            const err = await smsResponse.text();
            throw new Error(`Erreur envoi SMS: ${err}`);
        }

        console.log(`SMS envoyé avec succès à ${formattedPhone}`);
        return { success: true };

    } catch (error) {
        console.error("Orange SMS Exception:", error);
        return { success: false, error: error.message };
    }
}
