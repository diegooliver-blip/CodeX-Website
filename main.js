document.addEventListener('DOMContentLoaded', () => {
    // Header shadow on scroll
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        } else {
            header.style.boxShadow = 'none';
            header.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        }
    });

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 72,
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

    // Contact Form Submission (Mailto Integration)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const priority = document.querySelector('input[name="priority"]:checked')?.value || "No especificada";

            const subject = encodeURIComponent(`Nuevo Contacto: ${name} - CODEX AI`);
            const body = encodeURIComponent(
                `Nombre: ${name}\n` +
                `Email: ${email}\n` +
                `Prioridad/Desafío: ${priority}\n\n` +
                `Hola CODEX, me gustaría obtener más información sobre ${priority}.`
            );

            const mailtoLink = `mailto:codexai.consulting@gmail.com?subject=${subject}&body=${body}`;

            // Open user's email client
            window.location.href = mailtoLink;
        });
    }
});

// Initialize Lucide icons
lucide.createIcons();
