# CSS ARCHITECTURE GUIDE — Para Phase 2 (Sonnet)

**Estado**: 📋 Documento de referencia  
**Para**: Sonnet - Fase 2 de rediseño  
**Objetivo**: Estructura CSS escalable, mantenible y reutilizable

---

## 📊 ESTADO ACTUAL

```
ANTES (Current - 6717 líneas fragmentadas):
style.css (2935) ─┬─ Variables + estilos generales
                 ├─ Overlapping con hero.css
                 └─ Componentes mixtos

hero.css (346) ──── Hero-specific (DUPLICACIÓN)

service-styles.css (2409) ─┬─ Servicios
                           ├─ Resultados
                           └─ Todo lo demás que no cabe

header.css (274) ─┬─ Header
                  └─ Mega menu

top-strip.css ──── Top contact bar

chat-widget.css ── Chat widget
```

---

## 🏗️ ARQUITECTURA RECOMENDADA

```
DESPUÉS (Propuesto - Modular y escalable):

/css/
│
├── 📌 01-variables.css (180 líneas)
│   ├── Colors (primary, secondary, status)
│   ├── Typography scales
│   ├── Spacing system
│   ├── Shadows (soft, medium, strong, glow)
│   ├── Transitions & easings
│   ├── Z-index system
│   └── Breakpoints
│
├── 📌 02-reset-and-base.css (90 líneas)
│   ├── CSS reset (*, *::before, *::after)
│   ├── HTML/Body defaults
│   ├── Typography base
│   ├── Link defaults
│   └── Button/Input resets
│
├── 📌 03-typography.css (160 líneas)
│   ├── Heading styles (h1-h6 scales)
│   ├── Body text scales (small, base, large)
│   ├── Label/Badge text
│   ├── Utility text classes (.text-muted, .text-small, etc)
│   └── Font loading fallbacks
│
├── 📌 04-layout.css (200 líneas)
│   ├── .container (max-width centering)
│   ├── .section-padding (consistent spacing)
│   ├── Grid utilities (.grid, .grid-2, .grid-3)
│   ├── Flex utilities (.flex, .flex-center, .flex-between)
│   ├── Responsive helpers (.hide-mobile, .hide-desktop)
│   └── Breakpoint-specific rules
│
├── 📁 components/ (600 líneas total)
│   ├── 05-buttons.css (150 líneas)
│   │   ├── .btn (base)
│   │   ├── .btn--primary, --secondary, --outline
│   │   ├── .btn--size-sm, --size-md, --size-lg
│   │   ├── Hover, active, disabled states
│   │   └── Icon alignment
│   │
│   ├── 06-cards.css (150 líneas)
│   │   ├── .card (base)
│   │   ├── .card--service, --result, --blog, --team
│   │   ├── .card__header, __body, __footer
│   │   ├── Hover effects (lift, shadow)
│   │   └── Responsive behavior
│   │
│   ├── 07-forms.css (100 líneas)
│   │   ├── .form, .form__group
│   │   ├── .form__label, .form__input
│   │   ├── .form__error, .form__success
│   │   ├── Focus states
│   │   └── Responsive widths
│   │
│   ├── 08-badges.css (80 líneas)
│   │   ├── .badge (base)
│   │   ├── .badge--primary, --success, --warning, --error
│   │   ├── .badge--sm, --md, --lg
│   │   └── Icon badges
│   │
│   └── 09-navigation.css (120 líneas)
│       ├── .header, .header__content
│       ├── .logo, .logo--light, --dark
│       ├── .nav, .nav__item, .nav__link
│       ├── .mega-menu, .mega-menu__item
│       ├── Mobile menu toggle
│       └── Sticky header scroll effect
│
├── 📁 sections/ (1400 líneas total)
│   ├── 10-hero.css (250 líneas)
│   │   ├── .hero, .hero--dark, --light, --gradient
│   │   ├── .hero__content, __title, __subtitle
│   │   ├── .hero__cta-group, .hero__image
│   │   ├── Parallax setup
│   │   ├── Background variations
│   │   └── Responsive grid collapsing
│   │
│   ├── 11-services.css (250 líneas)
│   │   ├── .services-section
│   │   ├── .services-grid (3-col on desktop)
│   │   ├── .service-card (inherits from card)
│   │   ├── .service-card__icon, __title, __description
│   │   ├── Service card hover effects
│   │   └── Category filtering (if needed)
│   │
│   ├── 12-results.css (300 líneas)
│   │   ├── .results-section
│   │   ├── .results-grid
│   │   ├── .result-card, .result-card--stat
│   │   ├── .result-number (animate on scroll)
│   │   ├── .result-bars (before/after visualization)
│   │   ├── .sector-pills
│   │   ├── .methodology-block
│   │   └── Responsive grid collapse
│   │
│   ├── 13-team.css (200 líneas)
│   │   ├── .team-section
│   │   ├── .team-grid (3-col on desktop)
│   │   ├── .team-card, .team-card__avatar
│   │   ├── .team-card__name, __role, __bio
│   │   ├── Hover effects
│   │   └── Social links
│   │
│   ├── 14-blog.css (200 líneas)
│   │   ├── .blog-section
│   │   ├── .blog-grid
│   │   ├── .blog-card, .blog-card__image
│   │   ├── .blog-card__category, __title, __excerpt
│   │   ├── Card hover image zoom
│   │   └── Read more link styling
│   │
│   ├── 15-cta.css (150 líneas)
│   │   ├── .cta-section, .cta-section--full
│   │   ├── .cta__content
│   │   ├── .cta__title, __subtitle
│   │   ├── .cta__button-group
│   │   ├── Background variations
│   │   └── Responsive layout
│   │
│   └── 16-footer.css (50 líneas)
│       ├── .footer
│       ├── .footer__content
│       ├── .footer__column
│       └── Responsive column stacking
│
├── 📁 animations/ (250 líneas total)
│   ├── 17-keyframes.css (150 líneas)
│   │   ├── @keyframes fadeUp
│   │   ├── @keyframes slideInLeft/Right
│   │   ├── @keyframes pulse, float, glow
│   │   ├── @keyframes spin, bounce
│   │   └── Custom brand animations
│   │
│   └── 18-animation-utilities.css (100 líneas)
│       ├── .animate-fade-up
│       ├── .animate-slide-in
│       ├── .animate-on-scroll
│       ├── .animate-delay-{1,2,3,4,5}
│       └── Stagger animations
│
└── 📌 index.css (50 líneas)
    └── @import all files in order
```

