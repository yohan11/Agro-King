export async function sendWhatsAppMessage(phoneNumber, message) {
    let formattedPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
    if (formattedPhone.length === 9 && (formattedPhone.startsWith('6') || formattedPhone.startsWith('2'))) {
        formattedPhone = `237${formattedPhone}`;
    }
    if (formattedPhone.startsWith('00')) {
        formattedPhone = formattedPhone.substring(2);
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const callMeBotApiKey = process.env.CALLMEBOT_API_KEY;

    // 1. Try Meta WhatsApp Cloud API if credentials exist
    if (token && phoneId) {
        try {
            const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
            const body = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedPhone,
                type: "text",
                text: { preview_url: false, body: message }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                console.log(`Message WhatsApp Meta Cloud envoyé à ${formattedPhone}`);
                return { success: true, provider: 'Meta' };
            }
        } catch (err) {
            console.error("Meta WhatsApp API error:", err);
        }
    }

    // 2. Try CallMeBot Gateway (Free Automated WhatsApp Service)
    if (callMeBotApiKey) {
        try {
            const encodedText = encodeURIComponent(message);
            const callMeBotUrl = `https://api.callmebot.com/whatsapp.php?phone=${formattedPhone}&text=${encodedText}&apikey=${callMeBotApiKey}`;
            const res = await fetch(callMeBotUrl);
            if (res.ok) {
                console.log(`Message WhatsApp CallMeBot envoyé à ${formattedPhone}`);
                return { success: true, provider: 'CallMeBot' };
            }
        } catch (err) {
            console.error("CallMeBot WhatsApp error:", err);
        }
    }

    console.warn("WhatsApp API: Aucun fournisseur WhatsApp automatique configuré (WHATSAPP_TOKEN ou CALLMEBOT_API_KEY requis).");
    return { success: false, error: "Identifiants WhatsApp non configurés" };
}
