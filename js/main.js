/* ============================================================
   OM IOGA — main.js
   Sistema dinàmic: fetch JSON → injectar contingut → animar
   ============================================================ */

'use strict';

/* ─── Globals ─── */
let DATA = null;
const PAGE = detectPage();
let navInitialized = false;  // Track if nav has been initialized

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', async () => {
  /* Init EmailJS */
  if (typeof emailjs !== 'undefined') {
    emailjs.init('YOUR_EMAILJS_PUBLIC_KEY');
  }
  await loadData();
  buildNav();
  buildFooter();
  buildPage();
  initNav();
  initScrollAnimations();
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

/* ─── Text alignment helper ─── */
function getTextAlign(text) {
  const sentences = (text.match(/[.!?]/g) || []).length;
  return sentences <= 1 ? 'center' : 'justify';
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
  if (!DATA?.site?.nav) {
    console.warn('Navigation data not available');
    return;
  }

  const logo = document.getElementById('nav-logo');
  const menu = document.getElementById('nav-menu');
  if (!logo || !menu) {
    console.error('Navigation DOM elements not found');
    return;
  }

  logo.innerHTML = `<img src="assets/images/omioga-logo.png" alt="OM Ioga" class="logo-img"> <span class="logo-text">${DATA.site.name}</span>`;

  menu.innerHTML = DATA.site.nav.map(item => {
    const href = item.href;
    const current = isCurrentPage(href) ? ' class="active"' : '';
    return `<li><a href="${href}"${current}>${item.label}</a></li>`;
  }).join('');
  
  // Initialize nav immediately after building it
  initNav();
}

function isCurrentPage(href) {
  const file = window.location.pathname.split('/').pop() || 'index.html';
  return file === href || (href === 'index.html' && (file === '' || file === 'index.html'));
}

