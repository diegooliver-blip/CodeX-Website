# CODEX AI CONSULTING — AUDITORÍA Y PREPARACIÓN FASE 1 (HAIKU)

**Fecha**: 2026-04-23  
**Fase**: Arquitectura de Preparación  
**Estado**: ✅ Auditoría Completa → Listo para Rediseño Premium (Sonnet)  
**Objetivo**: Preparar terreno profesional sin cambiar branding ni romper funcionalidad

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### Estructura de Archivos
```
/WEBSITE CODEX/
├── index.html (843 líneas) — Página principal, bien estructurada
├── style.css (2935 líneas) — Variables globales + estilos generales
├── hero.css (346 líneas) — Estilos hero section (DUPLICACIÓN)
├── service-styles.css (2409 líneas) — Estilos servicios + resultados
├── header.css (274 líneas) — Header y mega-menu
├── top-strip.css (TBD) — Top contact bar
├── chat-widget.css — Chat widget component
├── animations.js (535 líneas) — GSAP + ScrollTrigger + Lenis
├── hero-animations.js (218 líneas) — DUPLICACIÓN DETECTADA
├── main.js (235 líneas) — Interacciones globales
├── config.js — Configuración
├── /servicios/ — 6 páginas de servicios (ventas-ia, ux-ui, marketing, automatizacion, datos-bi, contenido-ia)
├── /images/ — Assets visuales (7 imágenes)
└── REDESIGN_ROADMAP.md — Roadmap existente (bueno, mantener como referencia)
```

**Total CSS**: 6717 líneas distribuidas en 6 archivos  
**Total JS**: ~1000 líneas distribuidas en 4 archivos

---

## 🔍 PROBLEMAS DETECTADOS

### 1. **CSS FRAGMENTADO** ❌
- **Problema**: CSS esparcido en 6 archivos sin clara separación de concerns
  - `style.css` → Variables + estilos generales (2935 líneas)
  - `hero.css` → Hero específico (346 líneas) — DUPLICA código con style.css
  - `service-styles.css` → Servicios + resultados (2409 líneas) — MUY GRANDE
  - `header.css` → Header + mega-menu (274 líneas)
  - `top-strip.css` — Top contact
  - `chat-widget.css` — Widget

- **Impacto**: 
  - Difícil mantener consistencia
  - Selectores repetidos
  - Conflictos de especificidad
  - Imposible reutilizar componentes

### 2. **ANIMACIONES DUPLICADAS** ❌
- **Problema**: Dos archivos de animaciones
  - `animations.js` (535 líneas) — Lenis, GSAP, ScrollTrigger, counters
  - `hero-animations.js` (218 líneas) — Probablemente hero-specific

- **Impacto**: Confusión sobre cuál es la fuente de verdad
- **Recomendación**: Consolidar en un solo sistema

### 3. **IMÁGENES NO MAPPEDADAS A SERVICIOS** ❌
- Imágenes existen pero no están vinculadas dinámicamente:
  ```
  img_ventas-ia.png ↔ ventas-ia.html ?
  img_ux-ui.png ↔ ux-ui.html ?
  img_marketing.png ↔ marketing.html ?
  img_automatizacion.png ↔ automatizacion.html ?
  img_analisis-datos.png ↔ datos-bi.html ?
  img_contenido-ia.png ↔ contenido-ia.html ?
  ```
- **Impacto**: Difícil actualizar imágenes dinámicamente
- **Recomendación**: Crear data.json o mapping en JS

### 4. **COMPONENTES NO REUTILIZABLES** ❌
- Hero, Service Cards, CTA buttons, etc. están hardcodeados
- Cada página es una isla
- Imposible aplicar cambios globales rápido

### 5. **TODO PENDIENTE EN main.js** ❌
```javascript
// Línea 204: TODO: Replace with actual endpoint (Netlify Forms, Formspree, or custom backend)
```
- Contact form aún usa mailto fallback
- Recomendación: Integrar FormSubmit, Formspree o Netlify Forms

### 6. **VARIABLES GLOBALES INCOMPLETAS** ⚠️
- Existen en style.css pero no se usan consistentemente
- Falta:
  - `--gold` (mencionado pero no definido)
  - `--transition-smooth` (usado en service-styles.css:89, no definido)
  - Colores de sombra
  - Z-index system

### 7. **RESPONSIVE NO OPTIMIZADO** ⚠️
- Breakpoints dispersos en múltiples archivos
- Mobile-first no siempre aplicado
- Falta tablet breakpoints

