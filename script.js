function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getFocusableElements(container) {
    if (!container) return [];
    const selectors = [
        'a[href]',
        'area[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
    ];
    return Array.from(container.querySelectorAll(selectors.join(',')))
        .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}

function trapFocusIn(container, e) {
    if (e.key !== 'Tab') return;
    const focusables = getFocusableElements(container);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
    }
}

// Interactive particles on canvas
class ParticleCanvas {
    constructor() {
        this.canvas = document.getElementById('particles');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) return;
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        // Reduced particle count for performance
        this.particleCount = this.isMobile ? 40 : 80;
        this.dpr = window.devicePixelRatio || 1;
        this.width = 0;
        this.height = 0;
        this.isRunning = false;
        this.rafId = null;
        
        this.init();
        this.setupEventListeners();
        this.start();
    }

    init() {
        this.resize();
        this.createParticles();
    }

    resize() {
        this.dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Set display size (CSS pixels)
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        // Set actual pixel buffer size
        this.canvas.width = Math.floor(this.width * this.dpr);
        this.canvas.height = Math.floor(this.height * this.dpr);

        // Draw in CSS pixels, scale for DPR
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                baseX: 0,
                baseY: 0,
                density: Math.random() * 30 + 1
            });
        }
        
        this.particles.forEach(particle => {
            particle.baseX = particle.x;
            particle.baseY = particle.y;
        });
    }

    drawParticles() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.particles.forEach(particle => {
            // Draw particle
            this.ctx.fillStyle = 'rgba(139, 133, 99, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Particle movement
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Screen bounds
            if (particle.x < 0 || particle.x > this.width) {
                particle.speedX *= -1;
            }
            if (particle.y < 0 || particle.y > this.height) {
                particle.speedY *= -1;
            }
            
            // Cursor interaction (desktop only)
            if (!this.isMobile && this.mouse.x !== null && this.mouse.y !== null) {
                const dx = this.mouse.x - particle.x;
                const dy = this.mouse.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (!distance) return;
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const maxDistance = this.mouse.radius;
                const force = (maxDistance - distance) / maxDistance;
                
                if (distance < maxDistance) {
                    const directionX = forceDirectionX * force * particle.density;
                    const directionY = forceDirectionY * force * particle.density;
                    particle.x -= directionX;
                    particle.y -= directionY;
                }
            }
        });
        
        // Draw connections between particles (desktop only)
        /* Disabled for better performance
        if (!this.isMobile) {
            this.connectParticles();
        }
        */
    }

    connectParticles() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 120) {
                    const opacity = 1 - (distance / 120);
                    this.ctx.strokeStyle = `rgba(139, 133, 99, ${opacity * 0.2})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        if (!this.isRunning) return;
        this.drawParticles();
        this.rafId = requestAnimationFrame(() => this.animate());
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createParticles();
        });

        // Orientation change handler for mobile devices
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.resize();
                this.createParticles();
            }, 100);
        });

        // Only desktop can interact with cursor
        if (!this.isMobile) {
            window.addEventListener('mousemove', (e) => {
                this.mouse.x = e.x;
                this.mouse.y = e.y;
            });

            window.addEventListener('mouseout', () => {
                this.mouse.x = null;
                this.mouse.y = null;
            });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stop();
            } else {
                this.start();
            }
        });
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
}

// Contact modal
class ContactModal {
    constructor() {
        this.modal = document.getElementById('contactModal');
        this.navContactBtn = document.getElementById('navContactBtn');
        this.floatingBtn = document.getElementById('floatingContactBtn');
        this.closeBtn = document.getElementById('closeModal');
        this.overlay = this.modal.querySelector('.modal-overlay');
        this.dialog = this.modal.querySelector('.modal-content');
        this.previouslyFocused = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle all contact buttons (nav + hero + floating)
        const contactTriggers = document.querySelectorAll('#navContactBtn, #heroContactBtn, #floatingContactBtn');
        contactTriggers.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.open();
                });
            }
        });

        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
            if (this.modal.classList.contains('active')) {
                trapFocusIn(this.dialog, e);
            }
        });
    }

    open() {
        this.previouslyFocused = document.activeElement;
        this.modal.classList.add('active');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        (this.closeBtn || this.dialog).focus?.();
    }

    close() {
        this.modal.classList.remove('active');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        if (this.previouslyFocused && this.previouslyFocused.focus) {
            this.previouslyFocused.focus();
        }
    }
}

// Price modal
class PriceModal {
    constructor() {
        this.modal = document.getElementById('priceModal');
        this.title = document.getElementById('priceTitle');
        this.list = document.getElementById('priceList');
        this.closeBtn = document.getElementById('closePriceModal');
        this.overlay = this.modal.querySelector('.modal-overlay');
        this.dialog = this.modal.querySelector('.modal-content');
        this.portfolio = document.querySelector('.portfolio-content');
        this.previouslyFocused = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.portfolio) {
            this.portfolio.addEventListener('click', (e) => {
                const card = e.target.closest('.variant');
                if (!card || card.getAttribute('data-price') !== 'true') return;
                this.open(card);
            });

            this.portfolio.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const card = e.target.closest('.variant');
                if (!card || card.getAttribute('data-price') !== 'true') return;
                e.preventDefault();
                this.open(card);
            });
        }

        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
            if (this.modal.classList.contains('active')) {
                trapFocusIn(this.dialog, e);
            }
        });
    }

    open(card) {
        this.previouslyFocused = document.activeElement;
        const title = card.getAttribute('data-title') || 'Package';
        const includes = (card.getAttribute('data-includes') || '').split('|').filter(Boolean);

        this.title.textContent = title;
        this.list.innerHTML = includes.map(item => `<li>${item}</li>`).join('');

        this.modal.classList.add('active');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        (this.closeBtn || this.dialog).focus?.();
    }

    close() {
        this.modal.classList.remove('active');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        if (this.previouslyFocused && this.previouslyFocused.focus) {
            this.previouslyFocused.focus();
        }
    }
}

// Smooth reveal animations
class ScrollAnimation {
    constructor() {
        // Disable card reveal on mobile where rows scroll horizontally
        this.isMobileLayout = window.matchMedia('(max-width: 768px)').matches;
        this.observeElements();
    }

    observeElements() {
        if (this.isMobileLayout) {
            // On mobile: cards are immediately visible, no reveal-on-scroll
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Portfolio card reveal
        document.querySelectorAll('.variant').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }
}

// Navigation
class Navigation {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.navContactBtn = document.getElementById('navContactBtn');
        this.sections = document.querySelectorAll('section[id]');
        this.touchStartY = 0;
        this.touchEndY = 0;
        
        this.setupScrollBehavior();
        this.setupActiveLinks();
        this.setupNavContact();
        this.setupTouchSwipe();
        this.setupWheelNavigation();
    }

    setupScrollBehavior() {
        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            // Show navigation after scrolling down
            if (currentScroll > 300) {
                this.navbar.classList.add('visible');
            } else {
                this.navbar.classList.remove('visible');
            }
            
            lastScroll = currentScroll;
        }, { passive: true });

        // Smooth scroll to sections
        this.navLinks.forEach(link => {
            if (link.id !== 'navContactBtn') {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href');

                    // If it's the home link, scroll to the absolute top
                    if (targetId === '#home') {
                        window.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                        return;
                    }

                    const targetSection = document.querySelector(targetId);
                    
                    if (targetSection) {
                        // On mobile, scroll further down (smaller offset) to show more content
                        const isMobile = window.innerWidth <= 768;
                        // Negative offset on mobile pushes the scroll position further down past the anchor
                        const offset = isMobile ? -40 : 80;
                        const offsetTop = targetSection.offsetTop - offset;
                        
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                    }
                });
            }
        });
    }

    setupActiveLinks() {
        const observerOptions = {
            threshold: 0.3,
            rootMargin: '-80px 0px -60% 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    this.navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);

        this.sections.forEach(section => observer.observe(section));
    }

    setupNavContact() {
        // Contact button is handled by ContactModal
    }

    setupTouchSwipe() {
        // Touch swipe navigation disabled — free scroll on mobile/tablets
    }

    handleSwipe() {
        // Disabled for mobile/tablets
    }

    getCurrentSection() {
        const scrollPosition = window.pageYOffset + window.innerHeight / 2;
        
        for (const section of this.sections) {
            const offsetTop = section.offsetTop;
            const offsetBottom = offsetTop + section.offsetHeight;
            
            if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
                return section;
            }
        }
        return this.sections[0];
    }

    scrollToSection(section) {
        const offsetTop = section.offsetTop;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }

    setupWheelNavigation() {
        // Wheel snap desktop-only (≥1440px)
        const isDesktop = window.matchMedia('(min-width: 1440px)').matches;
        if (!isDesktop) return;

        let isSnapping = false;

        window.addEventListener('wheel', (e) => {
            if (isSnapping) {
                e.preventDefault();
                return;
            }

            if (Math.abs(e.deltaY) < 10) return;

            const currentSection = this.getCurrentSection();
            if (!currentSection) return;

            const sections = Array.from(this.sections);
            const currentIndex = sections.indexOf(currentSection);
            const nextIndex = e.deltaY > 0 ? currentIndex + 1 : currentIndex - 1;

            if (nextIndex < 0 || nextIndex >= sections.length) return;

            e.preventDefault();
            isSnapping = true;
            this.scrollToSection(sections[nextIndex]);

            setTimeout(() => {
                isSnapping = false;
            }, 700);
        }, { passive: false });
    }

}


// Blackjack Game Logic
class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.playerScore = 0;
        this.opponentScore = 0;
        this.isPlaying = false;
        this.clickCount = 0;
        this.clickTimer = null;
        this.timers = [];
        
        // DOM Elements
        this.modal = document.getElementById('gameModal');
        this.triggerBtn = document.getElementById('cssTag'); // Easter egg trigger
        this.btnClose = document.getElementById('closeGameModal');
        this.btnHit = document.getElementById('btnHit');
        this.btnStay = document.getElementById('btnStay');
        this.btnRestart = document.getElementById('btnRestart');
        this.playerArea = document.getElementById('playerHand');
        this.scoreDisplay = document.getElementById('playerScore');
        this.opponentScoreDisplay = document.getElementById('opponentScoreRaw');
        this.statusDisplay = document.getElementById('gameStatus');
        
        this.overlay = this.modal.querySelector('.modal-overlay');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.triggerBtn) {
            this.triggerBtn.style.cursor = 'pointer'; // Hint that it is clickable
            this.triggerBtn.addEventListener('click', (e) => {
                this.handleClick(e);
            });
            // Prevent text selection on rapid clicks
            this.triggerBtn.addEventListener('mousedown', (e) => e.preventDefault());
        }
        
        this.btnClose.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());
        
        this.btnHit.addEventListener('click', () => this.hit());
        this.btnStay.addEventListener('click', () => this.stay());
        this.btnRestart.addEventListener('click', () => this.startGame());
    }

    handleClick(e) {
        this.clickCount++;
        
        // Reset count if no clicks for 500ms
        clearTimeout(this.clickTimer);
        this.clickTimer = setTimeout(() => {
            this.clickCount = 0;
        }, 1000);

        if (this.clickCount >= 5) {
            this.clickCount = 0;
            this.open();
        }
    }

    open() {
        this.clearTimers();
        this.modal.classList.add('active');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        this.startGame();
    }

    close() {
        this.clearTimers();
        this.modal.classList.remove('active');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }

    clearTimers() {
        this.timers.forEach(t => clearTimeout(t));
        this.timers = [];
    }

    startGame() {
        this.clearTimers();
        // Reset state
        this.createDeck();
        this.playerHand = [];
        this.isPlaying = true;
        this.playerArea.innerHTML = '';
        this.statusDisplay.textContent = 'Get 21 or beat the opponent!';
        this.statusDisplay.style.color = 'var(--text-secondary)';
        
        // Buttons state
        this.btnHit.disabled = false;
        this.btnStay.disabled = false;
        this.btnHit.classList.remove('hidden');
        this.btnStay.classList.remove('hidden');
        this.btnRestart.classList.add('hidden');
        
        // Reset Opponent logic: simulate draws
        // Start with a base between 15 and 26.
        // This gives a chance for higher bust, lower scores, and blackjack.
        this.opponentScore = Math.floor(Math.random() * (26 - 15 + 1)) + 15;
        
        this.opponentScoreDisplay.textContent = '??';
        this.opponentScoreDisplay.style.opacity = ''; // Reset opacity style
        this.opponentScoreDisplay.classList.add('hidden');

        // Deal initial cards with stagger
        this.dealCard();
        setTimeout(() => {
            this.dealCard();
        }, 200);
    }

    createDeck() {
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.deck = [];
        
        for (let suit of suits) {
            for (let value of values) {
                this.deck.push({ suit, value });
            }
        }
        
        // Shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCard() {
        if (this.deck.length === 0) return;
        
        const card = this.deck.pop();
        this.playerHand.push(card);
        this.renderCard(card);
        this.updateScore();
        
        if (this.playerScore > 21) {
            this.endGame('Bust! You went over 21.');
        }
    }

    renderCard(card) {
        const cardEl = document.createElement('div');
        const isRed = card.suit === '♥' || card.suit === '♦';
        cardEl.className = `game-card ${isRed ? 'red' : ''}`;
        cardEl.setAttribute('data-value', card.value);
        cardEl.innerHTML = `<span>${card.suit}</span>`;
        
        this.playerArea.appendChild(cardEl);
        
        // Find deck deck (source position)
        const deckCard = this.modal.querySelector('.deck-area .game-card.back');
        
        if (deckCard && deckCard.offsetParent) { // Check if visible
            const startRect = deckCard.getBoundingClientRect();
            const endRect = cardEl.getBoundingClientRect();
            
            const deltaX = startRect.left - endRect.left;
            const deltaY = startRect.top - endRect.top;
            
            // Start from deck
            cardEl.style.transition = 'none';
            cardEl.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(-45deg) scale(0.5)`;
            cardEl.style.opacity = '0';
            
            // Force reflow
            cardEl.offsetHeight; 
            
            // Animate to hand
            requestAnimationFrame(() => {
                // Opacity creates quickly (0.1s), move takes longer (0.5s)
                cardEl.style.transition = 'transform 0.5s ease-out, opacity 0.1s linear';
                cardEl.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
                cardEl.style.opacity = '1';
            });
        } else {
            // Fallback (mobile or deck hidden)
            cardEl.style.opacity = '0';
            cardEl.style.transform = 'translateY(20px)';
            requestAnimationFrame(() => {
                cardEl.style.transition = 'all 0.3s ease';
                cardEl.style.opacity = '1';
                cardEl.style.transform = 'translateY(0)';
            });
        }
    }

    updateScore() {
        let score = 0;
        let aces = 0;
        
        for (let card of this.playerHand) {
            if (['J', 'Q', 'K'].includes(card.value)) {
                score += 10;
            } else if (card.value === 'A') {
                aces += 1;
                score += 11;
            } else {
                score += parseInt(card.value);
            }
        }
        
        while (score > 21 && aces > 0) {
            score -= 10;
            aces -= 1;
        }
        
        this.playerScore = score;
        this.scoreDisplay.textContent = score;
    }

    hit() {
        if (!this.isPlaying) return;
        this.dealCard();
    }

    stay() {
        if (!this.isPlaying) return;
        
        // Disable buttons immediately
        this.btnHit.disabled = true;
        this.btnStay.disabled = true;

        // Show loading dots
        this.opponentScoreDisplay.classList.remove('hidden');
        this.opponentScoreDisplay.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

        // Reveal opponent after delay
        const t1 = setTimeout(() => {
            // Prepare for fade-in
            this.opponentScoreDisplay.style.opacity = '0';
            this.opponentScoreDisplay.textContent = this.opponentScore;
            
            // Trigger reflow & fade in
            requestAnimationFrame(() => {
                this.opponentScoreDisplay.style.opacity = '1';
            });
            
            // Show result after another delay
            const t2 = setTimeout(() => {
                if (this.opponentScore > 21) {
                    this.endGame('Opponent Bust! You Win!');
                } else if (this.playerScore > this.opponentScore) {
                    this.endGame('You Win!');
                } else if (this.playerScore < this.opponentScore) {
                    this.endGame('You Lost.');
                } else {
                    this.endGame('Push (Tie).');
                }
            }, 600);
            this.timers.push(t2);
        }, 1000); // 1 second intrigue delay
        this.timers.push(t1);
    }

    endGame(message) {
        this.isPlaying = false;
        this.statusDisplay.textContent = message;
        this.statusDisplay.style.color = message.includes('Win') ? '#48bb78' : (message.includes('Lost') || message.includes('Bust') ? '#e53e3e' : '#ecc94b');
        
        this.btnHit.classList.add('hidden');
        this.btnStay.classList.add('hidden');
        this.btnRestart.classList.remove('hidden');
        this.btnHit.disabled = true;
        this.btnStay.disabled = true;
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    const reduced = prefersReducedMotion();
    if (!reduced) {
        new ParticleCanvas();
    }
    new ContactModal();
    if (!reduced) {
        new ScrollAnimation();
    }
    new Navigation();
    new PriceModal();
    new BlackjackGame(); // Initialize Game
    if (!reduced) {
        initCustomCursor();
    }
    initVariantImages();
    initVariantToggles();
    
    // Handle "My Offers" button click
    const myOffersBtn = document.getElementById('myOffersBtn');
    if (myOffersBtn) {
        myOffersBtn.addEventListener('click', () => {
            const portfolioSection = document.getElementById('portfolio');
            if (portfolioSection) {
                const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
                portfolioSection.scrollIntoView({ behavior });
            }
        });
    }

    // Fix: Make tech tags interactive on IOS/Mobile for :active states
    document.querySelectorAll('.tech-tag').forEach(tag => {
        tag.addEventListener('click', () => {});
    });
});

