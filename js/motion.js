(() => {
  'use strict';
  const MMK = window.MMK;
  if (!MMK) return;

  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let customReduced = false;
  let animationContext;
  let responsiveContext;
  let initialized = false;
  let progressScheduled = false;
  try { customReduced = localStorage.getItem('mmk-reduced-motion') === 'true'; } catch {}
  MMK.reduced = () => customReduced || systemMotion.matches;

  const all = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

  function updateProgress() {
    const progress = document.querySelector('.scroll-progress span');
    if (progress) {
      const distance = document.documentElement.scrollHeight - innerHeight;
      const position = distance > 0 ? Math.max(0, Math.min(1, scrollY / distance)) : 0;
      progress.style.transform = `scaleX(${position})`;
    }
    progressScheduled = false;
  }

  function scheduleProgress() {
    if (!progressScheduled) {
      progressScheduled = true;
      requestAnimationFrame(updateProgress);
    }
  }

  function updateControl() {
    const reduced = MMK.reduced();
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
    const control = document.querySelector('#motion-toggle');
    if (!control) return;
    control.setAttribute('aria-pressed', String(reduced));
    control.textContent = reduced ? 'حرکت کاهش یافته' : 'کاهش حرکت';
    control.title = systemMotion.matches ? 'مطابق تنظیمات کاهش حرکت دستگاه شما' : '';
  }

  function resetAnimations() {
    // Revert restores the original visible CSS and removes every pin spacer.
    responsiveContext?.revert();
    responsiveContext = null;
    animationContext?.revert();
    animationContext = null;
  }

  function addPointerResponses(gsap) {
    const cleanups = [];
    all('.magnetic').forEach(button => {
      const inner = button.querySelector('span');
      if (!inner) return;
      // The hit area stays still; only its label follows a fine pointer.
      gsap.set(inner, { x: 0, y: 0 });
      const xTo = gsap.quickTo(inner, 'x', { duration: .32, ease: 'power3.out' });
      const yTo = gsap.quickTo(inner, 'y', { duration: .32, ease: 'power3.out' });
      const move = event => {
        if (event.pointerType === 'touch' || button.matches(':focus-visible')) return;
        const bounds = button.getBoundingClientRect();
        xTo(clamp((event.clientX - bounds.left - bounds.width / 2) * .12, 7));
        yTo(clamp((event.clientY - bounds.top - bounds.height / 2) * .14, 5));
      };
      const leave = () => { xTo(0); yTo(0); };
      button.addEventListener('pointermove', move);
      button.addEventListener('pointerleave', leave);
      button.addEventListener('pointercancel', leave);
      button.addEventListener('focusin', leave);
      cleanups.push(() => {
        button.removeEventListener('pointermove', move);
        button.removeEventListener('pointerleave', leave);
        button.removeEventListener('pointercancel', leave);
        button.removeEventListener('focusin', leave);
        xTo.tween.kill(); yTo.tween.kill();
      });
    });

    all('.project-stage').forEach(stage => {
      gsap.set(stage, { rotationX: 0, rotationY: 0, transformPerspective: 1000 });
      const xTo = gsap.quickTo(stage, 'rotationX', { duration: .4, ease: 'power2.out' });
      const yTo = gsap.quickTo(stage, 'rotationY', { duration: .4, ease: 'power2.out' });
      const move = event => {
        if (event.pointerType === 'touch' || stage.matches(':focus-within')) return;
        const bounds = stage.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        xTo(clamp((.5 - (event.clientY - bounds.top) / bounds.height) * 4, 2));
        yTo(clamp(((event.clientX - bounds.left) / bounds.width - .5) * 4, 2));
      };
      const leave = () => { xTo(0); yTo(0); };
      stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerleave', leave);
      stage.addEventListener('pointercancel', leave);
      stage.addEventListener('focusin', leave);
      cleanups.push(() => {
        stage.removeEventListener('pointermove', move);
        stage.removeEventListener('pointerleave', leave);
        stage.removeEventListener('pointercancel', leave);
        stage.removeEventListener('focusin', leave);
        xTo.tween.kill(); yTo.tween.kill();
      });
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }

  function build(entrance = false) {
    resetAnimations();
    updateControl();
    // Static progress is decorative; all story panels keep their semantic order.
    all('.story-progress span').forEach(progress => { progress.style.transform = 'scaleX(1)'; });
    if (!window.gsap || !window.ScrollTrigger || MMK.reduced()) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    animationContext = gsap.context(() => {
      const intro = document.querySelector('.page-intro') || document.querySelector('.hero');
      if (entrance && intro && scrollY < innerHeight * .6) {
        const lines = all('.title-line > span', intro);
        const supporting = all('.page-lead,.hero-description,.hero-actions,.hero-signature', intro);
        const artwork = intro.querySelector('.hero-art');
        const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
        // Existing line wrappers preserve Persian joining and the accessible text.
        if (lines.length) {
          const masked = lines.every(line => getComputedStyle(line.parentElement).overflowY !== 'visible');
          timeline.from(lines, {
            ...(masked ? { yPercent: 102 } : { y: 22 }),
            duration: .9, stagger: .09
          }, 0);
        }
        if (supporting.length) timeline.from(supporting, { y: 12, duration: .55, stagger: .04 }, .28);
        if (artwork) timeline.from(artwork, { opacity: .25, duration: 1 }, 0);
      }

      // One small, readable movement per opted-in group; never hide text.
      const groups = new Map();
      all('[data-reveal]').forEach(node => {
        if (intro?.contains(node) || node.parentElement?.closest('[data-reveal]')) return;
        const group = node.closest('[data-reveal-group],section') || node.parentElement;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(node);
      });
      groups.forEach((nodes, group) => {
        gsap.from(nodes, {
          y: 12, duration: .42, stagger: .035, ease: 'power2.out',
          scrollTrigger: { trigger: group, start: 'top 86%', once: true }
        });
      });
    });

    responsiveContext = gsap.matchMedia();
    responsiveContext.add('(min-width: 900px)', () => {
      const hero = document.querySelector('.hero');
      const artwork = hero?.querySelector('.hero-art');
      if (artwork) gsap.to(artwork, {
        y: -45, rotation: -1.5, scale: .98, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .8 }
      });
    });

    responsiveContext.add('(min-width: 1000px) and (min-height: 640px)', () => {
      all('.story-track').forEach(track => {
        const visual = track.querySelector('.story-visual[aria-hidden="true"]');
        const art = visual?.querySelector('.story-visual-art');
        const progress = track.querySelector('.story-progress span');
        const interactive = visual?.querySelector('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
        const canPin = visual && !interactive && track.offsetHeight > visual.offsetHeight + 140;
        if (!art && !progress) return;
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: track, start: canPin ? 'top 15%' : 'top 80%',
            end: canPin ? 'bottom 80%' : 'bottom 35%', scrub: .65,
            ...(canPin ? { pin: visual, pinSpacing: false, anticipatePin: 1 } : {}),
            invalidateOnRefresh: true
          }
        });
        if (art) timeline.to(art, { y: -18, rotation: -1.25, scale: 1.015, ease: 'none', duration: 1 }, 0);
        if (progress) timeline.fromTo(progress, { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0);
      });
    });

    responsiveContext.add('(hover: hover) and (pointer: fine)', () => addPointerResponses(gsap));
    ScrollTrigger.refresh();
  }

  MMK.initMotion = () => {
    if (initialized) { build(); updateProgress(); return; }
    initialized = true;
    build(true);
    window.addEventListener('scroll', scheduleProgress, { passive: true });
    window.addEventListener('resize', scheduleProgress, { passive: true });
    window.addEventListener('pageshow', () => { updateProgress(); window.ScrollTrigger?.refresh(); });
    document.querySelector('#motion-toggle')?.addEventListener('click', () => {
      if (systemMotion.matches) {
        MMK.toast?.('کاهش حرکت مطابق تنظیمات دستگاه شما فعال است.');
        return;
      }
      customReduced = !customReduced;
      try { localStorage.setItem('mmk-reduced-motion', String(customReduced)); } catch {}
      build();
      MMK.toast?.(MMK.reduced() ? 'حرکت‌های غیرضروری کاهش یافت.' : 'حرکت‌ها فعال شدند.');
    });
    systemMotion.addEventListener('change', () => build());
    updateProgress();
  };
})();
