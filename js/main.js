/* ============================================================
   OM IOGA — main.js
   Sistema dinàmic: fetch JSON → injectar contingut → animar
   ============================================================ */

'use strict';

/* ─── Globals ─── */
let DATA = null;
const PAGE = detectPage();

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  buildNav();
  buildFooter();
  buildPage();
  initNav();
  initScrollAnimations();
  initCarousel();
  initPageTransitions();

  /* Reveal body after all content is built */
  document.body.style.opacity = '1';
});

/* ─── Detect current page ─── */
function detectPage() {
  const path = window.location.pathname;
  const file = path.split('/').pop() || 'index.html';
  if (file === '' || file === 'index.html') return 'home';
  return file.replace('.html', '');
}

/* ─── Load JSON ─── */
async function loadData() {
  try {
    const res = await fetch('data/content.json');
    DATA = await res.json();
  } catch (e) {
    console.warn('No s\'ha pogut carregar content.json. Assegura\'t que el servidor és actiu.');
    DATA = {};
  }
}

/* ─── Navigation ─── */
function buildNav() {
  if (!DATA?.site?.nav) return;

  const logo = document.getElementById('nav-logo');
  const menu = document.getElementById('nav-menu');
  if (!logo || !menu) return;

  logo.innerHTML = `<img src="assets/images/omioga-logo.png" alt="OM Ioga" class="logo-img"> <span class="logo-text">${DATA.site.name}</span>`;

  menu.innerHTML = DATA.site.nav.map(item => {
    const href = item.href;
    const current = isCurrentPage(href) ? ' class="active"' : '';
    return `<li><a href="${href}"${current}>${item.label}</a></li>`;
  }).join('');
}

function isCurrentPage(href) {
  const file = window.location.pathname.split('/').pop() || 'index.html';
  return file === href || (href === 'index.html' && (file === '' || file === 'index.html'));
}

/* ─── Nav behaviours ─── */
function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');

  /* Scroll → sticky style */
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Hamburger */
  toggle?.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  /* Close menu on link click */
  menu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      toggle?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ─── Footer ─── */