/* ─── Nav behaviours ─── */
function initNav() {
  // Prevent double initialization
  if (navInitialized) return;
  navInitialized = true;

  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');

  if (!nav || !toggle || !menu) {
    console.error('Navigation elements not found', { nav: !!nav, toggle: !!toggle, menu: !!menu });
    navInitialized = false;  // Reset so it can try again
    return;
  }

  /* Scroll → sticky style */
  const onScroll = () => {
    nav?.classList.toggle('scrolled', window.scrollY > 30);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Hamburger - click handler */
  const toggleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const isOpen = menu.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };
  
  toggle.addEventListener('click', toggleClick);

  /* Close menu on link click */
  const closeMenuHandler = () => {
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    document.body.style.overflow = '';
  };

  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', closeMenuHandler);
  });

  /* Close menu when clicking outside */
  const outsideClickHandler = (e) => {
    if (!nav?.contains(e.target) && menu?.classList.contains('open')) {
      closeMenuHandler();
    }
  };
  document.addEventListener('click', outsideClickHandler);
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
          <a href="preus.html#prova">Classe gratuïta</a>
        </div>
        <div class="footer-nav">
          <h5>${DATA.site.footer.legal_label}</h5>
          <a href="politica-privacitat.html">Política de Privacitat</a>
          <a href="condicions.html">Condicions Generals</a>
        </div>
      </div>
      <div class="footer-social">
        ${DATA.site.social ? `
        <a href="${DATA.site.social.instagram}" target="_blank" rel="noopener noreferrer" aria-label="Instagram OM Ioga" class="footer-social-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          Instagram
        </a>
        <a href="${DATA.site.social.facebook}" target="_blank" rel="noopener noreferrer" aria-label="Facebook OM Ioga" class="footer-social-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          Facebook
        </a>
        ` : ''}
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
    case 'politica-privacitat': buildPoliticaPrivacitat(); break;
    // activitats has its own loader in activitats.html
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
          <p class="home-hero__desc reveal stagger-3" style="text-align: ${getTextAlign(h.hero.description)};">${h.hero.description}</p>
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
        <span>${h.scroll_hint}</span>
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
            <p class="reveal stagger-2" style="text-align: ${getTextAlign(h.intro.text)};">${h.intro.text}</p>
            <p class="intro-highlight reveal stagger-3" style="text-align: ${getTextAlign(h.intro.highlight)};">${h.intro.highlight}</p>
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
          <span class="pretitle reveal">${h.pillars_section.pretitle}</span>
          <h2 class="reveal stagger-1">${h.pillars_section.title}</h2>
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
          ${h.quote.text}
          <cite class="quote-attribution">${h.quote.attribution}</cite>
        </blockquote>
      </div>
    </section>

    
    <!-- CTA -->
    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Comença avui</span>
        <h2 class="reveal stagger-1">${h.cta_section.title}</h2>
        <p class="reveal stagger-2" style="text-align: ${getTextAlign(h.cta_section.text)};">${h.cta_section.text}</p>
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
      <p style="text-align: ${getTextAlign(v.text)};">${v.text}</p>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="intro-grid">
          <div>
            <span class="pretitle reveal">${p.professor_label}</span>
            <h3 class="reveal stagger-1" style="margin-bottom: 1.5rem;">${p.professor_name}</h3>
            ${p.bio.paragraphs.map((par, i) => `
              <p class="reveal stagger-${Math.min(i + 1, 5)}" style="margin-bottom: 0.8rem; font-size: 1rem; text-align: justify;">${par}</p>
            `).join('')}
          </div>
          <div class="reveal-right" style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; align-content: start;">
            ${p.images.gallery.slice(0, 2).map((img, i) => `
              <div style="overflow: hidden; border-radius: var(--radius-lg); width: 100%; aspect-ratio: 4/3;">
                <img src="${img}" alt="Foto ${i + 1}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
            `).join('')}
          </div>
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

    ${p.credentials ? `
    <section style="background: var(--white); padding: var(--section-gap) 0;">
      <div class="container">
        <div class="section-header">
          <span class="pretitle reveal">Trajectòria</span>
          <h2 class="reveal stagger-1">${p.credentials.title}</h2>
          <span class="divider reveal stagger-2"></span>
        </div>
        <div class="credentials-timeline">
          ${p.credentials.items.map((item, i) => `
            <div class="credential-item reveal stagger-${(i % 3) + 1}">
              <div class="credential-year">${item.year}</div>
              <div class="credential-content">
                <div class="credential-title">${item.title}</div>
                <div class="credential-place">${item.place}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    ` : ''}

    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Comença avui</span>
        <h2 class="reveal stagger-1">Primera classe gratuïta</h2>
        <p class="reveal stagger-2" style="text-align: center;">S'ofereix una classe de prova gratuïta. Si la persona s'inscriu, aquella classe queda inclosa en la mensualitat; si no, no té cap cost.</p>
        <a href="preus.html#prova" class="btn btn-gold reveal stagger-3">Reserva la classe de prova</a>
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
              <p class="reveal stagger-${i + 1}" style="margin-bottom:1.2rem; font-size:1.05rem; text-align: ${getTextAlign(par)};">${par}</p>
            `).join('')}
          </div>
          <div class="reveal-right" style="display: flex; justify-content: center; align-items: center;">
            ${p.intro.gallery ? p.intro.gallery.map(img => `
              <div style="overflow: hidden; border-radius: var(--radius-lg); width: 100%;">
                <img src="${img}" alt="Foto introducció" loading="lazy" style="width: 100%; height: auto; object-fit: cover;">
              </div>
            `).join('') : ''}
          </div>
        </div>

        <div class="origin-block reveal" style="margin-top:4rem;">
          <h3>${p.origin.title}</h3>
          <p style="text-align: ${getTextAlign(p.origin.text)};">${p.origin.text}</p>
          <p class="origin-highlight" style="text-align: ${getTextAlign(p.origin.highlight)};">${p.origin.highlight}</p>
        </div>

        <div class="reveal" style="margin-top:3rem;">
          <h3>${p.breath.title}</h3>
          <p style="text-align: ${getTextAlign(p.breath.text)};">${p.breath.text}</p>
        </div>
      </div>
    </section>

    <section style="background: var(--cream-dark); padding: var(--section-gap) 0;">
      <div class="container">
        <div class="section-header">
          <span class="pretitle reveal">${p.images.gallery_pretitle}</span>
          <h2 class="reveal stagger-1">${p.images.gallery_heading}</h2>
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
        <h2 class="reveal stagger-1">Primera classe gratuïta</h2>
        <p class="reveal stagger-2" style="text-align: center;">S'ofereix una classe de prova gratuïta. Si la persona s'inscriu, aquella classe queda inclosa en la mensualitat; si no, no té cap cost.</p>
        <a href="preus.html#prova" class="btn btn-gold reveal stagger-3">Reserva la classe de prova</a>
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
      <p style="text-align: justify;">${f.text}</p>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="intro-grid classes-layout">
          <div style="flex: 1;">
            <span class="pretitle reveal">La pràctica</span>
            <h2 class="reveal stagger-1" style="margin-bottom:1.5rem;">${p.description.title}</h2>
            ${p.description.paragraphs.map((par, i) => `
              <p class="reveal stagger-${i + 1}" style="margin-bottom:0.8rem; font-size:1rem; text-align: ${getTextAlign(par)};">${par}</p>
            `).join('')}
          </div>
          <div class="reveal-right" style="flex: 1; display: grid; grid-template-columns: repeat(${Math.min(p.images.gallery.length, 3)}, 1fr); gap: 1.5rem; align-content: start;">
            ${p.images.gallery.slice(0, 3).map((img, i) => `
              <div style="overflow: hidden; border-radius: var(--radius-lg); width: 100%; aspect-ratio: ${p.images.gallery.length === 2 ? '3/4' : '1'};">
                <img src="${img}" alt="Foto classe ${i + 1}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>

    <section style="background: var(--cream-dark); padding-top: var(--section-gap);">
      <div class="container">
        <div class="section-header">
          <span class="pretitle reveal">${p.features_section.pretitle}</span>
          <h2 class="reveal stagger-1">${p.features_section.title}</h2>
          <span class="divider reveal stagger-2"></span>
        </div>
        <div class="features-grid">
          ${featuresHtml}
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Comença avui</span>
        <h2 class="reveal stagger-1">Primera classe gratuïta</h2>
        <p class="reveal stagger-2" style="text-align: center;">S'ofereix una classe de prova gratuïta. Si la persona s'inscriu, aquella classe queda inclosa en la mensualitat; si no, no té cap cost.</p>
        <a href="preus.html#prova" class="btn btn-gold reveal stagger-3">Reserva la classe de prova</a>
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
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="section-header">
          <p class="reveal" style="font-size:1.05rem; color: var(--text); text-align: ${getTextAlign(p.intro)};">${p.intro}</p>
        </div>

        <div class="schedule-modern-grid">
          ${scheduleHtml}
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Comença avui</span>
        <h2 class="reveal stagger-1">Primera classe gratuïta</h2>
        <p class="reveal stagger-2" style="text-align: center;">S'ofereix una classe de prova gratuïta. Si la persona s'inscriu, aquella classe queda inclosa en la mensualitat; si no, no té cap cost.</p>
        <a href="preus.html#prova" class="btn btn-gold reveal stagger-3">Reserva la classe de prova</a>
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
      ${plan.highlight ? `<span class="plan-badge">${p.monthly.plan_badge}</span>` : ''}
      <div class="plan-frequency">${plan.days}</div>
      <div class="plan-price">${plan.price}</div>
      <div class="plan-period">per ${plan.al || 'mes'}</div>
      <a href="contacte.html" class="btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'} plan-cta">${p.monthly.plan_cta}</a>
    </div>
  `).join('');

  const bonusHtml = p.bonus.packs.map((b, i) => `
    <div class="bonus-pack-card reveal stagger-${i + 1}">
      <div class="bonus-value">${b.classes}</div>
      <div class="bonus-amount">${b.price}</div>
      <small class="bonus-subtitle">${p.bonus.expiry_text.split('els 3')[0]}3 mesos</small>
    </div>
  `).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section style="background: var(--white);">
      <div class="container">
        <div class="pricing-intro reveal">
          <p style="font-size: 1.1rem; max-width: 700px; margin: 0 auto 4rem; text-align: ${getTextAlign(p.intro)};">${p.intro}</p>
        </div>

        <div style="margin-bottom: 6rem;">
          <div class="section-header" style="margin-bottom: 3.5rem;">
            <span class="pretitle reveal">${p.monthly.title}</span>
            <h2 class="reveal stagger-1">${p.monthly.section_heading}</h2>
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
          <span class="pretitle reveal">${p.bonus.section_pretitle}</span>
          <h2 class="reveal stagger-1">${p.bonus.title}</h2>
          <p class="reveal stagger-2">${p.bonus.description}</p>
          <span class="divider reveal stagger-3"></span>
        </div>

        <div class="bonus-packs-grid">
          ${bonusHtml}
        </div>

        <p style="text-align: ${getTextAlign(p.bonus.expiry_text)}; margin-top: 2.5rem; color: var(--text-light); font-size: 0.9rem;">
          ${p.bonus.expiry_text}
        </p>
      </div>
    </section>

    <section id="prova" style="background: var(--white);">
      <div class="container">
        <div class="trial-offer-banner reveal">
          <div class="banner-content">
            <h3>${p.trial.title}</h3>
            <p style="text-align: ${getTextAlign(p.trial.text)};">${p.trial.text}</p>
          </div>
          <a href="${p.trial.cta.href}" class="btn btn-primary">${p.trial.cta.label}</a>
        </div>

        <div style="text-align: center; margin-top: 4rem; padding: 3rem 2rem; background: var(--cream-dark); border-radius: var(--radius-lg);">
          <h3 style="color: var(--green-deep); margin-bottom: 1rem;">${p.group_section.heading}</h3>
          <p style="max-width: 500px; margin: 0 auto 1.5rem; text-align: ${getTextAlign(p.group_section.description)};">${p.group_section.description}</p>
          <a href="contacte.html" class="btn btn-secondary">${p.group_section.cta}</a>
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
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section>
      <div class="container">
        <div style="max-width:800px; margin:0 auto;">
          <div class="conditions-sections">
            ${sectionsHtml}
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <span class="pretitle reveal">Comença avui</span>
        <h2 class="reveal stagger-1">Primera classe gratuïta</h2>
        <p class="reveal stagger-2" style="text-align: center;">S'ofereix una classe de prova gratuïta. Si la persona s'inscriu, aquella classe queda inclosa en la mensualitat; si no, no té cap cost.</p>
        <a href="preus.html#prova" class="btn btn-gold reveal stagger-3">Reserva la classe de prova</a>
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
            <span class="pretitle">${p.form.contact_section_label}</span>
            <h2>${p.form.contact_heading}</h2>
            <span class="divider divider--left"></span>
            <p style="text-align: ${getTextAlign(p.intro)};">${p.intro}</p>
            <div class="contact-details">
              <div class="contact-detail">
                <div class="contact-detail-icon">${iconSVG('map-pin')}</div>
                <div>
                  <div class="contact-detail-label">${p.form.contact_labels.address}</div>
                  <div class="contact-detail-value">${c.address}<br>${c.city}</div>
                </div>
              </div>
              <div class="contact-detail">
                <div class="contact-detail-icon">${iconSVG('phone')}</div>
                <div>
                  <div class="contact-detail-label">${p.form.contact_labels.phone}</div>
                  <div class="contact-detail-value">
                    <a href="tel:${c.phone.replace(/\s/g, '')}">${c.phone}</a>
                  </div>
                </div>
              </div>
              <div class="contact-detail">
                <div class="contact-detail-icon">${iconSVG('mail')}</div>
                <div>
                  <div class="contact-detail-label">${p.form.contact_labels.email}</div>
                  <div class="contact-detail-value">
                    <a href="mailto:${c.email}">${c.email}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="contact-form reveal-right">
            <div id="form-error" class="form-error" style="display:none;">
              ${iconSVG('info')} <span id="form-error-msg">${p.form.error_default}</span>
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
          <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4220.684078064807!2d1.6233069312679351!3d41.58062021065152!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12a46906e610f471%3A0xb78510dcf5bc2fcb!2sOM%20Ioga!5e0!3m2!1sca!2ses!4v1778142754192!5m2!1sca!2ses" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
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
      errorMsg.textContent = p.form.error_required;
      errorBox.style.display = 'flex';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorMsg.textContent = p.form.error_email;
      errorBox.style.display = 'flex';
      return;
    }

    errorBox.style.display = 'none';

    const trialChecked = form.querySelector('#trial')?.checked;
    const trialText = trialChecked ? 'Sí, vol la classe de prova gratuïta' : 'No';
    const templateParams = {
      from_name: nom,
      email: email,
      message: missatge,
      trial_class: trialText,
    };

    submitBtn.disabled = true;
    if (btnLabel) btnLabel.textContent = p.form.cta_sending;

    // Recopilar tota la informació del formulari
    const telefon = form.querySelector('#telefon')?.value.trim() || 'No indicat';

    // 1️⃣ Enviar auto-reply al usuari
    emailjs.send('service_6mo98ao', 'template_iom0av9', templateParams)
      .then(() => {
        // 2️⃣ Enviar tota la informació completa al propietari
        const completeInfo = `

          INFORMACIÓ DE CONTACTE           
=========================================

👤 NOM:
${nom}

📧 CORREU ELECTRÒNIC:
${email}

☎️  TELÈFON:
${telefon}

🧘 INTERÉS EN CLASSE DE PROVA:
${trialText}

─────────────────────────────────────────────

📝 MISSATGE:

${missatge}

═════════════════════════════════════════════`;

        const contactParams = {
          name: nom,
          email: email,
          message: completeInfo,
        };
        return emailjs.send('service_6mo98ao', 'template_zszdxdl', contactParams);
      })
      .then(() => {
        form.style.display = 'none';
        success.style.display = 'block';
      })
      .catch(err => {
        console.error('EmailJS error:', err);
        submitBtn.disabled = false;
        if (btnLabel) btnLabel.textContent = p.form.cta;
        errorMsg.textContent = p.form.error_send;
        errorBox.style.display = 'flex';
      });
  });
}

