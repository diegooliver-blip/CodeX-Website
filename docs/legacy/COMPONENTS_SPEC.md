# COMPONENTS SPECIFICATION — Para implementar en Phase 2 (Sonnet)

**Estado**: 🎯 Especificaciones detalladas  
**Para**: Sonnet - Crear componentes reutilizables  
**Objetivo**: Documentar estructura, variantes y casos de uso

---

## 1. HERO COMPONENT

### Descripción
Sección principal de página con contenido principal (titulo, subtítulo, CTA, imagen/video)

### Estructura HTML
```html
<section class="hero" data-hero-variant="dark">
  <div class="hero__background"></div> <!-- Para parallax, imágenes -->
  
  <div class="hero__content">
    <div class="hero__text">
      <!-- Opcional: Badge -->
      <span class="badge badge--primary">
        <i data-lucide="sparkles"></i>
        New Feature
      </span>
      
      <!-- Titulo -->
      <h1 class="hero__title">
        Transformamos negocios<br>con IA y automatización
      </h1>
      
      <!-- Subtítulo -->
      <p class="hero__subtitle">
        Sistemas inteligentes que generan +340% más eficiencia
      </p>
      
      <!-- CTA Group -->
      <div class="hero__cta-group">
        <button class="btn btn--primary btn--lg">
          Explorar Servicios
          <i data-lucide="arrow-right"></i>
        </button>
        <button class="btn btn--secondary btn--lg">
          Ver Casos de Éxito
        </button>
      </div>
      
      <!-- Opcional: Trust badges -->
      <div class="hero__trust">
        <span class="trust-badge">
          <i data-lucide="star"></i>
          5.0 Rating
        </span>
        <span class="trust-badge">
          50+ Clientes Activos
        </span>
      </div>
    </div>
    
    <!-- Imagen/Ilustración -->
    <div class="hero__image">
      <img 
        src="hero-image.png" 
        alt="Soluciones de IA para empresas"
        loading="lazy"
        class="hero__image-img"
      />
    </div>
  </div>
</section>
```

### Variantes CSS
```css
.hero { } /* Base */
.hero--dark { background: var(--bg-dark); color: white; }
.hero--light { background: var(--bg); color: var(--text-main); }
.hero--gradient { background: var(--navy-gradient); color: white; }
.hero--full-width { width: 100vw; margin-left: calc(-50vw + 50%); }
```

### Comportamientos
- **Desktop**: Grid 2 columnas (60/40), texto + imagen lado a lado
- **Tablet**: Grid 1 columna, imagen arriba
- **Mobile**: Stack vertical, imagen full-width

### Animaciones propuestas
- Fade-in on page load
- Parallax text on scroll
- Image zoom on hover
- Button ripple on click

### Ejemplo de uso
```html
<!-- Home page -->
<section class="hero hero--dark">
  <div class="hero__content">
    <h1 class="hero__title">ALTO RENDIMIENTO EN IA</h1>
    <p class="hero__subtitle">Potenciamos negocios con sistemas inteligentes...</p>
  </div>
</section>

<!-- Service page -->
<section class="hero hero--light hero--with-image">
  <!-- contenido -->
</section>
```

---

## 2. CARD COMPONENT

### Descripción
Elemento rectangular reutilizable para mostrar información: servicios, resultados, blog, equipo

### Estructura HTML Base
```html
<div class="card card--service">
  <!-- Header (imagen, icono, badge) -->
  <div class="card__header">
    <!-- Opción A: Icono -->
    <div class="card__icon">
      <i data-lucide="zap"></i>
    </div>
    
    <!-- Opción B: Imagen -->
    <img src="..." alt="..." class="card__image" loading="lazy" />
    
    <!-- Badge opcional -->
    <span class="badge badge--success">Nuevo</span>
  </div>
  
  <!-- Body (contenido principal) -->
  <div class="card__body">
    <h3 class="card__title">Automatización de Procesos</h3>
    <p class="card__description">RPA, flujos inteligentes y n8n...</p>
  </div>
  
  <!-- Footer (CTA) -->
  <div class="card__footer">
    <a href="#" class="card__link">
      Saber más
      <i data-lucide="arrow-right"></i>
    </a>
  </div>
</div>
```

### Variantes

