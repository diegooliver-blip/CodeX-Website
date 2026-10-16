document.addEventListener('DOMContentLoaded', () => {
    // Top Strip scroll positioning
    const topStrip = document.querySelector('.top-strip');
    const header = document.getElementById('main-header');
    const body = document.body;

    // Header scroll effect - transition from transparent to solid
    let lastScroll = 0;
    const handleHeaderScroll = () => {
        const currentScroll = window.scrollY;

        if (header) {
            // Top strip height: 50px, header height: 90px
            if (currentScroll > 100) {
                header.classList.add('main-header--scrolled');
                body.classList.add('header-scrolled');
            } else {
                header.classList.remove('main-header--scrolled');
                body.classList.remove('header-scrolled');
            }
        }

        lastScroll = currentScroll;
    };

    window.addEventListener('scroll', () => {
        requestAnimationFrame(handleHeaderScroll);
    });

    // Initial check
    handleHeaderScroll();

    // Mobile Menu Toggle
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-desktop');

    // Create overlay if it doesn't exist
    let overlay = document.querySelector('.menu-overlay');
    if (!overlay && navLinks) {
        overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        navLinks.parentNode.insertBefore(overlay, navLinks);
    }

    const toggleMenu = (forceClose = false) => {
        if (forceClose || navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            body.classList.remove('menu-open');
            if (menuBtn) {
                const icon = menuBtn.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-lucide', 'menu');
                    lucide.createIcons();
                }
            }
        } else {
            navLinks.classList.add('active');
            body.classList.add('menu-open');
            if (menuBtn) {
                const icon = menuBtn.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-lucide', 'x');
                    lucide.createIcons();
                }
            }
        }
    };

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => toggleMenu());
        if (overlay) {
            overlay.addEventListener('click', () => toggleMenu(true));
        }

        // Close menu on link click (except dropdown buttons)
        navLinks.querySelectorAll('a:not(.dropbtn)').forEach(link => {
            link.addEventListener('click', () => toggleMenu(true));
        });
    }

    // Dropdown toggle for mobile
    const dropdowns = document.querySelectorAll('.dropdown-mega');
    dropdowns.forEach(dropdown => {
        const dropbtn = dropdown.querySelector('.dropbtn');
        if (dropbtn) {
            dropbtn.addEventListener('click', (e) => {
                if (window.innerWidth <= 992) {
                    e.preventDefault();
                    dropdown.classList.toggle('active-mobile');
                }
            });
        }
    });

    // Smooth scroll for nav links with header offset
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = topStrip ? 140 : 90; // top strip + header height
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Counter Animation Logic
    const animateCounters = (el) => {
        if (el.dataset.animated) return;
        el.dataset.animated = "true";

        const target = parseInt(el.dataset.countTarget);
        let count = 0;
        const speed = target / 50; // Adjust for duration

        const updateCount = () => {
            count += speed;
            if (count < target) {
                el.innerText = `+${Math.ceil(count)}%`;
                requestAnimationFrame(updateCount);
            } else {
                el.innerText = `+${target}%`;
            }
        };
        updateCount();
    };

    // Intersection Observer for animations & counters
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // If it's a counter, trigger it
                const counter = entry.target.querySelector('[data-count-target]');
                if (counter) animateCounters(counter);

                // If target itself is a counter
                if (entry.target.hasAttribute('data-count-target')) {
                    animateCounters(entry.target);
                }

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });

    // Also observe section titles with reveal classes
    document.querySelectorAll('.reveal-up, .reveal-down, .reveal-left, .reveal-right').forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });

    // Contact Form Submission - AJAX instead of mailto
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const priority = document.querySelector('input[name="priority"]:checked')?.value || "No especificada";
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            // Basic validation
            if (!name || !email) {
                alert('Por favor completa los campos requeridos');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Por favor ingresa un email válido');
                return;
            }

            // Show loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span>Enviando...</span>
                <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-dasharray="4"></circle>
                </svg>
            `;

            try {
                // TODO: Replace with actual endpoint (Netlify Forms, Formspree, or custom backend)
                // For now, open email client as fallback
                const subject = encodeURIComponent(`Nuevo Contacto: ${name} - CODEX AI`);
                const body = encodeURIComponent(
                    `Nombre: ${name}\n` +
                    `Email: ${email}\n` +
                    `Prioridad/Desafío: ${priority}\n\n` +
                    `Hola CODEX, me gustaría obtener más información sobre ${priority}.`
                );
                const mailtoLink = `mailto:codexai.consulting@gmail.com?subject=${subject}&body=${body}`;

                // Simulate successful submission for demo
                await new Promise(resolve => setTimeout(resolve, 1000));
                window.location.href = mailtoLink;

                // Show success message
                alert('¡Gracias por contactarnos! Te responderemos pronto.');
                contactForm.reset();
            } catch (error) {
                console.error('Form error:', error);
                alert('Error al enviar. Por favor intenta de nuevo.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
});

// Initialize Lucide icons
lucide.createIcons();