/* ═══════════════════════════════════════════
   POLITICA PRIVACITAT
═══════════════════════════════════════════ */
function buildPoliticaPrivacitat() {
  const p = DATA.pages['politica-privacitat'];
  const main = document.getElementById('main');
  if (!main || !p) return;

  const sectionsHtml = p.sections.map((sec, i) => {
    // Agrupar seciones per type per visual
    const isResponsability = i === 0;
    const isDades = i >= 1 && i <= 3;
    const isDrets = i === 6;
    const isSeguretat = i === 7;
    
    let groupClass = 'general';
    if (isResponsability) groupClass = 'responsibility';
    if (isDades) groupClass = 'data';
    if (isDrets) groupClass = 'rights';
    if (isSeguretat) groupClass = 'security';

    return `
    <div class="policy-section policy-section--${groupClass} reveal stagger-${(i % 3) + 1}">
      <h3>${sec.title}</h3>
      <ul class="policy-list">
        ${sec.items.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `}).join('');

  main.innerHTML = `
    <section class="page-hero" aria-label="${p.hero.title}">
      <div class="container">
        <span class="pretitle reveal">${p.hero.pretitle}</span>
        <h1 class="reveal stagger-1">${p.hero.title}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section class="policy-intro-section">
      <div class="container">
        <div class="policy-intro-box reveal">
          <p class="policy-intro-text">${p.intro}</p>
        </div>
      </div>
    </section>

    <section>
      <div class="container">
        <div style="max-width:900px; margin:0 auto;">
          <div class="policy-sections">
            ${sectionsHtml}
          </div>
        </div>
      </div>
    </section>

    <section class="policy-contact-section">
      <div class="container">
        <div class="policy-contact-box reveal">
          <h3>Tenim preguntes?</h3>
          <p>Si tens qualsevol pregunta sobre aquesta política de privacitat o sobre com tractem les teves dades:</p>
          <div class="contact-details">
            <div class="contact-item">
              <strong>Email:</strong> omiogaigualada@gmail.com
            </div>
            <div class="contact-item">
              <strong>Telèfon:</strong> 623 01 39 35
            </div>
            <div class="contact-item">
              <strong>Adreça:</strong> Carrer de les Gardènies, 20, baixos. 08700 Igualada, Barcelona.
            </div>
          </div>
          <p class="policy-footer-note">Última actualització: ${new Date().toLocaleDateString('ca-ES')}</p>
        </div>
      </div>
    </section>
  `;
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
      
      // Close mobile menu before navigation
      const toggle = document.getElementById('nav-toggle');
      const menu = document.getElementById('nav-menu');
      if (toggle && menu) {
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('open');
        document.body.style.overflow = '';
      }
      
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

/* ═══════════════════════════════════════════
   ACTIVITATS
═══════════════════════════════════════════ */
function buildActivitats(actData) {
  const main = document.getElementById('main');
  if (!main) return;

  if (!actData) {
    main.innerHTML = `
      <section class="page-hero" aria-label="Activitats">
        <div class="container">
          <span class="pretitle reveal">Més enllà de les classes</span>
          <h1 class="reveal stagger-1">Activitats</h1>
          <span class="divider reveal stagger-2"></span>
        </div>
      </section>
      <section style="background: var(--white);">
        <div class="container">
          <div class="activitat-empty">
            <span class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="24" cy="16" rx="4" ry="7" fill="#2D5A4B"/>
              <ellipse cx="14" cy="20" rx="3.5" ry="6.5" transform="rotate(-35 14 20)" fill="#4A8A72" opacity="0.75"/>
              <ellipse cx="34" cy="20" rx="3.5" ry="6.5" transform="rotate(35 34 20)" fill="#4A8A72" opacity="0.75"/>
              <ellipse cx="8" cy="26" rx="3" ry="6" transform="rotate(-55 8 26)" fill="#7AB8A0" opacity="0.5"/>
              <ellipse cx="40" cy="26" rx="3" ry="6" transform="rotate(55 40 26)" fill="#7AB8A0" opacity="0.5"/>
              <path d="M24 28 Q22 36 20 42" stroke="#2D5A4B" stroke-width="1.5" stroke-linecap="round" fill="none"/>
              <path d="M22 36 Q16 32 18 28 Q22 32 22 36Z" fill="#4A8A72" opacity="0.6"/>
            </svg>
          </span>
            <h2>Aquest mes no hi han activitats</h2>
            <p>Properament s'anunciaran noves activitats i tallers. Segueix-nos per estar al dia!</p>
          </div>
        </div>
      </section>`;
    return;
  }

  const a = actData.activitat_actual;
  const hasActivity = a && a.image && a.image.trim() !== '';

  const currentSection = hasActivity ? `
    <div class="activitat-card reveal">
      <img src="${a.image}" alt="${a.titol || 'Activitat'}">
      <div class="activitat-info">
        <h2>${a.titol || ''}</h2>
        <div class="activitat-meta">
          ${a.data  ? `<span> Dia:  <b>${a.data}</b></span>` : ''}
          ${a.hora  ? `<span> Hora: <b>${a.hora}</b></span>` : ''}
          ${a.lloc  ? `<span> Lloc: <b>${a.lloc}</b></span>` : ''}
        </div>
        ${a.descripcio ? `<p class="descripcio">${a.descripcio}</p>` : ''}
        ${a.preu ? `<div class="activitat-preu">${a.preu}</div>` : ''}
        ${a.cta ? `<a href="${a.cta.href}" class="btn btn-primary">${a.cta.label}</a>` : ''}
      </div>
    </div>
  ` : `
    <div class="activitat-empty">
      <span class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="24" cy="16" rx="4" ry="7" fill="#2D5A4B"/>
          <ellipse cx="14" cy="20" rx="3.5" ry="6.5" transform="rotate(-35 14 20)" fill="#4A8A72" opacity="0.75"/>
          <ellipse cx="34" cy="20" rx="3.5" ry="6.5" transform="rotate(35 34 20)" fill="#4A8A72" opacity="0.75"/>
          <ellipse cx="8" cy="26" rx="3" ry="6" transform="rotate(-55 8 26)" fill="#7AB8A0" opacity="0.5"/>
          <ellipse cx="40" cy="26" rx="3" ry="6" transform="rotate(55 40 26)" fill="#7AB8A0" opacity="0.5"/>
          <path d="M24 28 Q22 36 20 42" stroke="#2D5A4B" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <path d="M22 36 Q16 32 18 28 Q22 32 22 36Z" fill="#4A8A72" opacity="0.6"/>
        </svg>
      </span>
      <h2>Aquest mes no hi han activitats</h2>
      <p>Properament s'anunciaran noves activitats i tallers. Segueix-nos per estar al dia!</p>
    </div>
  `;

  const g = actData.galeria_anterior;
  const galleryHtml = g && g.fotos && g.fotos.length > 0
    ? `<section style="background: var(--cream-dark);">
        <div class="container">
          <div class="section-header" style="margin-bottom: 3rem;">
            <span class="pretitle reveal">Memòria</span>
            <h2 class="reveal stagger-1">${g.titol || 'Activitats anteriors'}</h2>
            <span class="divider reveal stagger-2"></span>
          </div>
          <div class="activitats-gallery">
            ${g.fotos.slice(0, 6).map((f, i) => `
              <img src="${f.src}" alt="${f.alt || 'Activitat anterior'}" class="reveal stagger-${(i % 3) + 1}" loading="lazy">
            `).join('')}
          </div>
        </div>
      </section>`
    : '';

  main.innerHTML = `
    <section class="page-hero" aria-label="${actData.hero?.title || 'Activitats'}">
      <div class="container">
        <span class="pretitle reveal">${actData.hero?.pretitle || 'Més enllà de les classes'}</span>
        <h1 class="reveal stagger-1">${actData.hero?.title || 'Activitats'}</h1>
        <span class="divider reveal stagger-2"></span>
      </div>
    </section>

    <section style="background: var(--white);">
      <div class="container">
        ${currentSection}
      </div>
    </section>

    ${galleryHtml}
  `;

  // Update page meta
  if (actData.meta) {
    if (actData.meta.title) document.title = actData.meta.title;
    if (actData.meta.description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
      m.content = actData.meta.description;
    }
  }

  // Re-run scroll animations for new content
  setTimeout(() => initScrollAnimations(), 100);
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
