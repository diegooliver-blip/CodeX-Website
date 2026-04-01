# CODEX AI CONSULTING - Website v2.0

Sitio web profesional de alto nivel con hero animado, chatbox IA, y mejoras de performance/SEO.

## 🚀 Novedades

- ✅ **Hero con animación Three.js** - Partículas doradas/azules con interacción de mouse
- ✅ **Top Strip + Header dinámico** - Navegación sticky profesional
- ✅ **Chatbox con n8n** - Widget para captura de leads con IA
- ✅ **SEO Completo** - Open Graph, Twitter Cards, Structured Data, sitemap
- ✅ **Accesibilidad** - Skip links, ARIA labels, contraste WCAG
- ✅ **Performance** - Lazy loading, preload, preconnect, CSS optimizado
- ✅ **WhatsApp SVG oficial** - Iconos consistentes en todas las páginas

## 📁 Estructura de Archivos

```
/
├── index.html                    # Página principal con hero animado
├── experiencia.html              # Página de casos de éxito
├── servicios/
│   ├── automatizacion.html      # Servicio 1
│   ├── ventas-ia.html           # Servicio 2
│   ├── contenido-ia.html        # Servicio 3
│   ├── datos-bi.html            # Servicio 4
│   ├── ux-ui.html               # Servicio 5
│   └── marketing.html           # Servicio 6
├── assets/
│   ├── AUTOMATIZA.png
│   ├── AUTOMATIZACION DE PROCESOS.jpg
│   ├── DATA AI.png
│   ├── DISEÑO UXUI.png
│   ├── IMAGEN CONTENIDO ORGANICO.png
│   ├── MARKETING.jpg
│   └── TECLADO AI.png
├── css/
│   ├── style.css               # Estilos principales
│   ├── top-strip.css           # Barra superior sticky
│   ├── header.css              # Header dinámico
│   ├── hero.css                # Estilos del hero
│   └── chat-widget.css         # Chatbox
├── js/
│   ├── main.js                 # Lógica principal (header, menú, etc.)
│   ├── animations.js           # Animaciones GSAP existentes
│   ├── hero-animations.js      # Three.js particles
│   └── chat-widget.js          # Widget chat + n8n
├── config.js                   # Configuración webhook n8n
├── robots.txt                  # SEO robots
├── sitemap.xml                 # Sitemap para Google
└── README.md                   # Este archivo

```

## 🔧 Configuración Inicial

### 1. Configurar Webhook de n8n

Para activar el chatbox con IA:

1. En n8n, crea un **Webhook** (HTTP Request) que reciba POST
2. Agrega nodos para procesar el mensaje (OpenAI, etc.)
3. Configura la respuesta JSON: `{ "reply": "Respuesta del agente" }`
4. Copia la URL del webhook
5. Edita `config.js` y pega la URL:

```javascript
const CONFIG = {
    N8N_WEBHOOK_URL: 'https://tu-n8n.com/webhook/chat',
    TIMEOUT: 30000,
    RETRIES: 3
};
```

6. El chat widget se conectará automáticamente al cargar la página.

### 2. Favicon (Opcional)

Añade tus favicon files a la raíz:
- `favicon.ico` (16x16, 32x32)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180x180)

### 3. Dominio y URLs

Actualiza en todos los HTML:
- Open Graph `og:url`
- Twitter Card `twitter:url`
- Canonical URL
- JSON-LD `url`

Reemplaza `https://codexai.com` por tu dominio real.

### 4. Optimización CSS (Recomendado)

Para reducir tamaño de CSS:

```bash
# Instalar dependencias
npm install -g purgescss

# Minificar y eliminar CSS no usado
purgecss --css style.css top-strip.css header.css hero.css chat-widget.css --content index.html servicios/*.html experiencia.html --output css/
```

### 5. Deploy

Opciones de hosting:

- **Netlify/Vercel/GitHub Pages** - Gratis, CI/CD automático
- **cPanel/FTP** - Subir todos los archivos vía FTP
- **Cloudflare Pages** - Alto performance

Asegúrate de:
- Usar HTTPS
- Configurar dominio personalizado
- Habilitar compression (gzip/brotli)

## ⚙️ Personalización

### Colores

Edita variables CSS en `style.css`:

```css
:root {
    --color-gold: #C9A55A;        /* Color principal dorado */
    --color-blue: #1D4ED8;        /* Azul acento */
    --bg-dark: #0A0A0A;           /* Fondo oscuro */
    --bg-cream: #F5F0E8;          /* Fondo crema */
}
```

### Fuentes

Las fuentes se cargan desde Google Fonts:
- Cormorant Garamond (display serif)
- DM Sans (body)
- Inter (labels)

Para cambiar, edita la URL de fonts en cada HTML y las variables CSS.

### Imágenes

Reemplaza las imágenes en `/assets` manteniendo los nombres:
- `DATA AI.png` - Imagen header e imágenes varias
- `AUTOMATIZA.png` etc. - Imágenes de servicios

La imagen del header usa `DATA AI.png` por defecto (enviar equipo). Cambia en cada HTML si deseas otra.

## ✅ Checklist Pre-Launch

- [ ] Configurar webhook n8n en `config.js`
- [ ] Reemplazar favicons
- [ ] Actualizar URLs canónicas con dominio real
- [ ] Probar formulario de contacto (mailto)
- [ ] Verificar que todas las imágenes cargan
- [ ] Probar en Chrome, Firefox, Safari, Edge
- [ ] Testing móvil (320px, 375px, 768px, 1024px)
- [ ] Lighthouse score >90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Verificar que el chatbox funciona (abrir/cerrar/enviar)
- [ ] Three.js particles funcionan solo en index.html
- [ ] LinkedIn/Instagram links actualizados en footer

## 🐛 Troubleshooting

### Hero animation no carga
- Verifica que Three.js CDN esté accesible
- Revisa consola por errores
- `prefers-reduced-motion` desactiva animación

### Chatbox no envía mensajes
- Verifica que `config.js` esté cargado
- Revisa URL del webhook
- Revisa Network tab en DevTools

### Top strip no sticky
- Verifica que el body tenga clase `has-top-strip`
- Asegúrate de que `top-strip.css` esté cargado

### WhatsApp icon no aparece
- Usamos SVG inline, no font
- Verifica que el SVG esté presente en el HTML

## 📊 Performance Tips

- ✅ Usa WebP/AVIF en lugar de PNG/JPG (convertir imágenes)
- ✅ Minificar CSS/JS (PurgeCSS, Terser)
- ✅ Habilitar HTTP/2 y compression en servidor
- ✅ Considerar CDN para assets
- ✅ Lazy load imágenes ya implementado
- ✅ Preload para fonts e imagen hero ya configurado

## 🎨 Design System

### Colores
- Dorado: `#C9A55A`
- Azul: `#1D4ED8`
- Negro: `#0A0A0A`
- Crema: `#F5F0E8`
- Blanco: `#FFFFFF`

### Tipografía
- Display: Cormorant Garamond (500-700)
- Body: DM Sans (300-600)
- Labels: Inter (400-600)

### Spacing
- Top strip: 50px
- Header: 90px (scrolled 70px)
- Hero: 100vh
- Container max-width: 1400px

---

**Desarrollado para CODEX AI CONSULTING**  
© 2025 Todos los derechos reservados.
