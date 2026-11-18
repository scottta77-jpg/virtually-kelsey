/**
 * Exact Framer Motion Animation Engine & Interaction Controller
 * Replicates virtual-assistant-bujadesign.framer.website
 */

(function () {
  'use strict';

  const FRAMER_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  /**
   * Exact analytical/numerical spring solver matching Framer's runtime
   * Default spring: { type: "spring", stiffness: 500, damping: 60, mass: 1 }
   */
  function createSpringStepper(stiffness = 500, damping = 60, mass = 1) {
    const omega0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));

    return function evaluate(tSeconds) {
      if (tSeconds <= 0) return 0;
      if (zeta < 1) {
        // Underdamped
        const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
        const envelope = Math.exp(-zeta * omega0 * tSeconds);
        return (
          1 -
          envelope *
            (Math.cos(omegaD * tSeconds) +
              ((zeta * omega0) / omegaD) * Math.sin(omegaD * tSeconds))
        );
      } else if (zeta === 1) {
        // Critically damped
        return 1 - (1 + omega0 * tSeconds) * Math.exp(-omega0 * tSeconds);
      } else {
        // Overdamped (zeta > 1, e.g. stiffness=500, damping=60 => zeta ~ 1.3416)
        const s = Math.sqrt(zeta * zeta - 1);
        const r1 = -omega0 * (zeta - s);
        const r2 = -omega0 * (zeta + s);
        const c2 = -r1 / (r2 - r1);
        const c1 = 1 - c2;
        return 1 - (c1 * Math.exp(r1 * tSeconds) + c2 * Math.exp(r2 * tSeconds));
      }
    };
  }

  /**
   * Animates a numeric value from `from` to `to` using exact Framer spring physics
   */
  function animateSpring({
    from,
    to,
    stiffness = 500,
    damping = 60,
    mass = 1,
    onUpdate,
    onComplete,
  }) {
    const stepFn = createSpringStepper(stiffness, damping, mass);
    const startTime = performance.now();
    const durationLimit = 0.55; // settles within ~450ms for k=500, c=60
    let rafId = null;

    function tick(now) {
      const elapsed = (now - startTime) / 1000;
      const progress = stepFn(elapsed);
      const current = from + (to - from) * progress;

      if (elapsed < durationLimit && Math.abs(to - current) > 0.0005) {
        onUpdate(current, progress);
        rafId = requestAnimationFrame(tick);
      } else {
        onUpdate(to, 1);
        if (onComplete) onComplete();
      }
    }

    rafId = requestAnimationFrame(tick);
    return function cancel() {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }

  /**
   * 1. Initial Page Load Appear Animations (__framer__appearAnimationsContent)
   */
  function runInitialAppearAnimations() {
    // Hero Left Column: { opacity: 0.001, y: 24, scale: 1 } -> { opacity: 1, y: 0, scale: 1 }, duration: 0.8s, delay: 0.05s
    const heroLeft = document.querySelector('[data-framer-appear-id="1v2evg"]');
    if (heroLeft) {
      const anim = heroLeft.animate(
        [
          { opacity: 0.001, transform: 'translateY(24px) scale(1)' },
          { opacity: 1, transform: 'translateY(0px) scale(1)' },
        ],
        {
          duration: 800,
          delay: 50,
          easing: FRAMER_EASE,
          fill: 'forwards',
        }
      );
      anim.onfinish = () => {
        heroLeft.classList.remove('appear-hero-left');
        heroLeft.style.opacity = '1';
        heroLeft.style.transform = 'none';
        anim.cancel();
      };
    }

    // Hero Right Image: { opacity: 0.001, y: 32, scale: 0.97 } -> { opacity: 1, y: 0, scale: 1 }, duration: 0.9s, delay: 0.2s
    const heroRight = document.querySelector('[data-framer-appear-id="hrkhyn"]');
    if (heroRight) {
      const anim = heroRight.animate(
        [
          { opacity: 0.001, transform: 'translateY(32px) scale(0.97)' },
          { opacity: 1, transform: 'translateY(0px) scale(1)' },
        ],
        {
          duration: 900,
          delay: 200,
          easing: FRAMER_EASE,
          fill: 'forwards',
        }
      );
      anim.onfinish = () => {
        heroRight.classList.remove('appear-hero-right');
        heroRight.style.opacity = '1';
        heroRight.style.transform = 'none';
        anim.cancel();
      };
    }

    // Floating "Buy this template" Button: { opacity: 0.001, y: 15, perspective: 1200 } -> { opacity: 1, y: 0 }, duration: 0.5s, delay: 0.8s
    const buyBtn = document.querySelector('[data-framer-appear-id="8ew752"]');
    if (buyBtn) {
      const anim = buyBtn.animate(
        [
          {
            opacity: 0.001,
            transform: 'perspective(1200px) translateY(15px) scale(1)',
          },
          {
            opacity: 1,
            transform: 'perspective(1200px) translateY(0px) scale(1)',
          },
        ],
        {
          duration: 500,
          delay: 800,
          easing: FRAMER_EASE,
          fill: 'forwards',
        }
      );
      anim.onfinish = () => {
        buyBtn.classList.remove('appear-buy-btn');
        buyBtn.style.opacity = '1';
        buyBtn.style.transform = 'perspective(1200px)';
        anim.cancel();
      };
    }
  }

  /**
   * 2. Scroll-Triggered Entrance Animations (whileInView / __framer__enter)
   * Threshold: 0.1, Trigger Once: true, Duration: 700ms, Easing: cubic-bezier(0.22, 1, 0.36, 1)
   */
  function initScrollRevealAnimations() {
    const elements = document.querySelectorAll('.scroll-reveal');
    if (!elements.length) return;

    const initialTransformMap = {
      heading: 'translateY(24px) scale(1)',
      card: 'translateY(32px) scale(0.98)',
      'faq-item': 'translateY(16px) scale(1)',
      'contact-img': 'translateY(32px) scale(0.97)',
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            observer.unobserve(el); // __framer__animateOnce: true

            const animType = el.getAttribute('data-anim') || 'heading';
            const delaySec = parseFloat(el.getAttribute('data-delay') || '0');
            const startTransform =
              initialTransformMap[animType] || 'translateY(24px) scale(1)';

            const anim = el.animate(
              [
                { opacity: 0, transform: startTransform },
                { opacity: 1, transform: 'translateY(0px) scale(1)' },
              ],
              {
                duration: 700,
                delay: delaySec * 1000,
                easing: FRAMER_EASE,
                fill: 'forwards',
              }
            );

            anim.onfinish = () => {
              el.classList.remove('scroll-reveal');
              el.style.opacity = '1';
              el.style.transform = 'none';
              anim.cancel();
            };
          }
        });
      },
      {
        threshold: 0.1, // __framer__threshold: 0.1
      }
    );

    elements.forEach((el) => observer.observe(el));
  }

  /**
   * 3. FAQ Accordions with Spring Physics ({ type: "spring", stiffness: 500, damping: 60, mass: 1 })
   * Closed variant: Z5EBeE9pl (rotate: 0deg, answer hidden)
   * Open variant: vlJ45Iqv1 (rotate: 180deg, answer visible)
   */
  function initFaqAccordions() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item) => {
      let isOpen = false;
      let cancelHeightSpring = null;
      let cancelRotateSpring = null;
      let currentHeight = 0;
      let currentRotate = 0;

      const chevron = item.querySelector('.faq-chevron');
      const answerWrapper = item.querySelector('.faq-answer-wrapper');
      const answerInner = item.querySelector('.faq-answer-inner');

      function toggleAccordion() {
        isOpen = !isOpen;
        item.setAttribute('data-framer-name', isOpen ? 'Open' : 'Closed');
        item.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

        if (cancelHeightSpring) cancelHeightSpring();
        if (cancelRotateSpring) cancelRotateSpring();

        const targetHeight = isOpen ? answerInner.offsetHeight : 0;
        const targetRotate = isOpen ? 180 : 0;
        const startHeight = currentHeight;
        const startRotate = currentRotate;

        // Animate height & opacity using spring { stiffness: 500, damping: 60, mass: 1 }
        cancelHeightSpring = animateSpring({
          from: startHeight,
          to: targetHeight,
          stiffness: 500,
          damping: 60,
          mass: 1,
          onUpdate(h, progress) {
            currentHeight = h;
            answerWrapper.style.height = `${Math.max(0, h)}px`;
            answerWrapper.style.opacity = isOpen
              ? String(Math.min(1, progress * 1.25))
              : String(Math.max(0, 1 - progress * 1.35));
          },
          onComplete() {
            currentHeight = targetHeight;
            answerWrapper.style.height = isOpen ? 'auto' : '0px';
            answerWrapper.style.opacity = isOpen ? '1' : '0';
          },
        });

        // Animate chevron rotation 0deg <-> 180deg using same spring
        cancelRotateSpring = animateSpring({
          from: startRotate,
          to: targetRotate,
          stiffness: 500,
          damping: 60,
          mass: 1,
          onUpdate(deg) {
            currentRotate = deg;
            if (chevron) {
              chevron.style.transform = `rotate(${deg}deg)`;
            }
          },
          onComplete() {
            currentRotate = targetRotate;
            if (chevron) {
              chevron.style.transform = `rotate(${targetRotate}deg)`;
            }
          },
        });
      }

      item.addEventListener('click', toggleAccordion);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleAccordion();
        }
      });
    });
  }

  /**
   * 4. Tablet & Mobile Hamburger Menu Toggle & Smooth Anchor Scroll
   */
  function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const toggleBtn = document.querySelector('.navbar-toggle');

    if (toggleBtn && navbar) {
      toggleBtn.addEventListener('click', () => {
        const isOpen = navbar.classList.toggle('menu-open');
        navbar.setAttribute(
          'data-framer-name',
          isOpen ? 'Tablet and Mobile Opened' : 'Tablet and Mobile'
        );
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    // Smooth scroll for internal hash links
    const hashLinks = document.querySelectorAll('a[href^="#"]');
    hashLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          if (navbar && navbar.classList.contains('menu-open')) {
            navbar.classList.remove('menu-open');
          }
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /**
   * 5. Split-Text Hover Highlight Effect for Footer Credit Link
   */
  function initSplitTextLinks() {
    const links = document.querySelectorAll('.split-text-link');
    links.forEach((link) => {
      const text = link.textContent || '';
      link.textContent = '';

      Array.from(text).forEach((char, idx) => {
        const displayChar = char === ' ' ? '\u00A0' : char;

        const charWrap = document.createElement('span');
        charWrap.className = 'split-char';
        charWrap.style.setProperty('--char-index', String(idx));

        const topSpan = document.createElement('span');
        topSpan.className = 'split-char-top';
        topSpan.textContent = displayChar;

        const bottomSpan = document.createElement('span');
        bottomSpan.className = 'split-char-bottom';
        bottomSpan.setAttribute('aria-hidden', 'true');
        bottomSpan.textContent = displayChar;

        charWrap.appendChild(topSpan);
        charWrap.appendChild(bottomSpan);
        link.appendChild(charWrap);
      });
    });
  }

  /**
   * 6. Interactive "Make your hand-off list" Hours Calculator & Plan Matcher
   */
  function initHandoffCalculator() {
    const tasks = document.querySelectorAll('.handoff-task[data-hours]');
    if (!tasks.length) return;

    const totalEl = document.getElementById('handoff-total-hours');
    const matchedLink = document.getElementById('handoff-matched-link');
    const matchedSub = document.getElementById('handoff-matched-sub');
    const planCards = document.querySelectorAll('.handoff-plan-card[data-plan]');

    function updateCalculation() {
      let total = 0;
      tasks.forEach((btn) => {
        if (btn.getAttribute('aria-pressed') === 'true') {
          total += parseInt(btn.getAttribute('data-hours') || '0', 10);
        }
      });

      if (totalEl) {
        totalEl.textContent = String(total);
      }

      let recommended = 'steady';
      let label = 'Steady plan, £720/mo';
      let sub = '20 hours a month';

      if (total <= 10) {
        recommended = 'essentials';
        label = 'Essentials plan, £380/mo';
        sub = '10 hours a month';
      } else if (total <= 20) {
        recommended = 'steady';
        label = 'Steady plan, £720/mo';
        sub = '20 hours a month';
      } else {
        recommended = 'right-hand';
        label = 'Right Hand plan, £1,380/mo';
        sub = total > 40 ? '40 hours + extra hours' : '40 hours a month';
      }

      if (matchedLink) matchedLink.textContent = label;
      if (matchedSub) matchedSub.textContent = sub;

      planCards.forEach((card) => {
        const isMatch = card.getAttribute('data-plan') === recommended;
        card.classList.toggle('is-recommended', isMatch);
      });
    }

    tasks.forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', next ? 'true' : 'false');
        updateCalculation();
      });
    });

    updateCalculation();
  }

  /**
   * 7. Contact Page Form Handler
   */
  function initContactForm() {
    const form = document.getElementById('vk-contact-form');
    if (!form) return;

    const statusEl = document.getElementById('vk-contact-status');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const email = String(fd.get('email') || '').trim();
      const business = String(fd.get('business') || '').trim();
      const message = String(fd.get('message') || '').trim();

      const subject = encodeURIComponent(
        `New enquiry from ${name || 'Virtually Kelsey website'}`
      );
      const bodyLines = [
        `Name: ${name}`,
        `Email: ${email}`,
        business ? `Business / Website: ${business}` : '',
        '',
        'What I would like to hand off:',
        message,
      ].filter(Boolean);
      const body = encodeURIComponent(bodyLines.join('\n'));

      window.location.href = `mailto:kelseyjohn3@gmail.com?subject=${subject}&body=${body}`;

      if (statusEl) {
        statusEl.textContent =
          'Thank you! Your email draft has been opened—or email kelseyjohn3@gmail.com directly anytime.';
        statusEl.classList.add('is-visible');
      }
    });
  }

  function initAll() {
    runInitialAppearAnimations();
    initScrollRevealAnimations();
    initFaqAccordions();
    initNavigation();
    initSplitTextLinks();
    initHandoffCalculator();
    initContactForm();
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();