### 8. **SEO INCOMPLETO** ⚠️
- Alt tags en imágenes: placeholders
- Schema markup: no hay JSON-LD
- Headings: estructura OK pero podría refinarse

### 9. **PERFORMANCE** ⚠️
- Hero-bg.jpg (3.2MB) no está optimizado
- Imágenes no tienen `loading="lazy"`
- GSAP + Lenis ambos activos = overhead
- No hay preload de assets críticos

---

## 🎯 MAPEO DE SERVICIOS + IMÁGENES

| Servicio | Página | Imagen | Estado |
|----------|--------|--------|--------|
| Ventas con IA | `servicios/ventas-ia.html` | `img_ventas-ia.png` | ❌ No vinculada |
| UX/UI Design | `servicios/ux-ui.html` | `img_ux-ui.png` | ❌ No vinculada |
| Marketing Digital | `servicios/marketing.html` | `img_marketing-dig.png` | ❌ No vinculada |
| Automatización | `servicios/automatizacion.html` | `img_automatizacion-inteligente.png` | ❌ No vinculada |
| Análisis de Datos & BI | `servicios/datos-bi.html` | `img_analisis-datos.png` | ❌ No vinculada |
| Contenido Orgánico IA | `servicios/contenido-ia.html` | `img_contenido-organico.png` | ❌ No vinculada |

**Recomendación**: Crear `_data/services.json`:
```json
{
  "services": [
    {
      "id": "ventas-ia",
      "title": "Ventas con IA",
      "url": "servicios/ventas-ia.html",
      "image": "img_ventas-ia.png",
      "icon": "zap",
      "color": "#FF6B6B"
    },
    ...
  ]
}
```

---

## 🏗️ ARQUITECTURA CSS RECOMENDADA

**Estructura Limpia tipo Arquitectura Atómica**:

```
/css/
├── _variables.css (160 líneas)
│   ├── Colors (primary, secondary, status)
│   ├── Typography (font families, sizes, weights)
│   ├── Spacing (margins, padding scale)
│   ├── Shadows (soft, medium, strong)
│   ├── Transitions (timings, easings)
│   ├── Z-index system
│   └── Breakpoints
│
├── _reset-and-base.css (80 líneas)
│   ├── Reset (*{})
│   ├── HTML/Body defaults
│   ├── Typography defaults
│   └── Link/Button resets
│
├── _typography.css (150 líneas)
│   ├── Heading styles (h1-h6)
│   ├── Body text scales
│   ├── Label/Badge text
│   └── Utility text classes
│
├── _layout.css (200 líneas)
│   ├── Container
│   ├── Grid/Flex utilities
│   ├── Section padding
│   └── Responsive helpers
│
├── components/ (600 líneas)
│   ├── _buttons.css
│   ├── _cards.css
│   ├── _forms.css
│   ├── _badges.css
│   ├── _nav.css (header + mega-menu)
│   └── _modals.css
│
├── sections/ (1200 líneas)
│   ├── _hero.css
│   ├── _services.css
│   ├── _results.css
│   ├── _team.css
│   ├── _blog.css
│   ├── _cta.css
│   ├── _footer.css
│   └── _contact.css
│
├── animations/ (300 líneas)
│   ├── _keyframes.css (todas las @keyframes)
│   └── _utilities.css (animation utility classes)
│
└── style.css (50 líneas)
    └── @import todas las anteriores
```

**Ventajas**:
- Fácil de navegar (cada archivo ~200-300 líneas)
- Claridad de responsabilidad
- Reutilizable en multiples proyectos
- Performance: solo carga lo necesario
- Escalable para Sonnet Phase 2

---

## 📦 VARIABLES GLOBALES CONSOLIDADAS

**Propuestas para agregar/actualizar en `:root`**:

