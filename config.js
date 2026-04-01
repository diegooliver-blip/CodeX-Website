/**
 * CONFIGURACIÓN DEL CHAT WIDGET - n8n Webhook
 *
 * Para conectar el chatbox con tu agente IA en n8n:
 *
 * 1. En n8n, crea un webhook trigger (HTTP Request)
 * 2. Configura tu agente/OpenAI para procesar el mensaje
 * 3. Copia la URL del webhook (ej: https://n8n.example.com/webhook/chat)
 * 4. Pégala aquí abajo en la variable N8N_WEBHOOK_URL
 *
 * Si no configuras el webhook, el chat funcionará en modo demo
 * mostrando un mensaje de que el sistema está en configuración.
 */

const CONFIG = {
    // URL del webhook de n8n (obligatorio para producción)
    // Ejemplo: 'https://tu-instancia-n8n.com/webhook/chat'
    N8N_WEBHOOK_URL: '',

    // Tiempo timeout para la petición (ms)
    TIMEOUT: 30000,

    // Número de reintentos si falla
    RETRIES: 3,

    // Mensaje inicial del bot
    INITIAL_MESSAGE: '¡Hola! 👋 Soy el asistente virtual de CODEX AI Consulting. ¿En qué puedo ayudarte hoy?'
};

// Inicializar chat widget con configuración
document.addEventListener('DOMContentLoaded', () => {
    if (window.ChatWidget && CONFIG.N8N_WEBHOOK_URL) {
        window.ChatWidget.setWebhookUrl(CONFIG.N8N_WEBHOOK_URL);
    }
});