// Set background images for example cards
function initVariantImages() {
    const variantsWithImages = document.querySelectorAll('.variant[data-image]');
    
    variantsWithImages.forEach(variant => {
        const imagePath = variant.getAttribute('data-image');
        const preview = variant.querySelector('.variant-preview');
        
        if (imagePath && preview) {
            // Background for ::before via CSS variable
            variant.style.setProperty('--bg-image', `url(${imagePath})`);
            
            // Blurred background for preview::before
            preview.style.setProperty('--bg-image', `url(${imagePath})`);
        }
    });
}

function initCustomCursor() {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    if (!dot || !ring) return;

    const canUse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canUse) return;
    if (prefersReducedMotion()) return;

    let ringX = 0;
    let ringY = 0;
    let targetX = 0;
    let targetY = 0;

    const show = () => {
        dot.style.opacity = '1';
        ring.style.opacity = '1';
    };

    const hide = () => {
        dot.style.opacity = '0';
        ring.style.opacity = '0';
    };

    const animate = () => {
        ringX += (targetX - ringX) * 0.15;
        ringY += (targetY - ringY) * 0.15;
        ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        show();
    });

    window.addEventListener('mouseout', hide);
    window.addEventListener('blur', hide);

    const isClickable = (el) => {
        if (!el) return false;
        return !!el.closest('a, button, .variant, .contact-item, .nav-link');
    };

    window.addEventListener('mouseover', (e) => {
        if (isClickable(e.target)) {
            dot.classList.add('is-hover');
            ring.classList.add('is-hover');
        }
    });

    window.addEventListener('mouseout', (e) => {
        if (isClickable(e.target)) {
            dot.classList.remove('is-hover');
            ring.classList.remove('is-hover');
        }
    });

    window.addEventListener('mousedown', () => {
        dot.classList.add('is-active');
    });

    window.addEventListener('mouseup', () => {
        dot.classList.remove('is-active');
    });

    // Fix: Reset cursor state after drag operations (e.g. text selection dragging)
    window.addEventListener('dragend', () => {
        dot.classList.remove('is-active');
    });

    animate();
}

function initVariantToggles() {
    const toggles = document.querySelectorAll('.variant-toggle-btn');
    
    toggles.forEach(btn => {
        const toggle = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const variant = btn.closest('.variant');
            if (variant) {
                variant.classList.toggle('show-preview');
                btn.setAttribute('aria-pressed', variant.classList.contains('show-preview') ? 'true' : 'false');
            }
        };

        btn.addEventListener('click', toggle);
        btn.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            toggle(e);
        });
    });
}