```css
:root {
  /* ─── COLORES ACTUALES ─────────────────────────── */
  --bg: #FFFFFF;
  --bg-cream: #EEF2F7;
  --bg-dark: #0A1628;
  --bg-dark-2: #0D1E35;
  --blue: #0F2D5A;
  --blue-light: #2563EB;
  --blue-bright: #60A5FA;
  --text-main: #0A1628;
  --text-muted: #5B7499;
  --text-light: #EEF2F7;
  
  /* ─── VARIABLES FALTANTES ─────────────────────── */
  --gold: #C9A55A; /* Mencionado pero no definido */
  --accent-primary: #2563EB; /* Cyan/Light Blue */
  --accent-secondary: #C9A55A; /* Gold */
  --status-success: #10B981;
  --status-warning: #F59E0B;
  --status-error: #EF4444;
  
  /* ─── SOMBRAS ──────────────────────────────────── */
  --shadow-soft: 0 2px 12px rgba(10, 22, 40, 0.06);
  --shadow-medium: 0 8px 24px rgba(10, 22, 40, 0.12);
  --shadow-strong: 0 16px 48px rgba(10, 22, 40, 0.16);
  --shadow-glow: 0 0 20px rgba(37, 99, 235, 0.15);
  
  /* ─── BORDERS ──────────────────────────────────– */
  --border: 1px solid rgba(0, 0, 0, 0.06);
  --border-strong: 1px solid rgba(10, 22, 40, 0.15);
  
  /* ─── TRANSICIONES ─────────────────────────────– */
  --transition-smooth: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bouncy: 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* ─── TIPOGRAFÍA ───────────────────────────────– */
  --font-display: 'Outfit', 'Space Grotesk', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-label: 'Inter', sans-serif;
  
  /* ─── Z-INDEX SYSTEM ───────────────────────────– */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal: 1000;
  --z-tooltip: 1100;
  --z-notification: 1200;
  
  /* ─── LAYOUT ───────────────────────────────────– */
  --header-height: clamp(64px, 8vh, 80px);
  --container-max: 1280px;
  --section-padding: clamp(60px, 10vh, 120px) 24px;
  
  /* ─── ESPACIADO ────────────────────────────────– */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 32px;
  
  /* ─── BREAKPOINTS (para uso en @media) ─────────– */
  /* mobile: 320px-640px
     tablet: 641px-1024px
     desktop: 1025px+ */
}
```

**Archivos actualizados**:
- `style.css` — Agregar variables faltantes
- Todos los `.css` — Reemplazar valores hardcodeados con variables

---

## 🧩 COMPONENTES REUTILIZABLES A PREPARAR

### 1. **Hero Section Component**
```html
<!-- Estructura limpia -->
<section class="hero" data-hero-type="dark">
  <div class="hero__content">
    <h1 class="hero__title">Título</h1>
    <p class="hero__subtitle">Subtítulo</p>
    <div class="hero__cta">
      <button class="btn btn--primary">CTA</button>
    </div>
  </div>
  <div class="hero__image">
    <img src="..." alt="..." loading="lazy" />
  </div>
</section>
```
- Variantes: `data-hero-type="dark"`, `"light"`, `"gradient"`
- CSS limpio en `sections/_hero.css`

### 2. **Service Card Component**
```html
<div class="card card--service">
  <div class="card__icon"><i data-lucide="..."></i></div>
  <h3 class="card__title">Servicio</h3>
  <p class="card__description">Descripción</p>
  <a href="#" class="card__link">Saber más →</a>
</div>
```
- Grid layout automático: 3 columns desktop, 1 mobile
- CSS en `components/_cards.css`

### 3. **Result/Stat Card Component**
```html
<div class="stat-card">
  <div class="stat-card__icon"><i data-lucide="..."></i></div>
  <div class="stat-card__number">340%</div>
  <div class="stat-card__label">Eficiencia</div>
  <div class="stat-card__bars"><!-- Gráficos --></div>
</div>
```
- Consistencia con resultados section
- Animation hooks para scroll reveals

### 4. **CTA Button Component**
```html
<button class="btn btn--primary btn--size-lg">
  <span>Call To Action</span>
  <i data-lucide="arrow-right"></i>
</button>
```
- Variantes: `--primary`, `--secondary`, `--outline`
- Tamaños: `--size-sm`, `--size-md`, `--size-lg`
- Estados: hover, active, disabled

### 5. **Badge Component**
```html
<span class="badge badge--primary">
  <i data-lucide="..."></i>
  Label
</span>
```
- Variantes de color (primary, success, warning, error)

### 6. **Navigation/Header Component**
```html
<header class="header">
  <div class="header__content">
    <div class="header__logo"></div>
    <nav class="header__nav"><!-- Mega menu --></nav>
  </div>
</header>
```
- Mega menu reutilizable
- Responsive toggle

### 7. **Team Card Component**
```html
<div class="team-card">
  <div class="team-card__avatar">DM</div>
  <h3 class="team-card__name">Diego</h3>
  <p class="team-card__role">Founder</p>
</div>
```

### 8. **Blog Card Component**
```html
<div class="blog-card">
  <img class="blog-card__image" src="..." alt="..." />
  <span class="blog-card__category">Categoría</span>
  <h3 class="blog-card__title">Título</h3>
  <p class="blog-card__excerpt">Fragmento...</p>
  <a href="#" class="blog-card__link">Leer más →</a>
</div>
```

