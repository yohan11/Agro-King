export async function sendWhatsAppMessage(phoneNumber, message) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
        console.warn("WhatsApp API: Identifiants manquants (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID). Le message ne sera pas envoyé.");
        return { success: false, error: "Identifiants WhatsApp non configurés" };
    }

    try {
        // Formater le numéro de téléphone (WhatsApp exige le format international sans le signe '+')
        // Exemple: 2376XXXXXXXX
        let formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
        
        // Si le numéro commence par 6 et fait 9 chiffres (Cameroun), on ajoute 237
        if (formattedPhone.length === 9 && (formattedPhone.startsWith('6') || formattedPhone.startsWith('2'))) {
            formattedPhone = `237${formattedPhone}`;
        }
        
        // Si le numéro commence par 00, on enlève les 00
        if (formattedPhone.startsWith('00')) {
            formattedPhone = formattedPhone.substring(2);
        }

        // L'API officielle WhatsApp Cloud (Graph API)
        const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

        // Note: Pour envoyer un message hors de la fenêtre de 24h, Meta exige d'utiliser un "template" validé.
        // Pour les tests ou si le client vous a déjà écrit, on peut envoyer un message texte libre.
        const body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "text",
            text: {
                preview_url: false,
                body: message
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Erreur WhatsApp: ${JSON.stringify(errData)}`);
        }

        console.log(`Message WhatsApp envoyé avec succès à ${formattedPhone}`);
        return { success: true };

    } catch (error) {
        console.error("WhatsApp API Exception:", error);
        return { success: false, error: error.message };
    }
}
