(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = !isDesktop;

  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // ─── LENIS SMOOTH SCROLL ───────────────────────────────────────────────────
  let lenis;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.4,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2
    });

    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    setTimeout(function () {
      document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
          var href = this.getAttribute('href');
          if (!href || href === '#') return;
          e.preventDefault();
          e.stopImmediatePropagation();
          lenis.scrollTo(href, { offset: -72, duration: 1.4 });
        });
      });
    }, 0);
  }

  // ─── LOADER COUNTER ANIMATION ───────────────────────────────────────────────
  function initLoader() {
    var loader = document.getElementById('page-loader');
    var counter = document.getElementById('loader-num');
    if (!loader || !counter) return;

    var progress = { val: 0 };
    window.addEventListener('load', function () {
      gsap.to(progress, {
        val: 100,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: function () {
          counter.textContent = Math.round(progress.val);
        },
        onComplete: function () {
          setTimeout(function () {
            loader.classList.add('loaded');
          }, 300);
        }
      });
    });
  }

  // ─── MAGNETIC BUTTONS ────────────────────────────────────────────────────────
  function initMagneticButtons() {
    if (!isDesktop) return;

    document.querySelectorAll('.magnetic-btn').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        var deltaX = (e.clientX - centerX) * 0.3;
        var deltaY = (e.clientY - centerY) * 0.3;
        gsap.to(btn, { x: deltaX, y: deltaY, duration: 0.3, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.35)' });
      });
    });
  }

  // ─── HERO TITLE ANIMATION ─────────────────────────────────────────────────────
  function initHeroAnimations() {
    if (prefersReducedMotion) return;

    var heroTitle = document.querySelector('.hero-title');
    if (heroTitle && typeof Splitting !== 'undefined') {
      Splitting({ target: heroTitle, by: 'words' });
      var words = heroTitle.querySelectorAll('.word');
      gsap.fromTo(words,
        { opacity: 0, y: 60, skewY: 3 },
        { opacity: 1, y: 0, skewY: 0, duration: 0.9, stagger: 0.08, ease: 'power2.out', delay: 0.2 }
      );
    }

    var heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
      gsap.fromTo(heroSubtitle, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.8, ease: 'power2.out' });
    }

    var heroActions = document.querySelector('.hero-actions');
    if (heroActions) {
      gsap.fromTo(heroActions, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6, delay: 1.2, ease: 'power2.out' });
    }

    var heroStats = document.querySelector('.hero-stats-mini');
    if (heroStats) {
      gsap.fromTo(heroStats, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 1.4, ease: 'power2.out' });
    }
  }

  // ─── SCROLL ANIMATIONS ───────────────────────────────────────────────────────
  function initScrollAnimations() {
    if (prefersReducedMotion) return;

    // Header scroll state
    ScrollTrigger.create({
      start: 'top -80',
      onUpdate: function (self) {
        var header = document.getElementById('main-header');
        if (header) {
          header.classList.toggle('scrolled', self.scroll() > 80);
        }
      }
    });

    // Metrics strip counter animation
    ScrollTrigger.create({
      trigger: '#metrics-strip',
      start: 'top 80%',
      once: true,
      onEnter: function () {
        document.querySelectorAll('.metric-value[data-target]').forEach(function (el) {
          var target = parseInt(el.getAttribute('data-target'), 10);
          var prefix = el.getAttribute('data-prefix') || '';
          var suffix = el.getAttribute('data-suffix') || '';
          var obj = { val: 0 };

          gsap.to(obj, {
            val: target,
            duration: 2,
            ease: 'power2.out',
            onUpdate: function () {
              el.textContent = prefix + Math.round(obj.val) + suffix;
            }
          });
        });

        // Animate metric cards themselves
        gsap.fromTo('.metric-card',
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.3 }
        );
      }
    });

    // Section titles reveal
    document.querySelectorAll('.section-title[data-splitting]').forEach(function (title) {
      if (typeof Splitting !== 'undefined') {
        Splitting({ target: title, by: 'words' });
        var words = title.querySelectorAll('.word');
        gsap.fromTo(words,
          { yPercent: 110 },
          { yPercent: 0, duration: 0.8, stagger: 0.06, ease: 'power2.out',
            scrollTrigger: { trigger: title, start: 'top 85%' }
          }
        );
      }
    });

    // Service cards reveal
    document.querySelectorAll('.service-card').forEach(function (card, i) {
      gsap.fromTo(card,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.6, delay: i * 0.1, ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 85%' }
        }
      );
    });

    // Method items reveal
    document.querySelectorAll('.method-item').forEach(function (item, i) {
      gsap.fromTo(item,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.6, delay: i * 0.08, ease: 'power2.out',
          scrollTrigger: { trigger: item, start: 'top 85%' }
        }
      );
    });

    // Contact section reveal
    var contactBrand = document.querySelector('.contact-branding');
    var contactForm = document.querySelector('.contact-form-wrapper');
    if (contactBrand) {
      gsap.fromTo(contactBrand, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: contactBrand, start: 'top 80%' } });
    }
    if (contactForm) {
      gsap.fromTo(contactForm, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: contactForm, start: 'top 80%' } });
    }

    // Footer columns
    var footerCols = document.querySelectorAll('.footer-col');
    if (footerCols.length) {
      gsap.fromTo(footerCols,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.footer-grid', start: 'top 90%' } }
      );
    }
  }

  // ─── CARD TILT ────────────────────────────────────────────────────────────────
  function initCardTilt() {
    if (!isDesktop || prefersReducedMotion) return;

    document.querySelectorAll('.service-card, .method-item, .glass-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: x * 6,
          rotateX: -y * 6,
          transformPerspective: 800,
          duration: 0.4,
          ease: 'power2.out'
        });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power2.out' });
      });
    });
  }

  // ─── MEGA MENU IMAGE SWITCH ───────────────────────────────────────────────────
  function initMegaMenu() {
    if (!isDesktop) return;

    var megaItems = document.querySelectorAll('.mega-item');
    var previewImg = document.querySelector('.mega-preview-img');

    if (megaItems.length && previewImg) {
      megaItems.forEach(function (item) {
        item.addEventListener('mouseenter', function () {
          var newSrc = item.getAttribute('data-image');
          if (newSrc && previewImg.getAttribute('src') !== newSrc) {
            gsap.to(previewImg, {
              opacity: 0,
              scale: 0.95,
              duration: 0.25,
              ease: 'power2.in',
              onComplete: function () {
                previewImg.setAttribute('src', newSrc);
                gsap.to(previewImg, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
              }
            });
          }
        });
      });
    }
  }

  // ─── SCROLL PROGRESS BAR ──────────────────────────────────────────────────────
  function initScrollProgress() {
    var bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);

    if (lenis) {
      lenis.on('scroll', function (e) {
        gsap.to(bar, { width: (e.progress * 100) + '%', duration: 0.1, ease: 'none' });
      });
    } else {
      window.addEventListener('scroll', function () {
        var scrolled = window.scrollY;
        var total = document.documentElement.scrollHeight - window.innerHeight;
        gsap.to(bar, { width: ((scrolled / total) * 100) + '%', duration: 0.1, ease: 'none' });
      });
    }
  }

  // ─── THREE.JS HERO (Subtle particles) ─────────────────────────────────────────
  function initThreeHero() {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined' || isMobile) return;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Particles: subtle white/gold dust
    var count = 400;
    var positions = new Float32Array(count * 3);
    for (var i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 12;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var material = new THREE.PointsMaterial({
      size: 0.02,
      color: 0xC9A55A,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true
    });
    var particles = new THREE.Points(geometry, material);
    scene.add(particles);
    camera.position.z = 5;

    var mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', function (e) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.3;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.2;
    });

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      var t = clock.getElapsedTime();
      particles.rotation.y = t * 0.03 + mouseX * 0.2;
      particles.rotation.x = t * 0.01 + mouseY * 0.15;
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  // ─── SWIPER CAROUSELS ─────────────────────────────────────────────────────────
  function initSwiperCarousels() {
    if (typeof Swiper === 'undefined') return;

    // Services Carousel
    var servicesCarousel = document.getElementById('servicesCarousel');
    if (servicesCarousel) {
      new Swiper(servicesCarousel, {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        autoplay: {
          delay: 5000,
          disableOnInteraction: false,
        },
        pagination: {
          el: servicesCarousel.querySelector('.swiper-pagination'),
          clickable: true,
        },
        navigation: {
          nextEl: servicesCarousel.querySelector('.swiper-button-next'),
          prevEl: servicesCarousel.querySelector('.swiper-button-prev'),
        },
        breakpoints: {
          640: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
          1280: { slidesPerView: 3 },
        },
      });
    }

    // Testimonials Carousel
    var testimonialsCarousel = document.getElementById('testimonialsCarousel');
    if (testimonialsCarousel) {
      new Swiper(testimonialsCarousel, {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        autoplay: {
          delay: 6000,
          disableOnInteraction: false,
        },
        pagination: {
          el: testimonialsCarousel.querySelector('.swiper-pagination'),
          clickable: true,
        },
        navigation: {
          nextEl: testimonialsCarousel.querySelector('.swiper-button-next'),
          prevEl: testimonialsCarousel.querySelector('.swiper-button-prev'),
        },
        effect: 'fade',
        fadeEffect: { crossFade: true }
      });
    }
  }

  // ─── GENERIC SCROLL ANIMATIONS ───────────────────────────────────────────────
  function initGenericScrollAnimations() {
    if (prefersReducedMotion) return;

    // Section titles reveal
    document.querySelectorAll('.section-title[data-splitting]').forEach(function (title) {
      if (typeof Splitting !== 'undefined') {
        Splitting({ target: title, by: 'words' });
        var words = title.querySelectorAll('.word');
        gsap.fromTo(words,
          { yPercent: 110 },
          { yPercent: 0, duration: 0.8, stagger: 0.06, ease: 'power2.out',
            scrollTrigger: { trigger: title, start: 'top 85%' }
          }
        );
      }
    });

    // Generic cards animation (staggered)
    var cardSelectors = [
      '.service-card',
      '.exp-case-card',
      '.exp-domain-card',
      '.result-card',
      '.project-card',
      '.testimonial-card'
    ];

    cardSelectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (card, i) {
        gsap.fromTo(card,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.6, delay: i * 0.08, ease: 'power2.out',
            scrollTrigger: { trigger: card, start: 'top 85%' }
          }
        );
      });
    });

    // Results numbers counter
    ScrollTrigger.create({
      trigger: '.results-highlights',
      start: 'top 70%',
      once: true,
      onEnter: function () {
        document.querySelectorAll('.result-number[data-target]').forEach(function (el) {
          var target = parseInt(el.getAttribute('data-target'), 10);
          var prefix = el.getAttribute('data-prefix') || '';
          var suffix = el.getAttribute('data-suffix') || '';
          var obj = { val: 0 };

          gsap.to(obj, {
            val: target,
            duration: 2,
            ease: 'power2.out',
            onUpdate: function () {
              el.textContent = prefix + Math.round(obj.val) + suffix;
            }
          });
        });
      }
    });
  }


// ─── PARALLAX STARS ─────────────────────────────────────────────────────────  function initParallaxStars() {    if (prefersReducedMotion) return;    const starsContainers = document.querySelectorAll(".cosmic-background-stars");    starsContainers.forEach(container => {      gsap.to(container, {        yPercent: -50,        ease: "none",        scrollTrigger: {          trigger: container.parentElement,          start: "top bottom",          end: "bottom top",          scrub: true        }      });    });  }
  // ─── INIT ─────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initLoader();
    initMagneticButtons();
    initHeroAnimations();
    initScrollAnimations();
    initCardTilt();
    initScrollProgress();
    initMegaMenu();
    initThreeHero();
    initParallaxStars();
    initGenericScrollAnimations();
    initSwiperCarousels();

    if (!document.getElementById('page-loader')) {
      initHeroAnimations();
    }
  });

})();