---

## 📋 INSTRUCCIONES PARA SONNET

### Paso 1: Crear estructura base
```bash
# En el proyecto:
mkdir -p css/components css/sections css/animations
```

### Paso 2: Migrar y refactorizar

**De `style.css` → `css/01-variables.css`**:
- Copiar variables actuales (ya están consolidadas)
- Mantener como source of truth

**De `style.css` → `css/02-reset-and-base.css`**:
- Secciones "RESET & BASE" y "TYPOGRAPHY"

**De `style.css` → `css/03-typography.css`**:
- Todos los h1-h6, p, body text styles
- Limpieza: remover duplicados con hero.css

**De `style.css` → `css/04-layout.css`**:
- .container, .section-padding, grid/flex utilities
- Breakpoint-specific rules

**De `style.css`, `header.css` → `css/components/09-navigation.css`**:
- Header, navbar, mega-menu
- Consolidar duplicados

**De `hero.css` → `css/sections/10-hero.css`**:
- Limpieza: remover conflictos con colors
- Crear variantes (--dark, --light, --gradient)
- Refactorizar grid setup

**De `service-styles.css` → `css/sections/11-13,15`**:
- Dividir por sección
- Service cards → components/06-cards.css + sections/11-services.css
- Result cards → sections/12-results.css
- Team → sections/13-team.css
- CTA → sections/15-cta.css

**De cualquier archivo → `css/animations/17-18`**:
- Todas las @keyframes
- Consolidar hero-animations.js animations

### Paso 3: BEM Naming Convention

Convertir toda esta estructura a **BEM (Block Element Modifier)**:

```css
/* MALO */
.hero-section h1 {
  color: white;
}

.hero-section h1.blue {
  color: blue;
}

/* BUENO (BEM) */
.hero { ... }
.hero__title { ... }
.hero__title--dark { ... }
.hero__subtitle { ... }
.hero__subtitle--small { ... }
```

**Estructura BEM por componente**:
```
.component { }
  .component__child { }
    .component__child--modifier { }
  .component__item { }

Ejemplo:
.service-card { }
  .service-card__icon { }
  .service-card__title { }
  .service-card__description { }
  .service-card__link { }
  .service-card--featured { } /* Modificador */
  .service-card--dark { } /* Variante de color */
```

### Paso 4: Consolidar animaciones

**Archivo**: `css/animations/17-keyframes.css`

Buscar todas las @keyframes en:
- style.css
- hero.css
- service-styles.css
- animations.js (convertir CSS)
- hero-animations.js (convertir CSS)

Ejemplo:
```css
/* ANTES: Esparcido en múltiples archivos */
/* hero.css */
@keyframes float-particle { ... }

/* service-styles.css */
@keyframes slideUp { ... }

/* DESPUÉS: Consolidado */
@keyframes fadeUp { ... }
@keyframes slideInLeft { ... }
@keyframes slideInRight { ... }
@keyframes pulse { ... }
@keyframes float { ... }
@keyframes glow { ... }
```

### Paso 5: Crear utilities

**Archivo**: `css/04-layout.css` + `css/18-animation-utilities.css`

```css
/* Responsive helpers */
.hide-mobile { display: none; }
.hide-desktop { display: block; }

@media (min-width: 768px) {
  .hide-mobile { display: block; }
  .hide-desktop { display: none; }
}

/* Grid utilities */
.grid { display: grid; }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }

/* Flex utilities */
.flex { display: flex; }
.flex-center { display: flex; align-items: center; justify-content: center; }
.flex-between { display: flex; justify-content: space-between; }

/* Animation utilities */
.animate-fade-up { animation: fadeUp 0.6s ease-out; }
.animate-slide-in { animation: slideInLeft 0.6s ease-out; }
.animate-delay-1 { animation-delay: 0.1s; }
.animate-delay-2 { animation-delay: 0.2s; }
```

### Paso 6: Index.css

```css
/* CSS ARCHITECTURE — CODEX AI CONSULTING */

/* 01. Variables & Design Tokens */
@import url('variables.css');

/* 02. Reset & Normalize */
@import url('reset-and-base.css');

/* 03. Typography */
@import url('typography.css');

/* 04. Layout & Utilities */
@import url('layout.css');

/* 05-09. Components */
@import url('components/buttons.css');
@import url('components/cards.css');
@import url('components/forms.css');
@import url('components/badges.css');
@import url('components/navigation.css');

/* 10-16. Sections */
@import url('sections/hero.css');
@import url('sections/services.css');
@import url('sections/results.css');
@import url('sections/team.css');
@import url('sections/blog.css');
@import url('sections/cta.css');
@import url('sections/footer.css');

/* 17-18. Animations */
@import url('animations/keyframes.css');
@import url('animations/utilities.css');
```

### Paso 7: Actualizar HTML links

**De**:
```html
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="hero.css">
<link rel="stylesheet" href="service-styles.css">
<link rel="stylesheet" href="header.css">
<link rel="stylesheet" href="top-strip.css">
<link rel="stylesheet" href="chat-widget.css">
```

**A**:
```html
<link rel="stylesheet" href="css/index.css">
```

### Paso 8: Testing

- [ ] Visual comparison: antes vs. después (deben verse iguales)
- [ ] No console errors
- [ ] Responsive en mobile/tablet/desktop
- [ ] Hover effects funcionales
- [ ] Animaciones activas
- [ ] Performance: sin bloatware CSS

### Paso 9: Eliminar archivos antiguos

```bash
# Después de refactorizar:
rm style.css hero.css service-styles.css header.css top-strip.css
# Mantener chat-widget.css si es separado
```

---

## 📐 BREAKPOINTS SYSTEM