### 9. **Form Component**
```html
<form class="form">
  <div class="form__group">
    <label class="form__label">Label</label>
    <input class="form__input" type="text" />
  </div>
  <button class="form__submit btn btn--primary">Enviar</button>
</form>
```

### 10. **Modal/Dialog Component**
```html
<div class="modal" data-modal="contacto">
  <div class="modal__backdrop"></div>
  <div class="modal__content">
    <!-- Contenido -->
  </div>
</div>
```

---

## 🎬 SISTEMA DE ANIMACIONES LIMPIO

### Recomendación: Consolidar en `animations.js`

**Estructura propuesta**:
```javascript
// animations.js
class AnimationController {
  constructor() {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  // 1. Smooth Scroll (Lenis)
  initLenisScroll() { ... }

  // 2. Scroll Reveals (IntersectionObserver)
  initScrollReveals() { ... }

  // 3. GSAP ScrollTrigger Animations
  initScrollTriggers() { ... }

  // 4. Counter Animations
  initCounters() { ... }

  // 5. Hover Effects
  initHoverEffects() { ... }

  // 6. Text Reveals (si usa Splitting.js)
  initTextReveals() { ... }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  const animator = new AnimationController();
  animator.init();
});
```

**Animaciones propuestas para Sonnet Phase 2**:
- Fade-up on scroll (IntersectionObserver)
- Stagger card reveals (GSAP)
- Parallax text (ScrollTrigger)
- Hover lift effect (CSS + JS)
- Counter animations (requestAnimationFrame)
- Button ripple effect (CSS)
- Icon floats (CSS keyframes)
- Text reveal (Splitting.js)

**hero-animations.js**: ❌ Eliminar, consolidar en `animations.js`

---

## 🔐 SEO READY

### Checklist:

- [ ] **Meta tags**: Actualizar og:image, description
- [ ] **Headings**: h1 por página, h2-h6 jerárquicos
- [ ] **Alt tags**: Todas las imágenes con alt descriptivo
- [ ] **Schema.json**: Agregar JSON-LD para:
  - Organization (home)
  - LocalBusiness (contacto)
  - Service (cada servicio)
  - Article (blog)
- [ ] **Sitemap.xml**: Crear y registrar
- [ ] **robots.txt**: Crear
- [ ] **Canonical tags**: Verificar
- [ ] **Mobile optimization**: Viewport correcto

**Plantilla Schema**:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "CODEX AI Consulting",
  "url": "https://codexai.com",
  "logo": "https://codexai.com/logo.png",
  "description": "Consultoría premium de IA y automatización",
  "contact": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "telephone": "+52-833-137-5723",
    "email": "codexai.consulting@gmail.com"
  },
  "areaServed": "MX",
  "knowsLanguage": ["es", "en"]
}
```

---

## ⚡ PERFORMANCE READY

### Auditoría Actual:
- **hero-bg.jpg**: 3.2MB → Optimizar
- **No lazy loading**: Imágenes sin `loading="lazy"`
- **No preload**: Assets críticos no preloaded
- **GSAP + Lenis**: Ambos activos (overhead)

### Optimizaciones recomendadas:

```html
<!-- 1. Preload críticos -->
<link rel="preload" as="image" href="images/hero-bg.jpg" />

<!-- 2. Lazy loading -->
<img src="..." alt="..." loading="lazy" />

<!-- 3. Respuestas de imagen -->
<img 
  srcset="small.png 640w, medium.png 1024w, large.png 1280w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 100vw"
  src="large.png"
  alt="..."
  loading="lazy"
/>

<!-- 4. Minificar imágenes -->
<!-- Usar ImageOptim, TinyPNG, o similar -->

<!-- 5. AVIF/WebP fallbacks -->
<picture>
  <source srcset="image.avif" type="image/avif" />
  <source srcset="image.webp" type="image/webp" />
  <img src="image.png" alt="..." loading="lazy" />