#### 2.1 Service Card
```html
<div class="card card--service">
  <div class="card__header">
    <div class="card__icon"><i data-lucide="cog"></i></div>
  </div>
  <div class="card__body">
    <h3 class="card__title">Automatización</h3>
    <p class="card__description">Descripción...</p>
  </div>
  <div class="card__footer">
    <a href="servicios/automatizacion.html" class="card__link">Saber más →</a>
  </div>
</div>
```

**CSS**:
```css
.card--service {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  transition: var(--transition-smooth);
}

.card--service:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-medium);
  border-color: var(--blue-light);
}

.card--service .card__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--bg-cream);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: var(--blue);
}
```

#### 2.2 Result/Stat Card
```html
<div class="card card--result">
  <div class="card__header">
    <div class="card__icon"><i data-lucide="trending-up"></i></div>
  </div>
  <div class="card__body">
    <div class="card__stat">
      <span class="card__number" data-target="340">0</span>%
    </div>
    <p class="card__label">Eficiencia Operativa</p>
    
    <!-- Barras antes/después -->
    <div class="card__visualization">
      <div class="stat-bar">
        <span class="stat-bar__label">Antes</span>
        <div class="stat-bar__track">
          <div class="stat-bar__fill" style="width: 22%"></div>
        </div>
      </div>
      <div class="stat-bar">
        <span class="stat-bar__label">Después</span>
        <div class="stat-bar__track">
          <div class="stat-bar__fill" style="width: 90%"></div>
        </div>
      </div>
    </div>
    
    <p class="card__context">
      <i data-lucide="factory"></i> Manufactura & Logística · 2022–2025
    </p>
  </div>
</div>
```

**CSS**:
```css
.card--result {
  background: white;
  border: 1px solid #E2EAF4;
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-soft);
}

.card__number {
  font-size: 2.5rem;
  font-weight: 900;
  color: var(--blue);
  font-family: var(--font-display);
}

.card__label {
  font-weight: 600;
  color: var(--text-main);
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
}
```

#### 2.3 Blog Card
```html
<div class="card card--blog">
  <div class="card__header">
    <img src="blog-image.jpg" alt="..." class="card__image" loading="lazy" />
    <span class="card__category">IA & Automación</span>
  </div>
  <div class="card__body">
    <h3 class="card__title">Cómo la IA mejora tu ROI en ventas</h3>
    <p class="card__excerpt">
      Descubre cómo implementar chatbots inteligentes para aumentar tus conversiones...
    </p>
    <div class="card__meta">
      <span class="card__date">23 Apr 2026</span>
      <span class="card__author">Diego Oliver</span>
    </div>
  </div>
  <div class="card__footer">
    <a href="#" class="card__link">Leer artículo completo →</a>
  </div>
</div>
```

**CSS**:
```css
.card--blog {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
  transition: var(--transition-smooth);
}

.card--blog:hover {
  box-shadow: var(--shadow-medium);
}

.card--blog:hover .card__image {
  transform: scale(1.05);
}

.card__image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: var(--transition-smooth);
}

.card__category {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(0,0,0,0.7);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}
```

#### 2.4 Team Card
```html
<div class="card card--team">
  <div class="card__header">
    <div class="card__avatar">DM</div> <!-- Initials -->
  </div>
  <div class="card__body">
    <h3 class="card__name">Diego Oliver Martínez</h3>
    <p class="card__role">Founder & CTO</p>
    <p class="card__bio">
      Experto en IA, automatización y transformación digital con +10 años de experiencia.
    </p>
  </div>
  <div class="card__footer">
    <div class="card__socials">
      <a href="#" class="social-link"><i data-lucide="linkedin"></i></a>
      <a href="#" class="social-link"><i data-lucide="twitter"></i></a>
    </div>
  </div>
</div>
```

**CSS**:
```css
.card--team {
  text-align: center;
  background: white;
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-soft);
}

.card__avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--blue), var(--blue-light));
  color: white;
  font-size: 1.75rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.card__name {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.card__role {
  color: var(--blue);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}
```

### Grid de Cards
```html
<div class="cards-grid cards-grid--3-cols">
  <div class="card card--service">...</div>
  <div class="card card--service">...</div>
  <div class="card card--service">...</div>
  <!-- Automáticamente responsivo -->
</div>
```

**CSS**:
```css
.cards-grid {
  display: grid;
  gap: 2rem;
}

.cards-grid--2-cols {
  grid-template-columns: repeat(2, 1fr);
}

.cards-grid--3-cols {
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 1024px) {
  .cards-grid--3-cols {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .cards-grid--2-cols,
  .cards-grid--3-cols {
    grid-template-columns: 1fr;
  }
}
```