```css
/* Mobile-first approach */
/* Base: 320px-640px (mobile) */

@media (min-width: 641px) {
  /* Tablet: 641px-1024px */
}

@media (min-width: 1025px) {
  /* Desktop: 1025px+ */
}

@media (min-width: 1440px) {
  /* Large desktop: 1440px+ */
}

/* Si necesitas narrow desktops: */
@media (max-width: 1024px) {
  /* Desktop pequeño */
}
```

**Variables en variables.css**:
```css
/* CSS variables cannot contain media queries */
/* Pero puedes nombrar breakpoints para JS */
:root {
  --bp-mobile: 320px;
  --bp-tablet: 641px;
  --bp-desktop: 1025px;
  --bp-large: 1440px;
}
```

---

## 🎨 COMPONENTES CLAVE A REFACTORIZAR

### 1. Hero Component
```css
/* ANTES: Esparcido entre hero.css y service-styles.css */
.hero-section { ... }
.hero-heading { ... }
.hero-title { ... }
.service-hero { ... }

/* DESPUÉS: Consolidado con variantes */
.hero { }
.hero__content { }
.hero__title { }
.hero__subtitle { }
.hero__cta-group { }
.hero__image { }
.hero--dark { } /* background: dark */
.hero--light { } /* background: light */
.hero--gradient { } /* background: gradient */
.hero--with-image { } /* layout: image + text */
```

### 2. Card Component
```css
.card { } /* Base: common padding, shadow, border-radius */
.card__header { } /* Top section (image, badge) */
.card__body { } /* Main content */
.card__footer { } /* CTA links */

/* Variantes */
.card--service { } /* Service cards */
.card--result { } /* Result/stat cards */
.card--blog { } /* Blog/article cards */
.card--team { } /* Team member cards */

/* Modifiers */
.card--featured { } /* Highlight special cards */
.card--dark { } /* Dark theme */
.card--shadow { } /* Extra shadow on hover */
```

### 3. Button Component
```css
.btn { } /* Base: padding, border-radius, transition */

/* Colors */
.btn--primary { } /* Main CTA: dark blue */
.btn--secondary { } /* Secondary: outline/light */
.btn--tertiary { } /* Tertiary: text-only */

/* Sizes */
.btn--sm { } /* Pequeño */
.btn--md { } /* Mediano (default) */
.btn--lg { } /* Grande */

/* States */
.btn:hover { }
.btn:active { }
.btn:disabled { }
.btn:focus-visible { } /* Accessibility */
```

---

## ✅ CHECKLIST PARA SONNET

- [ ] Crear estructura `/css/` como se especifica
- [ ] Migrar variables a `01-variables.css`
- [ ] Refactorizar cada sección
- [ ] Consolidar animaciones
- [ ] Implementar BEM naming
- [ ] Crear utilities grid/flex
- [ ] Actualizar HTML `<link>` tags
- [ ] Testing visual (debe verse igual)
- [ ] Performance audit (CSS size)
- [ ] Eliminar archivos antiguos
- [ ] Git commit con mensaje: "Refactor: Reorganizar CSS en arquitectura modular"
- [ ] NO romper funcionalidad

---

## 🚀 PRÓXIMAS MEJORAS (Phase 2+)

Después de refactorizar CSS:

1. **Componentes JavaScript reutilizables**
   - Modal component
   - Dropdown component
   - Carousel component

2. **Micro-interacciones avanzadas**
   - Hover lift effects
   - Button ripple on click
   - Text reveal animations
   - Counter animations

3. **Performance optimization**
   - Critical CSS inline
   - Defer non-critical CSS
   - Minify + gzip
   - CSS-in-JS for dynamic styles

4. **Dark mode support**
   - Crear variables para dark theme
   - Toggle button
   - Respeto a prefers-color-scheme

5. **Responsive image optimization**
   - Picture element
   - srcset + sizes
   - WebP fallbacks
   - Lazy loading

---

**Documento preparado para Sonnet Phase 2**  
**Estado**: ✅ LISTO PARA IMPLEMENTACIÓN  
**Fecha**: 2026-04-23
