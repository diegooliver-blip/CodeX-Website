# CODEX AI Consulting — Directrices de Trabajo

## 📋 SKILLS ACTIVOS

### 🎨 Frontend Design
- **Framework**: GSAP + ScrollTrigger para animaciones scroll-triggered
- **CSS**: Custom properties (variables), Tailwind patterns, BEM naming
- **Animaciones**: IntersectionObserver fade+slide para secciones, stagger para grids
- **Paleta Actual**: 
  - Background: #0A0A0A (dark)
  - Accent: #C9A55A (gold)
  - Text: #FFFFFF (light)
- **Motion Design**: 
  - Scroll reveals: `opacity 0→1, translateY 40px→0`
  - Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)`
  - Duraciones: 0.6s cards, 0.8s sections, 1.2s hero

### 🔐 Auth Portal (En Desarrollo)
- JWT con localStorage
- Refresh tokens de 24h
- Rutas protegidas bajo `/portal/*`
- Sessions encriptadas

### 📊 Project Tracker (Pendiente)
- Estados: Planificación → Diseño → Desarrollo → Pruebas → Entrega
- Milestones vinculados a fases del roadmap

---

## 🎯 REGLAS DE TRABAJO

### Acceso a Archivos
- **Nunca** leer archivos completos si solo necesitas una función/sección específica
- Usar `offset` + `limit` para archivos grandes (style.css, index.html)
- Usar `Grep` para búsquedas de código, no Read
- Prefiere `Glob` para encontrar patrones de archivos

### Cambios de Código
- **Confirmar plan** antes de escribir código (usar EnterPlanMode para cambios > 2 archivos)
- **Máximo 3 archivos** por sesión de cambios
- **Minimal edits**: No refactorizar, no agregar features no solicitadas
- **Testing**: Si hay dev server, probar en browser antes de considerar "done"

### Commits & PRs
- Crear commit por tarea completada (no batching)
- Mensaje: imperative tone ("Add", "Fix", "Enhance")
- Incluir `Co-Authored-By: Claude Haiku 4.5` al final
- No force-push sin confirmación explícita

### Performance
- Core Web Vitals objetivo: LCP < 2.5s, FID < 100ms, CLS < 0.1
- GPU acceleration: usar `transform` y `opacity`, no posición/tamaño
- Lazy loading: `loading="lazy"` en imágenes, preload críticas
- Minificar assets antes de producción

---

## 🚀 WORKFLOW ROADMAP

### Fase 1: Micro-Interacciones (↔ actual)
✅ Scroll-Triggered Card Fade-In
⏳ Button Glow + Hover Effects
⏳ Hero Title Text Reveal
⏳ Metrics Counter Animation
⏳ Mega Menu Visual Hierarchy

### Fase 2-8: Ver REDESIGN_ROADMAP.md

---

## 📂 ESTRUCTURA CRÍTICA

```
/WEBSITE CODEX
├── index.html (842 líneas, español)
├── animations.js (GSAP + ScrollTrigger)
├── style.css (CSS variables, @keyframes)
├── header.css (Fixed header + mega-menu)
├── main.js (Interacciones globales)
├── REDESIGN_ROADMAP.md (9 fases estratégicas)
└── CLAUDE.md (este archivo)
```

**Archivos NO tocar sin supervisión:**
- `index.html` excepto secciones marcadas (no HTML refactoring)
- Configuración de carrusel Swiper (ya está optimizado)

---

## ✅ CHECKLIST ANTES DE COMPLETAR TAREA

- [ ] Código escrito sigue patrones existentes (naming, estructura)
- [ ] Probado en browser (si hay cambios visuales/interacción)
- [ ] No hay console errors ni warnings
- [ ] Respeta `prefers-reduced-motion` (accesibilidad)
- [ ] Performance: no más de 2 ScriptTriggers nuevos
- [ ] Commit creado con mensaje descriptivo

---

## 🔧 HERRAMIENTAS HABITUALES

```bash
# Verificar cambios
git status

# Crear commit
git commit -m "Task: Descripción clara"

# Dev server (si aplica)
npm run dev / python -m http.server

# Testing accesibilidad
axe DevTools, WAVE
```

---

**Última actualización**: 2026-04-21  
**Versión**: 1.0  
**Owner**: Diego Oliver Martínez