---

## 3. BUTTON COMPONENT

### Estructura HTML
```html
<button class="btn btn--primary btn--lg">
  <span class="btn__text">Call To Action</span>
  <i class="btn__icon" data-lucide="arrow-right"></i>
</button>
```

### Variantes

```css
/* Color variants */
.btn--primary { background: var(--blue); color: white; }
.btn--secondary { background: transparent; border: 2px solid var(--blue); color: var(--blue); }
.btn--tertiary { background: transparent; color: var(--text-main); }
.btn--success { background: var(--status-success); color: white; }

/* Size variants */
.btn--sm { padding: 0.5rem 1rem; font-size: 0.85rem; }
.btn--md { padding: 0.75rem 1.5rem; font-size: 0.95rem; }
.btn--lg { padding: 1rem 2rem; font-size: 1rem; }

/* Full width */
.btn--full { width: 100%; }

/* Icon only */
.btn--icon-only { width: 2.5rem; height: 2.5rem; padding: 0; }
```

### Estados
```css
.btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.btn:active {
  transform: translateY(0);
  box-shadow: var(--shadow-soft);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}
```

### Ejemplo completo
```html
<div class="button-group">
  <!-- Primary -->
  <button class="btn btn--primary btn--lg">Explorar Servicios</button>
  
  <!-- Secondary -->
  <button class="btn btn--secondary btn--lg">Aprender Más</button>
  
  <!-- Tertiary -->
  <button class="btn btn--tertiary">Leer artículo</button>
  
  <!-- Con icono -->
  <button class="btn btn--primary">
    Descargar <i data-lucide="download"></i>
  </button>
  
  <!-- Disabled -->
  <button class="btn btn--primary" disabled>No disponible</button>
</div>
```

---

## 4. BADGE COMPONENT

### Descripción
Pequeño indicador visual para categorías, estados, etiquetas

### Estructura
```html
<span class="badge badge--primary">
  <i data-lucide="sparkles"></i>
  New Feature
</span>
```

### Variantes
```css
.badge--primary { background: var(--blue-light); color: white; }
.badge--success { background: var(--status-success); color: white; }
.badge--warning { background: var(--status-warning); color: white; }
.badge--error { background: var(--status-error); color: white; }
.badge--outline { background: transparent; border: 1px solid var(--border-strong); }
```

### Tamaños
```css
.badge--sm { padding: 0.25rem 0.75rem; font-size: 0.7rem; }
.badge--md { padding: 0.5rem 1rem; font-size: 0.8rem; }
.badge--lg { padding: 0.75rem 1.25rem; font-size: 0.9rem; }
```

---

## 5. FORM COMPONENT

### Estructura HTML
```html
<form class="form" id="contact-form">
  <div class="form__group">
    <label for="name" class="form__label">Nombre Completo*</label>
    <input 
      type="text" 
      id="name" 
      name="name"
      class="form__input"
      placeholder="Diego Oliver"
      required
    />
    <span class="form__error" data-field="name">Campo requerido</span>
  </div>
  
  <div class="form__group">
    <label for="email" class="form__label">Email*</label>
    <input 
      type="email" 
      id="email" 
      name="email"
      class="form__input"
      placeholder="diego@codex.com"
      required
    />
    <span class="form__error" data-field="email">Email inválido</span>
  </div>
  
  <div class="form__group">
    <label for="priority" class="form__label">Desafío Principal*</label>
    <select id="priority" name="priority" class="form__input">
      <option value="">Selecciona una opción...</option>
      <option value="ventas">Aumentar Ventas</option>
      <option value="costos">Reducir Costos</option>
      <option value="automatizacion">Automatización</option>
    </select>
  </div>
  
  <div class="form__group">
    <label for="message" class="form__label">Mensaje</label>
    <textarea 
      id="message" 
      name="message"
      class="form__input form__textarea"
      placeholder="Cuéntanos más..."
      rows="4"
    ></textarea>
  </div>
  
  <button type="submit" class="btn btn--primary btn--lg form__submit">
    Enviar Solicitud
  </button>
</form>
```

### CSS
```css
.form { }
.form__group { margin-bottom: 1.5rem; }
.form__label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
}

.form__input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 1rem;
  transition: var(--transition-smooth);
}

.form__input:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form__textarea {
  resize: vertical;
  min-height: 120px;
}

.form__error {
  display: none;
  color: var(--status-error);
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.form__input.error ~ .form__error {
  display: block;
}
```

