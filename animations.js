(function () {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. 3D STARFIELD / PARTICLE BACKGROUND ---------- */
    const bgCanvas = document.getElementById('bg-canvas');
    const bgCtx = bgCanvas.getContext('2d');
    let W, H, particles = [];
    const PARTICLE_COUNT = reduceMotion ? 0 : (window.innerWidth < 700 ? 70 : 140);
    const colors = ['#4f8ef7', '#f7714f', '#b06ef7', '#ffffff'];

    function resizeCanvas() {
        W = bgCanvas.width = window.innerWidth;
        H = bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function Particle() {
        this.reset(true);
    }
    Particle.prototype.reset = function (init) {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.z = Math.random() * 1.6 + 0.4; // depth factor (parallax)
        this.baseR = Math.random() * 1.6 + 0.4;
        this.vx = (Math.random() - 0.5) * 0.15 * this.z;
        this.vy = (Math.random() - 0.5) * 0.15 * this.z;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.twinkleSpeed = 0.01 + Math.random() * 0.02;
        if (!init) { this.x = Math.random() < 0.5 ? -5 : W + 5; }
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    let mouseX = W / 2, mouseY = H / 2;
    let targetParX = 0, targetParY = 0, curParX = 0, curParY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        targetParX = (e.clientX / W - 0.5) * 2;
        targetParY = (e.clientY / H - 0.5) * 2;

        const glow = document.getElementById('cursor-glow');
        if (glow) {
            glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        }
    }, { passive: true });

    function drawParticles() {
        if (reduceMotion) return;
        bgCtx.clearRect(0, 0, W, H);

        curParX += (targetParX - curParX) * 0.04;
        curParY += (targetParY - curParY) * 0.04;

        // connecting lines (constellation effect) - sampled for perf
        bgCtx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.twinklePhase += p.twinkleSpeed;

            // parallax offset based on depth
            const parX = curParX * 18 * p.z;
            const parY = curParY * 18 * p.z;

            if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) p.reset(false);

            const drawX = p.x + parX;
            const drawY = p.y + parY;
            const twinkle = (Math.sin(p.twinklePhase) + 1) / 2;
            const r = p.baseR * p.z * (0.7 + twinkle * 0.6);
            const alpha = 0.25 + twinkle * 0.5;

            bgCtx.beginPath();
            bgCtx.arc(drawX, drawY, r, 0, Math.PI * 2);
            bgCtx.fillStyle = p.color;
            bgCtx.globalAlpha = alpha * (p.z / 2);
            bgCtx.shadowBlur = 6 * p.z;
            bgCtx.shadowColor = p.color;
            bgCtx.fill();
        }
        bgCtx.globalAlpha = 1;
        bgCtx.shadowBlur = 0;

        requestAnimationFrame(drawParticles);
    }
    requestAnimationFrame(drawParticles);

    /* ---------- 2. 3D CARD TILT ON HOVER ---------- */
    function attachTilt(selector, maxTilt) {
        document.querySelectorAll(selector).forEach((el) => {
            if (el.dataset.tiltBound) return;
            el.dataset.tiltBound = '1';
            if (reduceMotion) return;

            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width;
                const py = (e.clientY - rect.top) / rect.height;
                const rotY = (px - 0.5) * maxTilt;
                const rotX = (0.5 - py) * maxTilt;
                el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(6px)`;
                el.style.setProperty('--mx', `${px * 100}%`);
                el.style.setProperty('--my', `${py * 100}%`);
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
            });
        });
    }

    function refreshTiltTargets() {
        attachTilt('.login-card', 6);
        attachTilt('.card', 4);
    }
    refreshTiltTargets();
    // Re-bind periodically since game-state cards toggle visibility/content
    setInterval(refreshTiltTargets, 1500);

    /* ---------- 3. BUTTON RIPPLE EFFECT ---------- */
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn, .player-btn');
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height) * 1.4;
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 650);
    });

    /* ---------- 4. CONFETTI BURST ---------- */
    const confettiCanvas = document.getElementById('confetti-canvas');
    const cCtx = confettiCanvas.getContext('2d');
    let confettiPieces = [];
    let confettiRunning = false;

    function resizeConfetti() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeConfetti);
    resizeConfetti();

    function fireConfetti(originX, originY, count) {
        if (reduceMotion) return;
        count = count || 90;
        originX = originX ?? confettiCanvas.width / 2;
        originY = originY ?? confettiCanvas.height / 3;
        const palette = ['#4f8ef7', '#f7714f', '#b06ef7', '#22d37a', '#f7c94f', '#ffffff'];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 9 + 3;
            confettiPieces.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                gravity: 0.22,
                size: Math.random() * 7 + 4,
                color: palette[Math.floor(Math.random() * palette.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 20,
                life: 1,
                decay: Math.random() * 0.008 + 0.006,
                shape: Math.random() < 0.5 ? 'rect' : 'circle'
            });
        }
        if (!confettiRunning) {
            confettiRunning = true;
            requestAnimationFrame(animateConfetti);
        }
    }
    window.fireConfetti = fireConfetti;

    function animateConfetti() {
        cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiPieces.forEach((p) => {
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotSpeed;
            p.life -= p.decay;

            cCtx.save();
            cCtx.globalAlpha = Math.max(p.life, 0);
            cCtx.translate(p.x, p.y);
            cCtx.rotate((p.rotation * Math.PI) / 180);
            cCtx.fillStyle = p.color;
            if (p.shape === 'rect') {
                cCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            } else {
                cCtx.beginPath();
                cCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                cCtx.fill();
            }
            cCtx.restore();
        });

        confettiPieces = confettiPieces.filter((p) => p.life > 0 && p.y < confettiCanvas.height + 50);

        if (confettiPieces.length > 0) {
            requestAnimationFrame(animateConfetti);
        } else {
            confettiRunning = false;
            cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
    }

    /* ---------- 5. HOOK CONFETTI INTO GAME EVENTS ---------- */
    // Successful login
    const originalDoLoginBtn = document.getElementById('pin-submit');
    if (originalDoLoginBtn) {
        originalDoLoginBtn.addEventListener('click', () => {
            setTimeout(() => {
                const gameScreenActive = document.getElementById('game-screen').classList.contains('active');
                if (gameScreenActive) {
                    const rect = originalDoLoginBtn.getBoundingClientRect();
                    fireConfetti(rect.left + rect.width / 2, rect.top, 60);
                }
            }, 80);
        });
    }

    // Truth/Dare choice made
    ['choice-truth', 'choice-dare'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => {
                const rect = el.getBoundingClientRect();
                fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 50);
            });
        }
    });

    // Answer submitted
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    if (submitAnswerBtn) {
        submitAnswerBtn.addEventListener('click', () => {
            const rect = submitAnswerBtn.getBoundingClientRect();
            setTimeout(() => fireConfetti(rect.left + rect.width / 2, rect.top, 70), 150);
        });
    }

    /* ---------- 6. PAGE ENTRY 3D REVEAL ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        document.body.style.opacity = '0';
        document.body.style.transform = 'scale(0.98) translateZ(-40px)';
        document.body.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
            document.body.style.transform = 'scale(1) translateZ(0)';
        });
    });

    /* ---------- 7. GLOWING SCROLLBAR / GAME STATE SWITCH ANIMATION HOOK ---------- */
    const gameStateObserver = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                const el = m.target;
                if (el.classList.contains('active') && el.classList.contains('game-state')) {
                    el.style.animation = 'none';
                    void el.offsetWidth;
                    el.style.animation = '';
                    refreshTiltTargets();
                }
            }
        });
    });
    document.querySelectorAll('.game-state').forEach((el) => {
        gameStateObserver.observe(el, { attributes: true });
    });

})();