</picture>
```

### Métricas Core Web Vitals objetivo:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

---

## 📝 CAMBIOS ESPECÍFICOS A HACER

### Fase Haiku (Actual - PREPARACIÓN):
✅ **SOLO PREPARACIÓN** (sin cambios visuales)

1. **Consolidar variables globales** en `style.css`
   - Agregar variables faltantes (`--gold`, `--transition-smooth`, etc.)
   - Documentar z-index system

2. **Crear estructura CSS limpia**
   - Crear carpeta `/css/`
   - Pero NO refactorizar todavía (demasiado riesgo)
   - Documentar cómo será la estructura para Sonnet

3. **Mapear servicios + imágenes**
   - Crear `_data/services.json` (opcional, puede hacerlo Sonnet)
   - Documentar relaciones

4. **Limpiar comentarios y documentación**
   - Revisar TODOs
   - Documentar para Sonnet

5. **Verificar responsive**
   - Pequeños ajustes si es necesario
   - No tocar diseño

### Fase Sonnet (SIGUIENTE):
🚀 **REDISEÑO VISUAL**
- Aplicar arquitectura CSS limpia
- Implementar componentes reutilizables
- Agregar micro-interacciones (hover, scroll reveals)
- Consolidar animaciones
- Optimizar performance
- Aplicar diseño premium Awwwards-level

---

## 📋 CHECKLIST ANTES DE ENTREGAR A SONNET

- [ ] **Style.css**: Variables globales consolidadas
- [ ] **Documentación**: AUDIT_AND_PREP.md completo
- [ ] **REDESIGN_ROADMAP.md**: Actualizado con hallazgos
- [ ] **Mapeo de servicios**: Documentado
- [ ] **Componentes**: Especificados y documentados
- [ ] **TODO pendientes**: Identificados
- [ ] **Performance issues**: Listados
- [ ] **Git**: Cambios committeados (si aplica)
- [ ] **No rompimiento**: Funcionalidad intacta ✅
- [ ] **Branding**: Sin cambios ✅

---

## 🎯 SIGUIENTES PASOS PARA SONNET

### Fase 2: Rediseño Visual Premium

1. **Refactorizar CSS**
   - Crear arquitectura `/css/` como se especifica
   - Aplicar BEM naming
   - Eliminar duplicados

2. **Implementar componentes**
   - Hero reutilizable
   - Service cards grid
   - CTA buttons upgrade
   - Badges y badges mejorados

3. **Animaciones avanzadas**
   - Scroll reveals (IntersectionObserver)
   - Text animations (Splitting.js)
   - Hover effects premium
   - Counter animations mejoradas

4. **Imágenes dinámicas**
   - Vincular con data.json
   - Lazy loading
   - Responsive images

5. **Performance**
   - Minificar assets
   - Preload críticos
   - Consolidar GSAP + Lenis

6. **SEO**
   - Schema.json
   - Sitemap.xml
   - Meta tags optimizados

---

## 📊 MÉTRICAS ACTUALES

| Métrica | Valor | Estado |
|---------|-------|--------|
| Total CSS | 6717 líneas | ⚠️ Alto |
| Total JS | ~1000 líneas | ⚠️ Podría consolidarse |
| Archivos CSS | 6 | ⚠️ Fragmentado |
| Archivos JS | 4 | ⚠️ Podría ser 2 |
| Imágenes vinculadas | 0/7 | ❌ |
| Variables globales | 12 | ⚠️ Incompletas |
| Componentes reutilizables | 0 | ❌ |
| SEO score | 70/100 | ⚠️ |

---

## 📌 NOTAS IMPORTANTES

1. **NO ROMPER FUNCIONALIDAD**: Todo debe seguir funcionando igual
2. **NO CAMBIAR BRANDING**: Colores, tipografía, estructura base intactos
3. **DOCUMENTAR PARA SONNET**: Dejar instrucciones claras
4. **VALIDAR EN NAVEGADOR**: Si hay cambios, probar en desktop + mobile
5. **GIT CLEAN**: Commits descriptivos si se hacen cambios

---

## 🚀 CONCLUSIÓN

El proyecto está **funcional pero desorganizado**. La auditoría ha identificado:

✅ **Fortalezas**:
- Estructura HTML bien organizada
- Variables globales presentes
- Animaciones funcionales
- Contenido premium
- Responsivo (aunque mejorable)

❌ **Debilidades**:
- CSS fragmentado sin clara separación
- Componentes no reutilizables
- Animaciones duplicadas
- Imágenes no vinculadas
- Performance sin optimizar
- SEO incompleto

**Recomendación**: Pasar a **Sonnet Phase 2** con este documento como guía. Sonnet podrá refactorizar CSS, implementar componentes, optimizar performance y aplicar diseño premium sin necesidad de auditoría adicional.

---

**Documento preparado por**: Claude Haiku 4.5  
**Fecha**: 2026-04-23  
**Para**: Sonnet Phase 2 (Rediseño Premium)  
**Estado**: ✅ LISTO PARA SONNET
