/**
 * Hero Animations - Three.js Particle System
 * Partículas doradas/azules flotando con interacción de mouse
 */

class HeroParticles {
    constructor(container) {
        this.container = container;
        this.canvas = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.particleCount = 800;
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };
        this.clock = new THREE.Clock();
        this.isRunning = true;

        this.colors = {
            gold: new THREE.Color(0xC9A55A),
            blue: new THREE.Color(0x1D4ED8),
            white: new THREE.Color(0xFFFFFF)
        };

        this.init();
    }

    init() {
        if (typeof THREE === 'undefined') {
            console.warn('Three.js not loaded, skipping hero animation');
            return;
        }

        this.createCanvas();
        this.createScene();
        this.createParticles();
        this.addEventListeners();
        this.animate();
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'hero__canvas';
        this.container.appendChild(this.canvas);
    }

    createScene() {
        this.scene = new THREE.Scene();

        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.z = 50;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);

        const colorOptions = [this.colors.gold, this.colors.blue, this.colors.white];

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;

            // Posición aleatoria en un cubo de 100x100x100
            positions[i3] = (Math.random() - 0.5) * 100;
            positions[i3 + 1] = (Math.random() - 0.5) * 100;
            positions[i3 + 2] = (Math.random() - 0.5) * 100;

            // Color aleatorio de la paleta
            const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            // Tamaño aleatorio
            sizes[i] = Math.random() * 2 + 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Material con shader personalizado para mejor performance
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: this.renderer.getPixelRatio() }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                uniform float pixelRatio;

                void main() {
                    vColor = color;
                    vec3 pos = position;

                    // Movimiento ondulante sutil
                    pos.x += sin(time * 0.3 + position.y * 0.05) * 0.5;
                    pos.y += cos(time * 0.2 + position.x * 0.05) * 0.5;
                    pos.z += sin(time * 0.25 + position.z * 0.05) * 0.3;

                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;

                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;

                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    alpha *= 0.7;

                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    addEventListeners() {
        // Mouse movement
        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            this.targetMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.targetMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        });

        // Resize
        window.addEventListener('resize', () => this.onResize());

        // Page visibility
        document.addEventListener('visibilitychange', () => {
            this.isRunning = !document.hidden;
            if (this.isRunning) this.animate();
        });
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.animate());

        const elapsedTime = this.clock.getElapsedTime();

        // Suavizar interpolación del mouse
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

        // Rotación de partículas basada en mouse
        if (this.particles) {
            this.particles.rotation.y = this.mouse.x * 0.2;
            this.particles.rotation.x = this.mouse.y * 0.1;

            // Update uniform time
            this.particles.material.uniforms.time.value = elapsedTime;
        }

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.isRunning = false;
        if (this.particles) {
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('#hero');
    if (hero) {
        // Verificar que el usuario prefiere motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReducedMotion) {
            new HeroParticles(hero);
        }
    }
});

// Export para uso externo
window.HeroParticles = HeroParticles;
