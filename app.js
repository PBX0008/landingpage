(() => {
  const qs = (s, ctx = document) => ctx.querySelector(s);
  const qsa = (s, ctx = document) => [...ctx.querySelectorAll(s)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Smooth internal scrolling.
  const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const smoothScrollTo = (targetY, duration = 1100) => {
    const startY = window.scrollY;
    const diff = targetY - startY;
    const start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / duration);
      const eased = easeInOutCubic(p);
      window.scrollTo(0, startY + diff * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  qsa('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = qs(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 22;
      if (reducedMotion) target.scrollIntoView();
      else smoothScrollTo(y, 1150);
    });
  });

  // Reveal on entry.
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const delay = Number(entry.target.dataset.delay || 0);
      setTimeout(() => entry.target.classList.add('visible'), delay);
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .1, rootMargin: '0px 0px -5% 0px' });
  qsa('.reveal').forEach(el => revealObserver.observe(el));

  // Static full-width bar: only mobile menu opens below it.
  const menuButton = qs('.menu-button');
  const mobileNav = qs('.mobile-nav');
  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      mobileNav.setAttribute('aria-hidden', String(!open));
    });
    qsa('a', mobileNav).forEach(a => a.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      mobileNav.setAttribute('aria-hidden', 'true');
    }));
  }

  // Hero question interaction.
  const answers = qsa('.answer');
  const check = qs('#check-answer');
  const rationale = qs('#rationale-panel');
  let selected = null;
  answers.forEach(btn => btn.addEventListener('click', () => {
    answers.forEach(x => x.classList.remove('selected', 'correct', 'wrong'));
    btn.classList.add('selected');
    selected = btn;
    rationale?.classList.remove('show');
  }));
  check?.addEventListener('click', () => {
    if (!selected) return;
    answers.forEach(x => x.classList.remove('correct', 'wrong'));
    selected.classList.add(selected.dataset.correct === 'true' ? 'correct' : 'wrong');
    const correct = answers.find(x => x.dataset.correct === 'true');
    correct?.classList.add('correct');
    rationale?.classList.add('show');
  });

  // Session time demo.
  const sessionTime = qs('#session-time');
  let secs = 12 * 60 + 42;
  setInterval(() => {
    secs++;
    if (sessionTime) {
      sessionTime.textContent = `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
    }
  }, 1000);

  // 3D tilt only for precision pointing devices.
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (finePointer) {
    qsa('.tilt').forEach(el => {
      const amount = Number(el.dataset.tilt || 5);
      const reset = el.classList.contains('review-device')
        ? 'rotateY(-10deg) rotateX(7deg) rotateZ(-2deg)'
        : el.classList.contains('score-float')
          ? 'rotateY(-14deg) rotateX(6deg) rotateZ(1deg)'
          : 'rotateY(-8deg) rotateX(4deg) rotateZ(-1.2deg)';
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        const rotZ = el.classList.contains('score-float') ? 1 : -.5;
        el.style.transform = `rotateY(${x * amount}deg) rotateX(${-y * amount}deg) rotateZ(${rotZ}deg)`;
      });
      el.addEventListener('mouseleave', () => el.style.transform = reset);
    });

    window.addEventListener('mousemove', e => {
      const nx = e.clientX / innerWidth - .5;
      const ny = e.clientY / innerHeight - .5;
      qsa('[data-depth]').forEach(el => {
        const d = Number(el.dataset.depth || 10);
        // Use the independent CSS translate property so the hero tablet/result
        // can share the callout motion without overwriting their 3D tilt transform.
        el.style.translate = `${nx * d}px ${ny * d}px`;
      });
    }, { passive:true });

    qsa('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width/2);
        const y = e.clientY - (r.top + r.height/2);
        el.style.transform = `translate(${x*.08}px,${y*.08}px)`;
      });
      el.addEventListener('mouseleave', () => el.style.transform = '');
    });

    qsa('.cursor-tilt').forEach(el => {
      const strength = Number(el.dataset.tiltStrength || 6);
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(1200px) rotateY(${x * strength}deg) rotateX(${-y * strength}deg)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg)';
      });
    });
  }

  // Exact continuous zero-gravity motion from the supplied bulb HTML.
  // This deliberately remains active even when reduced-motion is enabled,
  // because the floating text/arrows are part of the requested bulb behavior.
  qsa('.lightbulb-art .floating-group').forEach((group, index) => {
    const maxDx = parseFloat(group.getAttribute('data-dx')) || 5;
    const maxDy = parseFloat(group.getAttribute('data-dy')) || 5;
    const speed = parseFloat(group.getAttribute('data-speed')) || 0.0006;
    const phase = index * 1.5;

    function animateBulbCallout(time) {
      const t = time * speed + phase;
      const translateX = Math.sin(t) * maxDx;
      const translateY = Math.cos(t * 0.85) * maxDy;
      const rotate = Math.sin(t * 0.5) * 2;
      group.setAttribute('transform', `translate(${translateX}, ${translateY}) rotate(${rotate})`);
      requestAnimationFrame(animateBulbCallout);
    }

    requestAnimationFrame(animateBulbCallout);
  });

  // Typewriter behavior — restored, with fixed-position rows.
  const typeA = qs('#type-a');
  const typeB = qs('#type-b');
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const type = async (el, text, speed = 62) => {
    if (!el) return;
    for (let i = 1; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await sleep(speed);
    }
  };
  const del = async (el, speed = 36) => {
    if (!el) return;
    while (el.textContent) {
      el.textContent = el.textContent.slice(0, -1);
      await sleep(speed);
    }
  };
  async function typeLoop() {
    const first = 'Your Future starts here...';
    const lines = ['Stay POSITIVE', 'Stay DRIVEN', 'Stay READY', 'Stay FOCUSED', 'Stay DISCIPLINED'];
    while (true) {
      await type(typeA, first, 60);
      for (const line of lines) {
        await type(typeB, line, 52);
        await sleep(650);
        await del(typeB, 30);
      }
      await del(typeA, 30);
      await sleep(220);
    }
  }
  if (typeA && typeB) typeLoop();

  // Fit the longest typewriter strings to the available row width without moving the rows.
  const typeCopy = qs('.fixed-typewriter-copy');
  function fitTypewriterText() {
    if (!typeCopy) return;

    const css = getComputedStyle(typeCopy);
    const available = typeCopy.clientWidth
      - parseFloat(css.paddingLeft || 0)
      - parseFloat(css.paddingRight || 0)
      - 12; // cursor breathing room

    if (available <= 0) return;

    const vw = window.innerWidth;
    const preferred = vw <= 470 ? 30 : vw <= 760 ? 36 : vw <= 1080 ? 46 : 48;
    const samples = ['Your Future starts here...', 'Stay DISCIPLINED'];

    const probe = document.createElement('span');
    probe.style.position = 'fixed';
    probe.style.left = '-99999px';
    probe.style.top = '0';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.whiteSpace = 'nowrap';
    probe.style.fontFamily = css.fontFamily;
    probe.style.fontWeight = css.fontWeight;
    probe.style.fontStyle = css.fontStyle;
    probe.style.letterSpacing = css.letterSpacing;
    document.body.appendChild(probe);

    let size = preferred;
    probe.style.fontSize = `${size}px`;
    let widest = 0;
    samples.forEach(sample => {
      probe.textContent = sample;
      widest = Math.max(widest, probe.getBoundingClientRect().width);
    });

    if (widest > available) {
      size = Math.max(24, Math.floor(size * (available / widest) * 0.975));
    }

    typeCopy.style.fontSize = `${size}px`;
    probe.remove();
  }

  fitTypewriterText();
  window.addEventListener('resize', fitTypewriterText, { passive: true });

  // Scroll-responsive ambient motion for smoother feel.
  const ambients = qsa('.ambient');
  const onScroll = () => {
    const y = window.scrollY;
    ambients.forEach((el, i) => {
      const factor = (i + 1) * 0.06;
      el.style.transform = `translate3d(0, ${y * factor}px, 0)`;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Clinical Judgment solar-system motion — matched to the supplied reference.
(() => {
  const scene = document.querySelector('.judgment-visual');
  const planets = [...document.querySelectorAll('.judgment-visual .orbiting-node')];
  const dust = [...document.querySelectorAll('.judgment-visual .cj-dust')];
  if (!scene || !planets.length) return;

  // One complete clockwise revolution every 34 seconds, as in the reference.
  const ORBIT_SECONDS = 34;
  const start = performance.now();

  function dimensions(){
    const w = scene.clientWidth;
    const h = scene.clientHeight;
    const sample = planets[0];
    const cardW = sample ? sample.offsetWidth : 172;
    const cardH = sample ? sample.offsetHeight : 54;

    // Reference-style ellipse, constrained so every complete card remains visible.
    const rx = Math.max(110, Math.min(w * 0.36, 430, (w - cardW) / 2 - 12));
    const ry = Math.max(100, Math.min(h * 0.35, 265, (h - cardH) / 2 - 14));
    return {w,h,rx,ry};
  }

  function tick(now){
    const {w,h,rx,ry} = dimensions();
    const cx = w / 2;
    const cy = h / 2;
    const advance = ((now - start) / 1000) * (360 / ORBIT_SECONDS);

    planets.forEach((el, i) => {
      const base = Number(el.dataset.angle);
      const a = (base + advance) * Math.PI / 180;
      // Identical radius for all six stages keeps spacing mathematically equal.
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      el.style.setProperty('left', x + 'px', 'important');
      el.style.setProperty('top', y + 'px', 'important');
    });

    dust.forEach((el, i) => {
      const base = Number(el.dataset.angle);
      const r = Number(el.dataset.r);
      const speed = (i === 1 ? 1.16 : i === 2 ? 0.86 : 1);
      const a = (base + advance * speed) * Math.PI / 180;
      el.style.left = (cx + Math.cos(a) * rx * r) + 'px';
      el.style.top  = (cy + Math.sin(a) * ry * r) + 'px';
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();

// Readiness graph: play exactly once per viewport entry, then re-arm after leaving.
(() => {
  const stage = document.getElementById('readiness-graph');
  const bigPercent = document.getElementById('readiness-percent');
  const deltaText = document.getElementById('readiness-delta');
  const trackPath = document.getElementById('readiness-track');
  const progressPath = document.getElementById('readiness-progress');
  const areaPath = document.getElementById('readiness-area');
  const movingDot = document.getElementById('readiness-dot');
  const clipRect = document.getElementById('readiness-clip-rect');
  if (!stage || !bigPercent || !deltaText || !trackPath || !progressPath || !areaPath || !movingDot || !clipRect) return;

  const W = 760;
  const bottomY = 244;
  const startPercent = 63;
  const endPercent = 94;
  const values = [63, 65, 70, 69, 73, 80, 78, 84, 88, 94];
  const duration = 4300;
  let totalLength = 0;
  let rafId = 0;
  let running = false;
  let armed = true;

  function yFromPercent(p) {
    const minP = 60;
    const maxP = 100;
    const chartTop = 26;
    const chartBottom = 226;
    const ratio = (p - minP) / (maxP - minP);
    return chartBottom - ratio * (chartBottom - chartTop);
  }

  function buildPoints(vals) {
    const step = W / (vals.length - 1);
    return vals.map((v, i) => ({ x: i * step, y: yFromPercent(v) }));
  }

  function pathFromPoints(points) {
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }

  const points = buildPoints(values);
  const curve = pathFromPoints(points);
  const area = `${curve} L ${points[points.length - 1].x.toFixed(2)} ${bottomY} L ${points[0].x.toFixed(2)} ${bottomY} Z`;
  trackPath.setAttribute('d', curve);
  progressPath.setAttribute('d', curve);
  areaPath.setAttribute('d', area);

  function initializeLength() {
    totalLength = progressPath.getTotalLength();
  }

  function resetGraph() {
    if (rafId) cancelAnimationFrame(rafId);
    running = false;
    stage.classList.remove('graph-running', 'graph-complete');
    if (!totalLength) initializeLength();
    clipRect.setAttribute('width', '0');
    bigPercent.textContent = String(startPercent);
    deltaText.textContent = '↑ 0% this week';
    movingDot.style.opacity = '0';
    const p = progressPath.getPointAtLength(0);
    movingDot.setAttribute('cx', p.x.toFixed(2));
    movingDot.setAttribute('cy', p.y.toFixed(2));
  }

  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function playGraph() {
    if (running || !armed) return;
    armed = false;
    running = true;
    stage.classList.remove('graph-complete');
    stage.classList.add('graph-running');
    resetGraph();
    running = true;
    stage.classList.add('graph-running');
    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeInOutSine(t);
      const drawn = totalLength * eased;

      const currentPercent = Math.round(startPercent + (endPercent - startPercent) * eased);
      bigPercent.textContent = String(currentPercent);
      deltaText.textContent = `↑ ${currentPercent - startPercent}% this week`;

      const point = progressPath.getPointAtLength(drawn);
      // The clip edge and dot use the SAME point. This guarantees the line
      // terminates exactly underneath the moving dot at every frame.
      clipRect.setAttribute('width', Math.max(0, point.x + 0.75).toFixed(2));
      movingDot.setAttribute('cx', point.x.toFixed(2));
      movingDot.setAttribute('cy', point.y.toFixed(2));
      movingDot.style.opacity = eased < 0.01 ? '0' : '1';

      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        running = false;
        rafId = 0;
        const endPoint = progressPath.getPointAtLength(totalLength);
        clipRect.setAttribute('width', '760');
        movingDot.setAttribute('cx', endPoint.x.toFixed(2));
        movingDot.setAttribute('cy', endPoint.y.toFixed(2));
        movingDot.style.opacity = '1';
        bigPercent.textContent = String(endPercent);
        deltaText.textContent = `↑ ${endPercent - startPercent}% this week`;
        stage.classList.remove('graph-running');
        stage.classList.add('graph-complete');
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  initializeLength();
  resetGraph();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.32) {
        playGraph();
      } else if (!entry.isIntersecting) {
        // Leaving fully re-arms the animation. It will play once on the next return.
        armed = true;
        resetGraph();
      }
    });
  }, { threshold: [0, 0.32, 0.55] });

  observer.observe(stage);
})();


// V23 footer modal navigation.
(() => {
  const popup = document.getElementById('footer-popup');
  const body = document.getElementById('footer-popup-body');
  const title = document.getElementById('footer-popup-title');
  if (!popup || !body || !title) return;

  const explore = {
    experience: {
      title: 'Experience',
      html: `<div class="footer-popup-copy"><h3>Less decoration.<br>More product clarity.</h3><p>PBX is designed as a calm clinical workspace. The question stays central, the rationale appears when needed, and the review screen helps the learner immediately understand both performance and reasoning.</p><ul><li>Clear question-first interface</li><li>Rationale available in the review workflow</li><li>Results that lead directly to the next study action</li></ul></div>`
    },
    judgment: {
      title: 'Clinical Judgment',
      html: `<div class="footer-popup-copy"><h3>One decision.<br>Six cognitive skills.</h3><p>Practice follows the clinical reasoning sequence from recognizing cues through evaluation, helping learners connect what they notice with what they do next.</p><ul><li>Recognize cues</li><li>Analyze cues</li><li>Prioritize hypotheses</li><li>Generate solutions</li><li>Take action</li><li>Evaluate outcomes</li></ul></div>`
    },
    analytics: {
      title: 'Analytics',
      html: `<div class="footer-popup-copy"><h3>Know what to do<br>before you study again.</h3><p>Performance intelligence keeps readiness, timing, strengths, and weak areas visible at a glance so the next study step is easier to identify.</p><ul><li>Readiness trend</li><li>Strongest area</li><li>Needs-focus area</li><li>Session velocity</li></ul></div>`
    },
    review: {
      title: 'Review',
      html: `<div class="footer-popup-copy"><h3>Keep the goal<br>in motion.</h3><p>PBX turns results into a clear study direction instead of another dashboard to decode.</p><ul><li><strong>Missed:</strong> understand why.</li><li><strong>Marked:</strong> return with intent.</li><li><strong>Weak:</strong> build the next test.</li></ul></div>`
    },
    pricing: {
      title: 'Pricing',
      html: `<div class="footer-popup-copy"><h3>3150 questions<br>₹899</h3><p>Two-month access to the PBX Nursing question-bank plan, with a free trial available before purchase.</p><ul><li>Exam-style question interface</li><li>Question review mode with explanation</li><li>Performance tracking and analytics</li><li>Focused practice for NCLEX-RN learners</li></ul></div>`
    },
    support: {
      title: 'Support',
      html: `<div class="footer-popup-copy"><h3>PBX Nursing Support</h3><p>For account, subscription, technical, or policy-related assistance, contact PBX Nursing support.</p><p><a href="mailto:pbxnursing@gmail.com">pbxnursing@gmail.com</a></p></div>`
    }
  };

  let lastFocus = null;
  function openPopup(label, content) {
    lastFocus = document.activeElement;
    title.textContent = label;
    body.innerHTML = content;
    popup.classList.add('open');
    popup.setAttribute('aria-hidden', 'false');
    document.body.classList.add('footer-popup-open');
    const close = popup.querySelector('.footer-popup-close');
    if (close) close.focus({preventScroll:true});
  }
  function closePopup() {
    popup.classList.remove('open');
    popup.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('footer-popup-open');
    body.innerHTML = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({preventScroll:true});
  }

  document.querySelectorAll('.site-footer [data-popup-key]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const data = explore[link.dataset.popupKey];
      if (data) openPopup(data.title, data.html);
    });
  });

  document.querySelectorAll('.site-footer [data-popup-url]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const label = link.dataset.popupTitle || link.textContent.trim();
      const src = link.dataset.popupUrl;
      openPopup(label, `<iframe class="footer-popup-frame" src="${src}" title="${label.replace(/"/g,'&quot;')}"></iframe>`);
    });
  });

  popup.querySelectorAll('[data-popup-close]').forEach(el => el.addEventListener('click', closePopup));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && popup.classList.contains('open')) closePopup();
  });
})();


