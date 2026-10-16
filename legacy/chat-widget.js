/**
 * Chat Widget - Integración con n8n para agente IA
 * Widget flotante con glassmorphism
 */

class ChatWidget {
    constructor(options = {}) {
        this.webhookUrl = options.webhookUrl || null; // Configurar después
        this.title = options.title || '¿Hablamos?';
        this.subtitle = options.subtitle || 'Agente IA CODEX';
        this.initialMessage = options.initialMessage || '¡Hola! 👋 Soy el asistente virtual de CODEX AI Consulting. ¿En qué puedo ayudarte hoy?';
        this.placeholder = options.placeholder || 'Escribe tu mensaje...';
        this.buttonText = options.buttonText || 'Enviar';
        this.isOpen = false;
        this.isMinimized = localStorage.getItem('chatWidgetMinimized') === 'true';

        this.createWidget();
        this.attachEventListeners();

        // Cargar estado
        if (this.isMinimized) {
            this.minimize();
        }
    }

    createWidget() {
        // Crear container principal
        this.container = document.createElement('div');
        this.container.className = 'chat-widget';
        this.container.setAttribute('aria-label', 'Chat widget');
        this.container.setAttribute('role', 'dialog');

        // Botón toggle
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.className = 'chat-widget__toggle';
        this.toggleBtn.setAttribute('aria-label', this.isOpen ? 'Cerrar chat' : 'Abrir chat');
        this.toggleBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        `;

        // Panel chat
        this.panel = document.createElement('div');
        this.panel.className = 'chat-widget__panel';
        this.panel.innerHTML = `
            <div class="chat-widget__header">
                <div class="chat-widget__header-info">
                    <div class="chat-widget__title">${this.title}</div>
                    <div class="chat-widget__subtitle">${this.subtitle}</div>
                </div>
                <div class="chat-widget__header-actions">
                    <button class="chat-widget__minimize" aria-label="Minimizar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="chat-widget__close" aria-label="Cerrar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="chat-widget__body" id="chat-body">
                <div class="chat-widget__message chat-widget__message--bot">
                    <div class="chat-widget__avatar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <path d="M21 15l-5-5-5 5"></path>
                        </svg>
                    </div>
                    <div class="chat-widget__bubble">
                        ${this.initialMessage}
                    </div>
                </div>
            </div>
            <div class="chat-widget__input-area">
                <form class="chat-widget__form" id="chat-form">
                    <div class="chat-widget__form-row">
                        <input
                            type="text"
                            id="chat-name"
                            class="chat-widget__input"
                            placeholder="Tu nombre"
                            required
                            aria-label="Nombre"
                        />
                        <input
                            type="email"
                            id="chat-email"
                            class="chat-widget__input"
                            placeholder="tu@email.com"
                            required
                            aria-label="Email"
                        />
                    </div>
                    <div class="chat-widget__form-row">
                        <textarea
                            id="chat-message"
                            class="chat-widget__textarea"
                            placeholder="${this.placeholder}"
                            rows="3"
                            required
                            aria-label="Mensaje"
                        ></textarea>
                    </div>
                    <button type="submit" class="chat-widget__submit">
                        <span>${this.buttonText}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </form>
            </div>
        `;

        this.container.appendChild(this.toggleBtn);
        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
    }

    attachEventListeners() {
        // Toggle open/close
        this.toggleBtn.addEventListener('click', () => this.toggle());

        // Close button
        this.panel.querySelector('.chat-widget__close').addEventListener('click', () => this.close());

        // Minimize button
        this.panel.querySelector('.chat-widget__minimize').addEventListener('click', () => this.minimize());

        // Form submission
        const form = this.panel.querySelector('#chat-form');
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Keyboard accessibility
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.container.contains(e.target)) {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.container.classList.add('chat-widget--open');
        this.toggleBtn.setAttribute('aria-label', 'Cerrar chat');
        this.panel.querySelector('textarea').focus();
    }

    close() {
        this.isOpen = false;
        this.container.classList.remove('chat-widget--open');
        this.toggleBtn.setAttribute('aria-label', 'Abrir chat');
    }

    minimize() {
        this.isMinimized = true;
        localStorage.setItem('chatWidgetMinimized', 'true');
        this.panel.classList.add('chat-widget__panel--minimized');
    }

    maximize() {
        this.isMinimized = false;
        localStorage.setItem('chatWidgetMinimized', 'false');
        this.panel.classList.remove('chat-widget__panel--minimized');
    }

    async handleSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const submitBtn = form.querySelector('.chat-widget__submit');
        const name = document.getElementById('chat-name').value.trim();
        const email = document.getElementById('chat-email').value.trim();
        const message = document.getElementById('chat-message').value.trim();

        if (!name || !email || !message) {
            this.showError('Por favor completa todos los campos');
            return;
        }

        // Validar email básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showError('Por favor ingresa un email válido');
            return;
        }

        // Mostrar loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span>Enviando...</span>
            <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-dasharray="4"></circle>
            </svg>
        `;

        try {
            const response = await this.sendToN8n({ name, email, message });

            if (response.success) {
                this.addMessage(name, message, 'user');
                this.addMessage('', response.reply || 'Gracias por contactarnos. Un asesor te responderá pronto.', 'bot');

                // Reset form
                form.reset();
            } else {
                throw new Error(response.error || 'Error al enviar');
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.showError('Error al enviar. Por favor intenta de nuevo o contáctanos por WhatsApp.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <span>${this.buttonText}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            `;
        }
    }

    async sendToN8n(data) {
        // Si no hay webhook configurado, simular respuesta
        if (!this.webhookUrl) {
            console.warn('Webhook n8n no configurado. Simulando respuesta.');
            await new Promise(resolve => setTimeout(resolve, 1500));
            return {
                success: true,
                reply: 'Gracias por tu mensaje. Nuestro sistema está configurándose. Te contactaremos pronto por email.'
            };
        }

        const response = await fetch(this.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...data,
                source: 'website-chat',
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return { success: true, reply: result.reply || result.message || 'Gracias por contactarnos.' };
    }

    addMessage(text, originalText, type) {
        const body = document.getElementById('chat-body');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-widget__message chat-widget__message--${type}`;

        const avatarHtml = type === 'bot' ? `
            <div class="chat-widget__avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <path d="M21 15l-5-5-5 5"></path>
                </svg>
            </div>
        ` : '';

        messageDiv.innerHTML = `
            ${avatarHtml}
            <div class="chat-widget__bubble">${text || originalText}</div>
        `;

        body.appendChild(messageDiv);
        body.scrollTop = body.scrollHeight;
    }

    showError(message) {
        // Crear o actualizar error message
        let errorEl = document.querySelector('.chat-widget__error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'chat-widget__error';
            this.panel.querySelector('.chat-widget__body').appendChild(errorEl);
        }

        errorEl.textContent = message;
        errorEl.style.display = 'block';

        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }

    setWebhookUrl(url) {
        this.webhookUrl = url;
    }
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
    // Configurar webhook (será proporcionado por el usuario)
    const chatWidget = new ChatWidget({
        title: '¿Hablamos?',
        subtitle: 'Agente IA CODEX'
    });

    // Exponer globalmente para configurar webhook después
    window.ChatWidget = chatWidget;
});