function buildFooter() {
  const footer = document.getElementById('footer');
  if (!footer || !DATA?.site) return;

  const { contact, nav, footer: ft, name } = DATA.site;

  const navHtml = nav.map(item =>
    `<a href="${item.href}">${item.label}</a>`
  ).join('');

  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="nav-logo" href="index.html">
            <img src="assets/images/logo-fondo-blanc.png" alt="OM Ioga" class="logo-img"> <span class="logo-text">${name}</span>
          </a>
          <p class="footer-tagline">${ft.tagline}</p>
          <div class="footer-contact-item">
            ${iconSVG('map-pin')}
            <span>${contact.address}, ${contact.city}</span>
          </div>
          <div class="footer-contact-item">
            ${iconSVG('phone')}
            <a href="tel:${contact.phone.replace(/\s/g, '')}">${contact.phone}</a>
          </div>
          <div class="footer-contact-item">
            ${iconSVG('mail')}
            <a href="mailto:${contact.email}">${contact.email}</a>
          </div>
        </div>
        <div class="footer-nav">
          <h5>${DATA.site.footer.nav_label}</h5>
          ${navHtml}
        </div>
        <div class="footer-nav">
          <h5>${DATA.site.footer.centre_label}</h5>
          <a href="classes.html">Les classes</a>
          <a href="preus.html">Preus</a>
          <a href="condicions.html">Condicions</a>
          <a href="contacte.html">Classe gratuïta</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>${ft.copy}</span>
        <span class="footer-om">OM</span>
      </div>
    </div>
  `;
}

/* ─── Page builder dispatcher ─── */
function buildPage() {
  switch (PAGE) {
    case 'home': buildHome(); break;
    case 'qui-soc': buildQuiSoc(); break;
    case 'tipus-ioga': buildTipusIoga(); break;
    case 'classes': buildClasses(); break;
    case 'horaris': buildHoraris(); break;
    case 'preus': buildPreus(); break;
    case 'condicions': buildCondicions(); break;
    case 'contacte': buildContacte(); break;
  }
  updateDocMeta();
}

/* ─── Update page meta ─── */
function updateDocMeta() {
  if (!DATA?.pages) return;
  const p = DATA.pages[PAGE];
  if (p?.meta?.title) document.title = p.meta.title;
  if (p?.meta?.description) {
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
    m.content = p.meta.description;
  }
}

/* ═══════════════════════════════════════════
   HOME
═══════════════════════════════════════════ */
function buildHome() {
  const h = DATA.pages.home;
  const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = `

    <!-- Hero -->
    <section class="home-hero" aria-label="Benvinguda">
      <div class="home-hero__bg" aria-hidden="true"></div>
      <div class="container">
        <div class="home-hero__content">
          <span class="pretitle reveal">${h.hero.pretitle}</span>
          <h1 class="reveal stagger-1">${h.hero.title}</h1>
          <span class="home-hero__subtitle reveal stagger-2">${h.hero.subtitle}</span>
          <p class="home-hero__desc reveal stagger-3">${h.hero.description}</p>
          <div class="hero-ctas reveal stagger-4">
            <a href="${h.hero.cta_primary.href}" class="btn btn-primary">${h.hero.cta_primary.label}</a>
            <a href="${h.hero.cta_secondary.href}" class="btn btn-secondary">${h.hero.cta_secondary.label}</a>
          </div>
        </div>
      </div>
      <div class="home-hero__tree" aria-hidden="true">
        <img src="${h.images.hero}" alt="">
      </div>
      <div class="scroll-hint" aria-hidden="true">
        <div class="scroll-hint__line"></div>
        <span>Descobreix</span>
      </div>
    </section>

    <!-- Intro -->
    <section class="intro-section">
      <div class="container">
        <div class="intro-grid">
          <div class="intro-text">
            <span class="pretitle reveal">${DATA.site.name}</span>
            <h2 class="reveal stagger-1">${h.intro.title}</h2>
            <span class="divider divider--left reveal stagger-2"></span>
            <img src="${h.images.middle}" alt="" class="middle-image">
            <p class="reveal stagger-2">${h.intro.text}</p>
            <p class="intro-highlight reveal stagger-3">${h.intro.highlight}</p>
          </div>
          <div class="intro-visual reveal-right">
            ${buildLeafCluster()}
          </div>
        </div>
      </div>
    </section>

    <!-- Pillars -->
    <section class="pillars-section">
      <div class="container">
        <div class="section-header">
          <span class="pretitle reveal">La pràctica</span>
          <h2 class="reveal stagger-1">Tres pilars fonamentals</h2>
          <span class="divider reveal stagger-2"></span>
        </div>
        <div class="pillars-grid">
          ${h.pillars.map((p, i) => `
            <div class="pillar-card reveal stagger-${i + 1}">
              ${getPillarIcon(p.icon)}
              <h3>${p.title}</h3>
              <p>${p.text}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Quote -->
    <section class="quote-section">
      <div class="container">
        <span class="quote-mark" aria-hidden="true">"</span>
        <blockquote class="reveal">
          "${h.quote.text}"
          <cite class="quote-attribution">${h.quote.attribution}</cite>
        </blockquote>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Comença avui</span>
        <h2 class="reveal stagger-1">${h.cta_section.title}</h2>
        <p class="reveal stagger-2">${h.cta_section.text}</p>
        <a href="${h.cta_section.cta.href}" class="btn btn-gold reveal stagger-3">${h.cta_section.cta.label}</a>
      </div>
    </section>
  `;
}

/* ═══════════════════════════════════════════
   QUI SOC
═══════════════════════════════════════════ */
function buildQuiSoc() {
  const p = DATA.pages['qui-soc'];
  const main = document.getElementById('main');
  if (!main) return;

  const valuesHtml = p.values.items.map((v, i) => `
    <div class="value-item reveal stagger-${i + 1}">
      <h4>${v.title}</h4>
      <p>${v.text}</p>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <img src="${p.images.hero}" alt="" class="hero-bg-image">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="bio-split">
          ${(() => {
      const gallery = p.images.gallery || [];
      const paragraphs = p.bio.paragraphs || [];
      const maxLen = Math.max(paragraphs.length, gallery.length);
      let html = '';
      for (let i = 0; i < maxLen; i++) {
        if (paragraphs[i]) html += `<p class="bio-item bio-item--text reveal stagger-${Math.min(i + 1, 5)}">${paragraphs[i]}</p>`;
        if (gallery[i]) html += `<img src="${gallery[i]}" alt="Foto ${i + 1}" class="bio-item bio-item--img">`;
      }
      return html;
    })()}
        </div>
      </div>
    </section>

    <section style="padding-top:0; background: var(--cream-dark); padding-bottom: var(--section-gap);">
      <div class="container">
        <div class="section-header">
          <span class="pretitle reveal">Valors</span>
          <h2 class="reveal stagger-1">${p.values.title}</h2>
          <span class="divider reveal stagger-2"></span>
        </div>
        <div class="values-grid">
          ${valuesHtml}
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Benvingut</span>
        <h2 class="reveal stagger-1">Vine a conèixer l'espai</h2>
        <p class="reveal stagger-2">La primera classe és gratuïta i sense compromís. Descobreix si el ioga és per a tu.</p>
        <a href="contacte.html" class="btn btn-gold reveal stagger-3">Reserva la classe de prova</a>
      </div>
    </section>
  `;
}

/* ═══════════════════════════════════════════
   TIPUS DE IOGA
═══════════════════════════════════════════ */
function buildTipusIoga() {
  const p = DATA.pages['tipus-ioga'];
  const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <img src="${p.images.hero}" alt="" class="hero-bg-image">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="intro-gallery-grid">
          <div style="max-width: 100%;">
            <span class="pretitle reveal">${p.intro.title}</span>
            ${p.intro.paragraphs.map((par, i) => `
              <p class="reveal stagger-${i + 1}" style="margin-bottom:1.2rem; font-size:1.05rem;">${par}</p>
              ${i === 0 ? `<img src="${p.images.middle}" alt="" class="middle-image">` : ''}
            `).join('')}
          </div>
          <div class="reveal-right" style="display: flex; justify-content: center; align-items: center;">
            ${p.intro.gallery ? p.intro.gallery.map(img => `
              <div style="overflow: hidden; border-radius: var(--radius-lg); width: 100%;">
                <img src="${img}" alt="Foto introducció" style="width: 100%; height: auto; object-fit: cover;">
              </div>
            `).join('') : ''}
          </div>
        </div>

        <div class="origin-block reveal" style="margin-top:4rem;">
          <h3>${p.origin.title}</h3>
          <p>${p.origin.text}</p>
          <p class="origin-highlight">${p.origin.highlight}</p>
        </div>

        <div class="origin-block reveal" style="margin-top:3rem;">
          <h3>${p.breath.title}</h3>
          <p>${p.breath.text}</p>
        </div>
      </div>
    </section>

    <section style="background: var(--cream-dark); padding: var(--section-gap) 0;">
      <div class="container">
        <div class="section-header">
          <span class="pretitle reveal">Galeria</span>
          <h2 class="reveal stagger-1">Moments del centre</h2>
        </div>
        <div class="gallery-3col-grid">
          ${p.images.gallery.map((img, i) => `
            <div class="reveal stagger-${(i % 3) + 1}" style="overflow: hidden; border-radius: var(--radius-lg);">
              <img src="${img}" alt="Foto ${i + 1}" style="width: 100%; height: 300px; object-fit: cover;">
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Comença avui</span>
        <h2 class="reveal stagger-1">Prova una classe gratuïta</h2>
        <p class="reveal stagger-2">Ven a descobrir el ioga sense compromís. La primera classe és totalment gratuïta.</p>
        <a href="contacte.html" class="btn btn-gold reveal stagger-3">Reserva ara</a>
      </div>
    </section>
  `;
}

/* ═══════════════════════════════════════════
   CLASSES
═══════════════════════════════════════════ */
function buildClasses() {
  const p = DATA.pages.classes;
  const main = document.getElementById('main');
  if (!main) return;

  const featuresHtml = p.features.map((f, i) => `
    <div class="feature-item reveal stagger-${(i % 3) + 1}">
      <div class="feature-icon">${getFeatureIcon(i)}</div>
      <h4>${f.title}</h4>
      <p>${f.text}</p>
    </div>
  `).join('');

  const stepsHtml = p.structure.steps.map((s, i) => `
    <div class="step-item reveal stagger-${i + 1}">
      <div class="step-num">${s.num}</div>
      <div class="step-content">
        <h4>${s.title}</h4>
        <p>${s.text}</p>
      </div>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <img src="${p.images.hero}" alt="" class="hero-bg-image">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="intro-grid classes-layout" style="flex-direction: row-reverse;">
          <div>
            <span class="pretitle reveal">La pràctica</span>
            <h2 class="reveal stagger-1" style="margin-bottom:2rem;">${p.description.title}</h2>
            ${p.description.paragraphs.map((par, i) => `
              <p class="reveal stagger-${i + 1}" style="margin-bottom:1.2rem; font-size:1.02rem;">${par}</p>
            `).join('')}
          </div>
          <div class="reveal-right" style="display:flex;justify-content:flex-start;align-items:flex-start; flex-direction: column; gap: 2rem;">
            ${p.images.gallery.slice(0, 2).map((img, i) => `
              <div style="overflow: hidden; border-radius: var(--radius-lg); width: 100%;">
                <img src="${img}" alt="Foto classe ${i + 1}" style="width: 100%; height: auto; object-fit: cover;">
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>

    <section style="background: var(--cream-dark); padding-top: var(--section-gap);">
      <div class="container">
        <div class="section-header">
          <span class="pretitle reveal">Característiques</span>
          <h2 class="reveal stagger-1">Allò que fa especial cada sessió</h2>
          <span class="divider reveal stagger-2"></span>
        </div>
        <div class="features-grid">
          ${featuresHtml}
        </div>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="section-header">
          <span class="pretitle reveal">Com funciona</span>
          <h2 class="reveal stagger-1">${p.structure.title}</h2>
          <span class="divider reveal stagger-2"></span>
        </div>
        <div class="steps-list">
          ${stepsHtml}
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Sense compromís</span>
        <h2 class="reveal stagger-1">Primera classe gratuïta</h2>
        <p class="reveal stagger-2">Vine a conèixer el centre i la teva professora. Sense pressió, sense obligació.</p>
        <a href="contacte.html" class="btn btn-gold reveal stagger-3">Reserva ara</a>
      </div>
    </section>
  `;
}

/* ═══════════════════════════════════════════
   HORARIS
═══════════════════════════════════════════ */
function buildHoraris() {
  const p = DATA.pages.horaris;
  const main = document.getElementById('main');
  if (!main) return;

  const scheduleHtml = p.schedule.map((day, i) => `
    <div class="schedule-day-card reveal stagger-${(i % 3) + 1}">
      <div class="schedule-day-header">
        <h3 class="schedule-day-name">${day.day}</h3>
      </div>
      <div class="schedule-slots">
        ${day.slots.map(slot => `
          <div class="schedule-slot">
            <div class="slot-time-badge">${slot.time}</div>
            <div class="slot-info">
              <div class="slot-type">${slot.type}</div>
              <span class="slot-level">${slot.level}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <img src="${p.images.hero}" alt="" class="hero-bg-image">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="section-header">
          <p class="reveal" style="font-size:1.05rem; color: var(--text);">${p.intro}</p>
          <img src="${p.images.middle}" alt="" class="middle-image">
        </div>

        <div class="schedule-modern-grid">
          ${scheduleHtml}
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Comença la teva pràctica</span>
        <h2 class="reveal stagger-1">Reserva la teva plaça</h2>
        <p class="reveal stagger-2">Els grups són reduïts per assegurar una experiència personalitzada. Contacta'ns per confirmar disponibilitat.</p>
        <a href="contacte.html" class="btn btn-gold reveal stagger-3">Reserva classe gratuïta</a>
      </div>
    </section>
  `;
}

/* ═══════════════════════════════════════════
   PREUS
═══════════════════════════════════════════ */
function buildPreus() {
  const p = DATA.pages.preus;
  const main = document.getElementById('main');
  if (!main) return;

  const plansHtml = p.monthly.plans.map((plan, i) => `
    <div class="price-plan-card ${plan.highlight ? 'featured-plan' : ''} reveal stagger-${i + 1}">
      ${plan.highlight ? '<span class="plan-badge">Més popular</span>' : ''}
      <div class="plan-frequency">${plan.days}</div>
      <div class="plan-price">${plan.price}</div>
      <div class="plan-period">per ${plan.al || 'mes'}</div>
      <a href="contacte.html" class="btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'} plan-cta">Comença ara</a>
    </div>
  `).join('');

  const bonusHtml = p.bonus.packs.map((b, i) => `
    <div class="bonus-pack-card reveal stagger-${i + 1}">
      <div class="bonus-value">${b.classes}</div>
      <div class="bonus-amount">${b.price}</div>
      <small class="bonus-subtitle">Vàlid 3 mesos</small>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <img src="${p.images.hero}" alt="" class="hero-bg-image">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section style="background: var(--white);">
      <div class="container">
        <div class="pricing-intro reveal">
          <p style="font-size: 1.1rem; max-width: 700px; margin: 0 auto 4rem;">${p.intro}</p>
          <img src="${p.images.middle}" alt="" class="middle-image">
        </div>

        <div style="margin-bottom: 6rem;">
          <div class="section-header" style="margin-bottom: 3.5rem;">
            <span class="pretitle reveal">${p.monthly.title}</span>
            <h2 class="reveal stagger-1">Classes regulars</h2>
          </div>

          <div class="pricing-plans-grid">
            ${plansHtml}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 3rem;" class="pricing-options-grid">
            <div class="price-option-card reveal">
              <h4>${p.single.title}</h4>
              <div class="option-price">${p.single.price}</div>
              <p class="option-desc">${p.single.description}</p>
            </div>
            <div class="price-option-card reveal stagger-1">
              <h4>${p.maintenance.title}</h4>
              <div class="option-price">${p.maintenance.price}</div>
              <p class="option-desc">${p.maintenance.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section style="background: var(--cream-dark);">
      <div class="container">
        <div class="section-header">
          <span class="pretitle reveal">Flexibilitat màxima</span>
          <h2 class="reveal stagger-1">${p.bonus.title}</h2>
          <p class="reveal stagger-2">${p.bonus.description}</p>
          <span class="divider reveal stagger-3"></span>
        </div>

        <div class="bonus-packs-grid">
          ${bonusHtml}
        </div>

        <p style="text-align: center; margin-top: 2.5rem; color: var(--text-light); font-size: 0.9rem;">
          Els bonus caduquen als 3 mesos de la seva compra.
        </p>
      </div>
    </section>

    <section style="background: var(--white);">
      <div class="container">
        <div class="trial-offer-banner reveal">
          <div class="banner-content">
            <h3>${p.trial.title}</h3>
            <p>${p.trial.text}</p>
          </div>
          <a href="${p.trial.cta.href}" class="btn btn-primary">${p.trial.cta.label}</a>
        </div>

        <div style="text-align: center; margin-top: 4rem; padding: 3rem 2rem; background: var(--cream-dark); border-radius: var(--radius-lg);">
          <h3 style="color: var(--green-deep); margin-bottom: 1rem;">Per a grups i empreses</h3>
          <p style="max-width: 500px; margin: 0 auto 1.5rem;">Interessat en plans personalitzats per a grups o empreses? Contacta'ns!</p>
          <a href="contacte.html" class="btn btn-secondary">Consulta'ns</a>
        </div>
      </div>
    </section>
  `;
}

/* ═══════════════════════════════════════════
   CONDICIONS
═══════════════════════════════════════════ */
function buildCondicions() {
  const p = DATA.pages.condicions;
  const main = document.getElementById('main');
  if (!main) return;

  const sectionsHtml = p.sections.map((sec, i) => `
    <div class="condition-section reveal stagger-${(i % 3) + 1}">
      <h3>${sec.title}</h3>
      <ul class="conditions-list">
        ${sec.items.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <img src="${p.images.hero}" alt="" class="hero-bg-image">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section>
      <div class="container">
        <div style="max-width:800px; margin:0 auto;">
          <img src="${p.images.middle}" alt="" class="middle-image">
          <div class="conditions-sections">
            ${sectionsHtml}
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Alguna pregunta?</span>
        <h2 class="reveal stagger-1">Estem aquí per ajudar-te</h2>
        <p class="reveal stagger-2">Si tens qualsevol dubte sobre les condicions o el funcionament del centre, contacta'ns.</p>
        <a href="contacte.html" class="btn btn-gold reveal stagger-3">Contacta'ns</a>
      </div>
    </section>
  `;
}

/* ═══════════════════════════════════════════
   CONTACTE
═══════════════════════════════════════════ */
function buildContacte() {
  const p = DATA.pages.contacte;
  const c = DATA.site.contact;
  const main = document.getElementById('main');
  if (!main) return;

  const fieldsHtml = p.form.fields.map(field => {
    if (field.type === 'textarea') {
      return `
        <div class="form-group">
          <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
          <textarea id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}
            placeholder="${field.placeholder || ''}"></textarea>
        </div>
      `;
    }
    return `
      <div class="form-group">
        <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
        <input type="${field.type}" id="${field.name}" name="${field.name}"
          ${field.required ? 'required' : ''} />
      </div>
    `;
  }).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <img src="${p.images.hero}" alt="" class="hero-bg-image">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="contact-layout">
          <div class="contact-info reveal-left">
            <span class="pretitle">Parlem</span>
            <h2>Posa't en contacte</h2>
            <span class="divider divider--left"></span>
            <p>${p.intro}</p>
            <img src="${p.images.middle}" alt="" class="middle-image" style="margin: 2rem 0;">
            <div class="contact-details">
              <div class="contact-detail">
                <div class="contact-detail-icon">${iconSVG('map-pin')}</div>
                <div>
                  <div class="contact-detail-label">Adreça</div>
                  <div class="contact-detail-value">${c.address}<br>${c.city}</div>
                </div>
              </div>
              <div class="contact-detail">
                <div class="contact-detail-icon">${iconSVG('phone')}</div>
                <div>
                  <div class="contact-detail-label">Telèfon</div>
                  <div class="contact-detail-value">
                    <a href="tel:${c.phone.replace(/\s/g, '')}">${c.phone}</a>
                  </div>
                </div>
              </div>
              <div class="contact-detail">
                <div class="contact-detail-icon">${iconSVG('mail')}</div>
                <div>
                  <div class="contact-detail-label">Correu</div>
                  <div class="contact-detail-value">
                    <a href="mailto:${c.email}">${c.email}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="contact-form reveal-right">
            <div id="form-error" class="form-error" style="display:none;">
              ${iconSVG('info')} <span id="form-error-msg">Hi ha hagut un error. Torna-ho a intentar.</span>
            </div>
            <form id="contact-form" novalidate>
              ${fieldsHtml}
              <label class="form-checkbox">
                <input type="checkbox" id="trial" name="trial">
                <span>${p.form.trial_label}</span>
              </label>
              <button type="submit" class="form-submit">
                ${iconSVG('send')} <span class="btn-label">${p.form.cta}</span>
              </button>
            </form>
            <div class="form-success" id="form-success">
              ${iconSVG('check-circle')}
              <p>${p.form.success}</p>
            </div>
          </div>
        </div>

        <div class="map-container reveal">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2990.5!2d1.5870!3d41.5774!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12a47a6d8a8a8a8d%3A0x1a1a1a1a1a1a1a1a!2sCarrer%20de%20les%20Garden%C3%A8nies%2C%2020%2C%2008700%20Igualada!5e0!3m2!1sca!2ses!4v1700000000000!5m2!1sca!2ses"
            width="100%" height="360" style="border:0;" allowfullscreen=""
            loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            title="Mapa OM Ioga - Carrer de les Gardènies 20, Igualada">
          </iframe>
        </div>
      </div>
    </section>
  `;

  /* Form submit handler — EmailJS */
  document.getElementById('contact-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('.form-submit');
    const btnLabel = submitBtn.querySelector('.btn-label');
    const success = document.getElementById('form-success');
    const errorBox = document.getElementById('form-error');
    const errorMsg = document.getElementById('form-error-msg');

    /* Client-side validation */
    const nom = form.querySelector('#nom')?.value.trim();
    const emailField = form.querySelector('#email') || form.querySelector('[type="email"]');
    const email = emailField?.value.trim();
    const missatge = form.querySelector('#missatge')?.value.trim();

    console.log('Form values:', { nom, email, emailField, missatge });

    if (!nom || !email || !missatge) {
      errorMsg.textContent = 'Si us plau, omple els camps obligatoris (nom, correu i missatge).';
      errorBox.style.display = 'flex';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorMsg.textContent = 'El correu electrònic no és vàlid.';
      errorBox.style.display = 'flex';
      return;
    }

    errorBox.style.display = 'none';

    const trialChecked = form.querySelector('#trial')?.checked;
    const templateParams = {
      from_name: nom,
      email: email,
    };

    submitBtn.disabled = true;
    if (btnLabel) btnLabel.textContent = 'Enviant...';

    emailjs.send('service_6mo98ao', 'template_iom0av9', templateParams)
      .then(() => {
        form.style.display = 'none';
        success.style.display = 'block';
      })
      .catch(err => {
        console.error('EmailJS error:', err);
        submitBtn.disabled = false;
        if (btnLabel) btnLabel.textContent = 'Envia el missatge';
        errorMsg.textContent = 'Error en enviar. Si us plau, contacta\'ns per telèfon o correu directament.';
        errorBox.style.display = 'flex';
      });
  });
}

/* ═══════════════════════════════════════════
   SCROLL ANIMATIONS
═══════════════════════════════════════════ */
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  setTimeout(() => {
    document.querySelectorAll('.reveal, .reveal-scale, .reveal-left, .reveal-right').forEach(el => {
      observer.observe(el);
    });
  }, 50);
}

/* ═══════════════════════════════════════════
   CAROUSEL
═══════════════════════════════════════════ */
function initCarousel() {
  const carousels = document.querySelectorAll('.carousel-wrapper');

  carousels.forEach(carousel => {
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    const dots = carousel.querySelectorAll('.carousel-dot');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;
    let autoplayInterval;

    const updateCarousel = (index) => {
      currentIndex = (index + slides.length) % slides.length;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
    };

    const goToSlide = (index) => { updateCarousel(index); resetAutoplay(); };
    const nextSlide = () => goToSlide(currentIndex + 1);
    const prevSlide = () => goToSlide(currentIndex - 1);
    const startAutoplay = () => { autoplayInterval = setInterval(nextSlide, 8000); };
    const resetAutoplay = () => { clearInterval(autoplayInterval); startAutoplay(); };

    prevBtn?.addEventListener('click', prevSlide);
    nextBtn?.addEventListener('click', nextSlide);
    dots.forEach(dot => dot.addEventListener('click', e => goToSlide(parseInt(e.target.dataset.slide))));

    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; clearInterval(autoplayInterval); }, false);
    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
      startAutoplay();
    }, false);

    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });

    startAutoplay();
  });
}

/* ═══════════════════════════════════════════
   PAGE TRANSITIONS
═══════════════════════════════════════════ */
function initPageTransitions() {
  const overlay = document.getElementById('page-transition');
  if (!overlay) return;

  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (link.target === '_blank') return;

    link.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      overlay.classList.add('active');
      setTimeout(() => { window.location.href = href; }, 350);
    });
  });
}

/* ═══════════════════════════════════════════
   SVG HELPERS
═══════════════════════════════════════════ */
function iconSVG(name) {
  const icons = {
    'map-pin': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    'phone': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.28a2 2 0 0 1 1.95-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    'mail': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    'send': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    'check-circle': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    'info': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" style="display:inline;width:16px;height:16px;vertical-align:middle;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };
  return icons[name] || '';
}

function getPillarIcon(type) {
  const icons = {
    breath: `<svg class="pillar-icon" viewBox="0 0 48 48" fill="none" stroke="#4A6C52" stroke-width="1.5" stroke-linecap="round">
      <path d="M24 8 C24 8, 10 20, 10 28 C10 35 16 40 24 40 C32 40 38 35 38 28 C38 20 24 8 24 8Z"/>
      <path d="M24 20 L24 32"/>
      <path d="M18 26 L24 20 L30 26"/>
    </svg>`,
    body: `<svg class="pillar-icon" viewBox="0 0 48 48" fill="none" stroke="#4A6C52" stroke-width="1.5" stroke-linecap="round">
      <circle cx="24" cy="10" r="4"/>
      <line x1="24" y1="14" x2="24" y2="30"/>
      <path d="M14 20 L24 17 L34 20"/>
      <path d="M24 30 L18 40"/>
      <path d="M24 30 L30 40"/>
    </svg>`,
    mind: `<svg class="pillar-icon" viewBox="0 0 48 48" fill="none" stroke="#4A6C52" stroke-width="1.5" stroke-linecap="round">
      <path d="M12 24 C12 16, 18 10, 24 10 C34 10 36 18 36 24 C36 34 24 40 24 40 C24 40 24 34 20 30 C16 26 12 28 12 24Z"/>
      <path d="M24 22 C26 18 30 16 32 18"/>
    </svg>`
  };
  return icons[type] || '';
}

function getFeatureIcon(index) {
  const icons = [
    `<svg viewBox="0 0 32 32" fill="none" stroke="#4A6C52" stroke-width="1.5" stroke-linecap="round"><circle cx="16" cy="16" r="10"/><path d="M12 16 L15 19 L20 13"/></svg>`,
    `<svg viewBox="0 0 32 32" fill="none" stroke="#4A6C52" stroke-width="1.5" stroke-linecap="round"><path d="M6 16 C6 10 10 6 16 6 C22 6 26 10 26 16 C26 22 22 26 16 26"/><path d="M16 10 L16 16 L20 20"/></svg>`,
    `<svg viewBox="0 0 32 32" fill="none" stroke="#4A6C52" stroke-width="1.5" stroke-linecap="round"><path d="M16 4 C16 4, 6 14 6 20 C6 24 10 28 16 28 C22 28 26 24 26 20 C26 14 16 4 16 4Z"/></svg>`,
    `<svg viewBox="0 0 32 32" fill="none" stroke="#4A6C52" stroke-width="1.5" stroke-linecap="round"><circle cx="16" cy="16" r="8"/><circle cx="16" cy="16" r="3"/><line x1="16" y1="4" x2="16" y2="8"/><line x1="16" y1="24" x2="16" y2="28"/><line x1="4" y1="16" x2="8" y2="16"/><line x1="24" y1="16" x2="28" y2="16"/></svg>`,
    `<svg viewBox="0 0 32 32" fill="none" stroke="#4A6C52" stroke-width="1.5" stroke-linecap="round"><path d="M8 8 C12 8 12 24 16 24 C20 24 20 8 24 8"/><line x1="6" y1="16" x2="26" y2="16"/></svg>`,
    `<svg viewBox="0 0 32 32" fill="none" stroke="#4A6C52" stroke-width="1.5" stroke-linecap="round"><path d="M6 10 L16 6 L26 10 L26 20 C26 25 21 28 16 30 C11 28 6 25 6 20Z"/></svg>`
  ];
  return icons[index % icons.length];
}

/* ─── Leaf cluster decorative ─── */
function buildLeafCluster() {
  return `
  <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" style="width:300px;" aria-hidden="true">
    <circle cx="160" cy="160" r="130" fill="none" stroke="#C8DCC8" stroke-width="1" stroke-dasharray="4 6" opacity="0.5"/>
    <circle cx="160" cy="160" r="100" fill="none" stroke="#C8DCC8" stroke-width="1" opacity="0.3"/>
    <g class="leaf-animate">
      ${leaf(160, 60, 28, '#4A6C52')} ${leaf(220, 90, 24, '#5C8C5C')} ${leaf(250, 155, 22, '#6A9470')}
      ${leaf(220, 220, 24, '#4A7A4A')} ${leaf(160, 255, 26, '#5C8864')}
    </g>
    <g class="leaf-animate-2">
      ${leaf(100, 220, 24, '#6A9C6A')} ${leaf(68, 155, 22, '#4A6C52')} ${leaf(100, 90, 24, '#7AAA7A')}
      ${leaf(140, 72, 20, '#5C7A5C')} ${leaf(185, 72, 20, '#6A9470')}
    </g>
    <circle cx="160" cy="160" r="18" fill="#F5F3EE" stroke="#C8DCC8" stroke-width="1.5"/>
    <text x="160" y="166" text-anchor="middle" font-family="serif" font-size="16" fill="#2A4130" opacity="0.6">ॐ</text>
  </svg>`;
}

function leaf(cx, cy, r, color) {
  const rx = r;
  const ry = r * 0.55;
  const rot = (Math.sin(cx * 0.3) * 30 - 15);
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="0.88" transform="rotate(${rot}, ${cx}, ${cy})"/>`;
}