---

## 6. NAVIGATION COMPONENT

### Estructura HTML
```html
<header class="header">
  <div class="header__content">
    <!-- Logo -->
    <div class="header__logo">
      <a href="/" class="logo">
        <span class="logo__text">CODEX</span>
        <span class="logo__sub">AI CONSULTING</span>
      </a>
    </div>
    
    <!-- Navigation desktop -->
    <nav class="header__nav nav-desktop">
      <ul class="nav__list">
        <li class="nav__item">
          <a href="/" class="nav__link">Home</a>
        </li>
        
        <!-- Dropdown mega-menu -->
        <li class="nav__item dropdown-mega">
          <button class="nav__link nav__link--dropdown" data-mega-trigger>
            Servicios
            <i data-lucide="chevron-down"></i>
          </button>
          
          <div class="dropdown-mega-panel">
            <div class="mega-list">
              <a href="servicios/automatizacion.html" class="mega-item">
                <div class="mega-item__icon"><i data-lucide="cog"></i></div>
                <div class="mega-item__content">
                  <span class="mega-item__title">Automatización</span>
                  <span class="mega-item__desc">Flujos autónomos con n8n</span>
                </div>
                <span class="mega-item__arrow">→</span>
              </a>
              <!-- Más items -->
            </div>
          </div>
        </li>
        
        <li class="nav__item">
          <a href="/#casos" class="nav__link">Casos de Éxito</a>
        </li>
        
        <li class="nav__item">
          <a href="/blog" class="nav__link">Blog</a>
        </li>
        
        <li class="nav__item">
          <a href="/#contacto" class="nav__link">Contacto</a>
        </li>
      </ul>
    </nav>
    
    <!-- CTA Button -->
    <div class="header__actions">
      <button class="btn btn--primary btn--sm">
        Agendar Consulta
      </button>
    </div>
    
    <!-- Mobile menu toggle -->
    <button class="header__mobile-toggle">
      <i data-lucide="menu"></i>
    </button>
  </div>
</header>
```

### CSS Base
```css
.header {
  position: sticky;
  top: 0;
  background: white;
  border-bottom: 1px solid var(--border);
  z-index: var(--z-sticky);
  transition: var(--transition-smooth);
}

.header__content {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 1.5rem;
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header__nav {
  display: flex;
  gap: 2rem;
}

.nav__list {
  display: flex;
  gap: 0.5rem;
}

.nav__link {
  padding: 0.5rem 1rem;
  color: var(--text-main);
  font-weight: 500;
  transition: var(--transition-smooth);
  border-bottom: 2px solid transparent;
}

.nav__link:hover {
  color: var(--blue);
  border-bottom-color: var(--blue);
}

/* Mega menu */
.dropdown-mega-panel {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid var(--border);
  border-top: none;
  padding: 2rem;
  min-width: 600px;
  box-shadow: var(--shadow-medium);
}

.dropdown-mega.active .dropdown-mega-panel {
  display: block;
}
```

---

## 7. MODAL/DIALOG COMPONENT

### Estructura HTML
```html
<div class="modal" id="contact-modal" data-modal="contact">
  <div class="modal__backdrop"></div>
  
  <div class="modal__dialog">
    <div class="modal__header">
      <h2 class="modal__title">Agendar Consulta Gratuita</h2>
      <button class="modal__close" aria-label="Cerrar">
        <i data-lucide="x"></i>
      </button>
    </div>
    
    <div class="modal__body">
      <!-- Form aquí -->
    </div>
    
    <div class="modal__footer">
      <button class="btn btn--secondary">Cancelar</button>
      <button class="btn btn--primary">Confirmar</button>
    </div>
  </div>
</div>
```

### CSS
```css
.modal {
  display: none;
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  animation: fadeIn 0.3s ease;
}

.modal.active {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal__dialog {
  position: relative;
  background: white;
  border-radius: var(--radius-lg);
  max-width: 600px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Especificaciones aprobadas
- [ ] HTML markup validado
- [ ] CSS para cada variante
- [ ] States (hover, active, disabled, focus)
- [ ] Responsive behavior
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Animation hooks
- [ ] Documentation con ejemplos
- [ ] Tests visuales en múltiples navegadores

---

**Documento para Phase 2 (Sonnet)**  
**Estado**: ✅ LISTO PARA IMPLEMENTACIÓN  
**Fecha**: 2026-04-23