// V26 auto-updating numbered image carousel.
(() => {
  const root = document.getElementById('auto-photo-carousel');
  const stage = document.getElementById('auto-carousel-stage');
  const dots = document.getElementById('auto-carousel-dots');
  const empty = document.getElementById('auto-carousel-empty');
  if (!root || !stage || !dots) return;

  const MAX_IMAGES = 100;
  const CHANGE_MS = 4200;
  const RESCAN_MS = 15000;
  let sources = [];
  let slides = [];
  let current = 0;
  let cycleTimer = null;
  let scanBusy = false;

  const cleanSrc = index => `carousel-images/image${index}.png`;

  function probe(src) {
    return new Promise(resolve => {
      const img = new Image();
      const stamp = Date.now();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = `${src}?pbxscan=${stamp}`;
    });
  }

  async function discoverImages() {
    if (scanBusy) return;
    scanBusy = true;
    const found = [];
    for (let i = 1; i <= MAX_IMAGES; i++) {
      const src = cleanSrc(i);
      const exists = await probe(src);
      if (!exists) break;
      found.push(src);
    }
    scanBusy = false;

    if (found.join('|') !== sources.join('|')) {
      sources = found;
      buildSlides();
    }
  }

  function buildSlides() {
    if (cycleTimer) {
      clearInterval(cycleTimer);
      cycleTimer = null;
    }
    stage.querySelectorAll('.auto-carousel-slide').forEach(el => el.remove());
    dots.innerHTML = '';
    slides = [];
    current = 0;

    if (!sources.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    sources.forEach((src, index) => {
      const img = document.createElement('img');
      img.className = 'auto-carousel-slide' + (index === 0 ? ' is-active' : '');
      img.src = src;
      img.alt = `PBX Nursing gallery image ${index + 1}`;
      img.decoding = 'async';
      img.loading = index === 0 ? 'eager' : 'lazy';
      stage.appendChild(img);
      slides.push(img);

      const dot = document.createElement('span');
      if (index === 0) dot.classList.add('is-active');
      dots.appendChild(dot);
    });

    if (slides.length > 1) {
      cycleTimer = setInterval(nextSlide, CHANGE_MS);
    }
  }

  function nextSlide() {
    if (slides.length < 2) return;
    const oldIndex = current;
    const nextIndex = (current + 1) % slides.length;
    const oldSlide = slides[oldIndex];
    const next = slides[nextIndex];

    oldSlide.classList.remove('is-active');
    oldSlide.classList.add('is-leaving');
    next.classList.remove('is-leaving');
    next.classList.add('is-active');

    const dotEls = dots.children;
    if (dotEls[oldIndex]) dotEls[oldIndex].classList.remove('is-active');
    if (dotEls[nextIndex]) dotEls[nextIndex].classList.add('is-active');

    current = nextIndex;
    window.setTimeout(() => oldSlide.classList.remove('is-leaving'), 760);
  }

  discoverImages();
  window.setInterval(discoverImages, RESCAN_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) discoverImages();
  });
})();
