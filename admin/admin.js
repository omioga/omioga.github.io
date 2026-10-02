/* ============================================================
   OM IOGA — Panell de control (admin.js)
   Edita data/content.json i les imatges directament a GitHub.

   Seguretat:
   - El token de GitHub mai es desa en clar. Es xifra amb AES-GCM 256
     amb una clau derivada de l'usuari + contrasenya (PBKDF2-SHA256,
     600.000 iteracions) i només es guarda el resultat xifrat a
     admin/auth.json. Sense l'usuari i la contrasenya correctes és
     impossible obtenir el token i, per tant, impossible modificar res.
   - Un cop dins, el token només viu a la memòria de la pestanya.
   - Bloqueig automàtic per inactivitat i retard creixent en errors.
   ============================================================ */

'use strict';

(() => {

/* Anti-clickjacking: el panell no es pot carregar dins d'un iframe */
if (window.top !== window.self) {
  document.documentElement.innerHTML = '';
  return;
}

/* ════════════════════════════════════════════
   CONFIGURACIÓ
════════════════════════════════════════════ */
const DEFAULT_REPO = { owner: 'omioga', repo: 'omioga.github.io', branch: 'main' };
const CONTENT_PATH = 'data/content.json';
const IMAGES_DIR   = 'assets/images';
const AUTH_PATH    = 'admin/auth.json';
const KDF_ITERATIONS = 600000;
const AAD = 'omioga-admin-v1';
const LOCK_AFTER_MS = 30 * 60 * 1000;
const MIN_PASSWORD = 12;
const IMG_RE = /\.(jpe?g|png|webp|gif|svg|avif)$/i;
const PROTECTED_IMAGES = {
  'assets/images/omioga-logo.png': 'Logo del menú (codi del web)',
  'assets/images/logo-fondo-blanc.png': 'Logo del peu de pàgina i icona (codi del web)',
  'assets/images/centre1.jpg': 'Imatge per compartir a xarxes (codi del web)'
};

const PAGE_INFO = {
  'home':                { name: 'Inici',                  icon: 'home',     file: 'index.html',               desc: 'La primera pàgina que veu la gent: benvinguda, pilars, cita i bloc final.' },
  'qui-soc':             { name: 'Qui sóc',                icon: 'user',     file: 'qui-soc.html',             desc: 'La professora: biografia, fotos, filosofia d\'ensenyament i formació.' },
  'tipus-ioga':          { name: 'El ioga',                icon: 'leaf',     file: 'tipus-ioga.html',          desc: 'Què és el ioga, l\'origen, la respiració i la galeria del centre.' },
  'classes':             { name: 'Les classes',            icon: 'layers',   file: 'classes.html',             desc: 'Com són les classes i què fa especial cada sessió.' },
  'horaris':             { name: 'Horaris',                icon: 'clock',    file: 'horaris.html',             desc: 'L\'horari setmanal: dies, hores i tipus de classe.' },
  'activitats':          { name: 'Activitats',             icon: 'calendar', file: 'activitats.html',          desc: 'L\'activitat o taller actual i la galeria d\'activitats anteriors.' },
  'preus':               { name: 'Preus',                  icon: 'euro',     file: 'preus.html',               desc: 'Quotes mensuals, classe sola, manteniment, bonus i classe de prova.' },
  'condicions':          { name: 'Condicions',             icon: 'list',     file: 'condicions.html',          desc: 'Les normes i condicions generals del centre.' },
  'contacte':            { name: 'Contacte',               icon: 'mail',     file: 'contacte.html',            desc: 'Textos de la pàgina de contacte i del formulari.' },
  'politica-privacitat': { name: 'Política de privacitat', icon: 'shield',   file: 'politica-privacitat.html', desc: 'El text legal sobre el tractament de dades personals.' }
};

/* Etiquetes amigables. La clau és el final del camí (els índexs de llista són "*").
   Es busca primer la coincidència més llarga. */
const LABELS = {
  /* generals */
  'title': 'Títol', 'subtitle': 'Subtítol', 'pretitle': 'Pretítol', 'text': 'Text', 'description': 'Descripció',
  'label': 'Text', 'href': 'Enllaç', 'cta': 'Botó', 'cta_primary': 'Botó principal', 'cta_secondary': 'Botó secundari',
  'highlight': 'Text destacat', 'paragraphs': 'Paràgrafs', 'gallery': 'Galeria d\'imatges', 'items': 'Elements',
  'intro': 'Introducció', 'hero': 'Capçalera de la pàgina', 'images': 'Imatges', 'meta': 'Google i pestanya del navegador',
  'heading': 'Títol', 'name': 'Nom', 'price': 'Preu', 'icon': 'Icona', 'image': 'Imatge', 'src': 'Imatge', 'alt': 'Descripció de la imatge',
  'sections': 'Apartats', 'year': 'Any', 'place': 'Lloc', 'type': 'Tipus', 'level': 'Nivell', 'time': 'Hora',
  'meta.title': 'Títol (pestanya i Google)', 'meta.description': 'Descripció per a Google',
  'hero.pretitle': 'Pretítol (text petit damunt del títol)', 'hero.title': 'Títol gran',
  'cta.label': 'Text del botó', 'cta.href': 'Enllaç del botó',
  'cta_primary.label': 'Text del botó', 'cta_primary.href': 'Enllaç del botó',
  'cta_secondary.label': 'Text del botó', 'cta_secondary.href': 'Enllaç del botó',

  /* guia */
  '_GUIDE_': 'Guia del fitxer', '_MENU': 'Menú de la guia',

  /* textos comuns */
  'global_labels': 'Textos comuns',
  'cta_section_pretitle': 'Bloc final — pretítol', 'cta_section_title': 'Bloc final — títol',
  'cta_section_desc': 'Bloc final — text', 'cta_button': 'Bloc final — text del botó',
  'values_section_pretitle': 'Qui sóc — pretítol de «Filosofia»', 'credentials_section_pretitle': 'Qui sóc — pretítol de «Formació»',
  'activities_empty_title': 'Activitats — títol quan no n\'hi ha', 'activities_empty_desc': 'Activitats — text quan no n\'hi ha',
  'activities_gallery_pretitle': 'Activitats — pretítol de la galeria anterior', 'activities_gallery_title': 'Activitats — títol de la galeria anterior',
  'privacy_contact_section_title': 'Privacitat — títol del bloc de preguntes',

  /* site */
  'site': 'Dades generals del web', 'site.name': 'Nom del centre', 'site.tagline': 'Eslògan', 'site.description': 'Descripció del centre',
  'contact': 'Dades de contacte', 'contact.address': 'Adreça', 'contact.city': 'Codi postal i ciutat', 'contact.phone': 'Telèfon', 'contact.email': 'Correu electrònic',
  'nav': 'Menú de navegació', 'nav.*.label': 'Text al menú', 'nav.*.href': 'Pàgina on porta',
  'footer': 'Peu de pàgina', 'footer.tagline': 'Frase del peu de pàgina', 'footer.copy': 'Text de copyright',
  'footer.nav_label': 'Títol de la columna «Navegació»', 'footer.centre_label': 'Títol de la columna «El centre»', 'footer.legal_label': 'Títol de la columna «Legal»',
  'social': 'Xarxes socials', 'social.instagram': 'Instagram (enllaç)', 'social.facebook': 'Facebook (enllaç)',

  /* home */
  'images.hero': 'Imatge de la capçalera', 'images.middle': 'Imatge de la introducció',
  'scroll_hint': 'Text sota la capçalera («Descobreix»)',
  'home.hero': 'Capçalera de benvinguda', 'home.hero.subtitle': 'Subtítol', 'home.hero.description': 'Text de benvinguda',
  'home.intro': 'Introducció', 'home.intro.highlight': 'Frase destacada',
  'pillars_section': 'Pilars — encapçalament', 'pillars': 'Els tres pilars', 'pillars.*.icon': 'Icona',
  'quote': 'Cita', 'quote.text': 'Text de la cita', 'quote.attribution': 'Autoria de la cita',
  'cta_section': 'Bloc final (classe de prova)', 'cta_section.text': 'Text',

  /* qui soc */
  'professor_name': 'Nom de la professora', 'professor_label': 'Text petit damunt del nom',
  'bio': 'Biografia', 'bio.paragraphs': 'Paràgrafs de la biografia',
  'values': 'Filosofia d\'ensenyament', 'values.title': 'Títol de la secció', 'values.items': 'Valors',
  'credentials': 'Formació (cronologia)', 'credentials.title': 'Títol de la secció', 'credentials.items': 'Etapes',
  'credentials.items.*.title': 'Què', 'credentials.items.*.place': 'On',

  /* tipus ioga */
  'gallery_pretitle': 'Galeria — pretítol', 'gallery_heading': 'Galeria — títol',
  'intro.gallery': 'Imatge al costat de la introducció', 'intro.title': 'Títol',
  'origin': 'L\'origen (Kṛṣṇamacarya)', 'origin.highlight': 'Text destacat',
  'breath': 'La respiració (Prāṇāyāma)',

  /* classes */
  'classes.description': 'Descripció de les classes', 'features_section': 'Característiques — encapçalament', 'features': 'Característiques',

  /* horaris */
  'horaris.intro': 'Text d\'introducció', 'schedule': 'Horari setmanal', 'schedule.*.day': 'Dia de la setmana', 'schedule.*.slots': 'Classes d\'aquest dia',
  'slots.*.time': 'Hora (inici – final)', 'slots.*.type': 'Tipus de classe', 'slots.*.level': 'Nivell',

  /* preus */
  'preus.intro': 'Text d\'introducció', 'maintenance': 'Quota de manteniment', 'monthly': 'Quotes mensuals',
  'monthly.title': 'Pretítol de la secció', 'monthly.section_heading': 'Títol de la secció', 'plans': 'Plans mensuals',
  'plans.*.days': 'Nom del pla / freqüència', 'plans.*.price': 'Preu', 'plans.*.al': 'Període («per …»)', 'plans.*.highlight': 'Destacar aquest pla',
  'plan_badge': 'Etiqueta del pla destacat', 'plan_cta': 'Text del botó dels plans',
  'single': 'Classe sola', 'bonus': 'Bonus trimestrals', 'bonus.section_pretitle': 'Pretítol de la secció', 'bonus.expiry_text': 'Text petit sota els bonus',
  'packs': 'Packs de bonus', 'packs.*.classes': 'Nom del pack', 'packs.*.price': 'Preu',
  'group_section': 'Grups i empreses', 'group_section.cta': 'Text del botó', 'trial': 'Classe de prova gratuïta',

  /* condicions / privacitat */
  'sections.*.title': 'Títol de l\'apartat', 'sections.*.items': 'Punts de l\'apartat',
  'politica-privacitat.intro': 'Text d\'introducció',

  /* contacte */
  'contacte.intro': 'Text d\'introducció', 'form': 'Formulari de contacte',
  'contact_section_label': 'Pretítol del bloc', 'contact_heading': 'Títol del bloc',
  'fields': 'Camps del formulari', 'fields.*.name': 'Nom intern', 'fields.*.label': 'Etiqueta visible', 'fields.*.type': 'Tipus de camp',
  'fields.*.required': 'Camp obligatori', 'fields.*.placeholder': 'Text d\'exemple dins del camp',
  'form.cta': 'Text del botó «Enviar»', 'cta_sending': 'Text mentre s\'envia', 'success': 'Missatge d\'enviament correcte',
  'trial_label': 'Text de la casella «classe de prova»', 'error_default': 'Error genèric', 'error_required': 'Error: camps obligatoris',
  'error_email': 'Error: correu no vàlid', 'error_send': 'Error en enviar',
  'email_labels': 'Etiquetes del correu que reps', 'info_header': 'Capçalera', 'name_label': 'Nom', 'email_label': 'Correu',
  'phone_label': 'Telèfon', 'trial_label_email': 'Interès en classe de prova', 'message_label': 'Missatge',
  'contact_labels': 'Etiquetes de les dades de contacte', 'contact_labels.address': 'Etiqueta «Adreça»',
  'contact_labels.phone': 'Etiqueta «Telèfon»', 'contact_labels.email': 'Etiqueta «Correu»',

  /* activitats */
  'activitat_actual': 'Activitat actual', 'activitat_actual.image': 'Cartell / imatge de l\'activitat', 'titol': 'Títol', 'data': 'Dia',
  'hora': 'Hora', 'lloc': 'Lloc', 'descripcio': 'Descripció', 'preu': 'Preu',
  'galeria_anterior': 'Galeria d\'activitats anteriors', 'fotos': 'Fotos', 'fotos.*.src': 'Foto', 'fotos.*.alt': 'Descripció de la foto'
};

const HINTS = {
  'pretitle': 'Text petit que surt damunt del títol.',
  'meta.title': 'Surt a la pestanya del navegador i com a títol als resultats de Google. Recomanat: menys de 60 caràcters.',
  'meta.description': 'Surt sota el títol als resultats de Google. Recomanat: entre 120 i 160 caràcters.',
  'site.name': 'Surt al costat del logo (menú i peu de pàgina) i com a pretítol de la introducció de l\'Inici.',
  'contact.address': 'Surt al peu de pàgina i a la pàgina de Contacte. Atenció: la Política de privacitat té l\'adreça escrita al seu text; si la canvies, revisa-la també allà.',
  'contact.city': 'Surt al peu de pàgina i a la pàgina de Contacte.',
  'contact.phone': 'Surt al peu de pàgina i a Contacte (es pot clicar per trucar). Atenció: la Política de privacitat també té el telèfon escrit al seu text.',
  'contact.email': 'Surt al peu de pàgina i a Contacte. Atenció: la Política de privacitat també té el correu escrit al seu text.',
  'nav': 'Aquest menú surt a dalt de totes les pàgines i també al peu de pàgina.',
  'footer.copy': 'Surt a la part de baix de tot de cada pàgina.',
  'cta_section_pretitle': 'Surt al bloc final de: Inici, Qui sóc, El ioga, Les classes i Horaris.',
  'cta_section_title': 'Surt al bloc final de: Inici, Qui sóc, El ioga, Les classes i Horaris.',
  'cta_section_desc': 'Surt al bloc final de: Qui sóc, El ioga, Les classes i Horaris. (L\'Inici té el seu propi text a la pàgina Inici → Bloc final.)',
  'cta_button': 'Surt al bloc final de: Qui sóc, El ioga, Les classes i Horaris. (L\'Inici té el seu propi botó.)',
  'activities_empty_title': 'Surt a Activitats quan l\'activitat actual no té imatge.',
  'activities_empty_desc': 'Surt a Activitats quan l\'activitat actual no té imatge.',
  'activities_gallery_pretitle': 'Només surt si hi ha fotos a Activitats → Galeria d\'activitats anteriors.',
  'activities_gallery_title': 'Només surt si hi ha fotos a Activitats → Galeria d\'activitats anteriors.',
  'home.cta_section': 'El pretítol i el títol d\'aquest bloc es canvien a «Textos comuns».',
  'home.hero.cta_secondary': 'L\'enllaç «preus.html#prova» porta directament a la classe de prova de la pàgina Preus.',
  'pillars.*.icon': 'Dibuix que surt damunt del pilar.',
  'quote.text': 'Pots fer servir <br> per fer un salt de línia.',
  'qui-soc.images.gallery': 'Es mostren les 2 primeres imatges al costat de la biografia.',
  'classes.images.gallery': 'Es mostren fins a 3 imatges al costat de la descripció.',
  'tipus-ioga.images.gallery': 'Galeria «Moments del centre».',
  'horaris.images.gallery': 'Actualment la pàgina Horaris no mostra aquesta galeria.',
  'preus.images.gallery': 'Actualment la pàgina Preus no mostra aquesta galeria.',
  'contacte.images.gallery': 'Actualment la pàgina Contacte no mostra aquesta galeria.',
  'slots.*.type': 'Ex.: «Meditació» o «Autopràctica». Si es deixa buit, només surt l\'hora.',
  'slots.*.level': 'Actualment aquest camp no es mostra al web.',
  'plans.*.highlight': 'Si està activat, el pla surt destacat amb l\'etiqueta «Més popular».',
  'plans.*.al': 'Surt com «per mes». Si es deixa buit també surt «per mes».',
  'maintenance.price': 'Atenció: aquest preu també surt escrit a Condicions → Pagaments.',
  'single.price': 'Atenció: aquest preu també surt escrit a Condicions → Pagaments.',
  'bonus.expiry_text': 'Text petit sota els packs. Si es deixa buit, no surt.',
  'trial.text': 'Atenció: el mateix text surt a «Textos comuns → Bloc final — text».',
  'fields.*.name': 'Nom intern del camp. No el canviïs als camps nom, email, telefon i missatge: el formulari els fa servir per enviar-te el correu.',
  'email_labels': 'Aquests textos no surten al web: són les etiquetes del correu que reps quan algú omple el formulari.',
  'activitat_actual.image': 'Important: l\'activitat només es mostra al web si té imatge. Sense imatge surt el missatge «Aquest mes no hi han activitats» (es canvia a Textos comuns).',
  'galeria_anterior.fotos': 'Es mostren fins a 6 fotos. El títol d\'aquesta secció es canvia a Textos comuns.',
  'social': 'Enllaços a les xarxes socials del centre.'
};

const ITEM_NAMES = {
  'nav': 'enllaç del menú', 'pillars': 'pilar', 'paragraphs': 'paràgraf', 'items': 'element', 'schedule': 'dia',
  'slots': 'classe', 'plans': 'pla', 'packs': 'pack', 'sections': 'apartat', 'fields': 'camp', 'features': 'característica',
  'fotos': 'foto', 'gallery': 'imatge', 'values.items': 'valor', 'credentials.items': 'etapa', 'sections.*.items': 'punt'
};

/* Plantilles per als elements nous de cada llista */
const TEMPLATES = {
  'nav.*': { label: '', href: '' },
  'pillars.*': { icon: 'breath', title: '', text: '' },
  'values.items.*': { title: '', text: '' },
  'credentials.items.*': { year: '', title: '', place: '' },
  'features.*': { title: '', text: '' },
  'schedule.*': { day: '', slots: [] },
  'slots.*': { time: '', type: '', level: 'Tots els nivells' },
  'plans.*': { days: '', price: '', al: 'mes', highlight: false },
  'packs.*': { classes: '', price: '' },
  'sections.*': { title: '', items: [] },
  'fields.*': { name: '', label: '', type: 'text', required: false },
  'fotos.*': { src: '', alt: '' }
};

const SELECTS = {
  'pillars.*.icon': [['breath', 'Respiració (gota amb fletxa)'], ['body', 'Cos (figura humana)'], ['mind', 'Ment (cercles)']],
  'fields.*.type': [['text', 'Text curt'], ['email', 'Correu electrònic'], ['tel', 'Telèfon'], ['textarea', 'Text llarg']]
};

const LONG_KEYS = new Set(['text', 'description', 'descripcio', 'highlight', 'intro', 'paragraphs', 'items', 'placeholder', 'success', 'cta_section_desc', 'activities_empty_desc', '_INSTRUCCIONS', '_GUIA_COMPLETA']);

const SECTION_ICONS = {
  hero: 'type', images: 'image', meta: 'globe', intro: 'book', pillars: 'leaf', pillars_section: 'type', quote: 'quote',
  cta_section: 'star', bio: 'user', values: 'leaf', credentials: 'calendar', origin: 'book', breath: 'leaf',
  description: 'book', features: 'star', features_section: 'type', schedule: 'clock', maintenance: 'euro', monthly: 'euro',
  single: 'euro', bonus: 'tag', group_section: 'user', trial: 'star', sections: 'list', form: 'mail', contact: 'mail',
  nav: 'menu', footer: 'layers', social: 'link', activitat_actual: 'calendar', galeria_anterior: 'image', _MENU: 'list'
};

/* ════════════════════════════════════════════
   ESTAT
════════════════════════════════════════════ */
const state = {
  cfg: { ...DEFAULT_REPO },
  auth: null,          // contingut d'admin/auth.json
  authSha: null,
  token: null,         // només a memòria
  user: null,
  ghUser: null,
  data: null,
  original: null,
  originalStr: '',
  sha: null,
  broken: null,        // { text, error } si el JSON del repositori no és vàlid
  images: null,
  previews: {},
  open: new Set(),
  dirty: false,
  lastActivity: Date.now(),
  locked: false,
  commits: null
};

/* ════════════════════════════════════════════
   UTILITATS
════════════════════════════════════════════ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const enc = new TextEncoder();
const dec = new TextDecoder();

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'value') node.value = v;
      else if (k === 'checked') node.checked = !!v;
      else if (k === 'disabled') node.disabled = !!v;
      else node.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-15-1 9-7 15-15 15z"/><path d="M5 19 14 10"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9-9-9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8M7 21v-7h10v7"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  euro: '<path d="M17 6a7 7 0 1 0 0 12"/><path d="M4 10h9M4 14h9"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L21 15"/><path d="M21 20v-5h-5"/>',
  quote: '<path d="M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
};

function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'ico ' + cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name] || ICONS.info;
  return svg;
}

function bytesToB64(bytes) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
}
function b64ToBytes(b64) {
  const s = atob(String(b64).replace(/\s/g, ''));
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
const utf8ToB64 = (str) => bytesToB64(enc.encode(str));
const b64ToUtf8 = (b64) => dec.decode(b64ToBytes(b64));

function getAt(path, root = state.data) {
  let cur = root;
  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[seg];
  }
  return cur;
}
function setAt(path, value) {
  const parent = getAt(path.slice(0, -1));
  parent[path[path.length - 1]] = value;
}
const pkey = (path) => path.join('\u001f');
const normPath = (path) => path.map((s) => (typeof s === 'number' ? '*' : s));

function lookup(dict, path) {
  const n = normPath(path);
  for (let len = n.length; len >= 1; len--) {
    const k = n.slice(-len).join('.');
    if (Object.prototype.hasOwnProperty.call(dict, k)) return dict[k];
  }
  return undefined;
}

function humanize(key) {
  const s = String(key).replace(/^_+/, '').replace(/^\d+_/, '').replace(/[_-]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : String(key);
}

function labelFor(path) {
  const last = path[path.length - 1];
  if (typeof last === 'number') return '#' + (last + 1);
  if (path.length === 2 && path[0] === 'pages' && PAGE_INFO[last]) return PAGE_INFO[last].name;
  return lookup(LABELS, path) || humanize(last);
}

function stripHtml(s) {
  return String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function safeStorage(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

function pageFile(key) {
  return PAGE_INFO[key]?.file || (key === 'home' ? 'index.html' : key + '.html');
}

function pageName(key) {
  return PAGE_INFO[key]?.name || humanize(key);
}

function pageOrder() {
  const keys = Object.keys(state.data?.pages || {});
  const order = [];
  for (const item of state.data?.site?.nav || []) {
    const file = String(item.href || '').split('#')[0];
    const key = file === 'index.html' ? 'home' : file.replace(/\.html$/, '');
    if (keys.includes(key) && !order.includes(key)) order.push(key);
  }
  for (const k of keys) if (!order.includes(k)) order.push(k);
  return order;
}

/* ════════════════════════════════════════════
   CRIPTOGRAFIA
════════════════════════════════════════════ */
async function deriveKey(user, pass, salt, iterations) {
  const material = await crypto.subtle.importKey(
    'raw', enc.encode(user.trim().toLowerCase() + '\u0000' + pass), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

async function encryptToken(user, pass, token) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(user, pass, salt, KDF_ITERATIONS);
  const payload = enc.encode(JSON.stringify({ token, user: user.trim(), created: new Date().toISOString() }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(AAD) }, key, payload));
  return {
    v: 1,
    note: 'Fitxer del panell de control. Conté el token de GitHub XIFRAT (AES-GCM 256 + PBKDF2). No l\'editis a mà.',
    owner: state.cfg.owner, repo: state.cfg.repo, branch: state.cfg.branch,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS, salt: bytesToB64(salt) },
    cipher: { name: 'AES-GCM', iv: bytesToB64(iv), data: bytesToB64(ct) }
  };
}

async function decryptToken(user, pass, auth) {
  const key = await deriveKey(user, pass, b64ToBytes(auth.kdf.salt), auth.kdf.iterations);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(auth.cipher.iv), additionalData: enc.encode(AAD) },
    key, b64ToBytes(auth.cipher.data)
  );
  return JSON.parse(dec.decode(pt));
}

function passwordScore(pw) {
  if (!pw) return 0;
  let classes = 0;
  if (/[a-z]/.test(pw)) classes++;
  if (/[A-Z]/.test(pw)) classes++;
  if (/[0-9]/.test(pw)) classes++;
  if (/[^A-Za-z0-9]/.test(pw)) classes++;
  let score = 0;
  if (pw.length >= MIN_PASSWORD) score++;
  if (pw.length >= 16) score++;
  if (classes >= 3) score++;
  if (classes === 4) score++;
  if (/(.)\1{2,}/.test(pw) || /^(?:1234|abcd|qwer|password|contrasenya)/i.test(pw)) score = Math.max(0, score - 2);
  return score; // 0..4
}

function passwordProblems(pw, user) {
  const p = [];
  if (pw.length < MIN_PASSWORD) p.push(`ha de tenir com a mínim ${MIN_PASSWORD} caràcters`);
  let classes = 0;
  if (/[a-z]/.test(pw)) classes++;
  if (/[A-Z]/.test(pw)) classes++;
  if (/[0-9]/.test(pw)) classes++;
  if (/[^A-Za-z0-9]/.test(pw)) classes++;
  if (classes < 3) p.push('ha de combinar com a mínim 3 tipus: minúscules, majúscules, números i símbols');
  if (user && pw.toLowerCase().includes(user.trim().toLowerCase())) p.push('no pot contenir el nom d\'usuari');
  return p;
}

/* ════════════════════════════════════════════
   GITHUB API
════════════════════════════════════════════ */
class GhError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function gh(path, opts = {}, token = state.token) {
  const headers = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (opts.body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch('https://api.github.com' + path, { ...opts, headers, cache: 'no-store' });
  } catch {
    throw new GhError(0, 'No hi ha connexió amb GitHub. Revisa la connexió a internet.');
  }
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).message || ''; } catch { /* buit */ }
    throw new GhError(res.status, ghMessage(res.status, msg));
  }
  if (res.status === 204) return null;
  return res.json();
}

function ghMessage(status, msg) {
  if (status === 401) return 'El token de GitHub no és vàlid o ha caducat.';
  if (status === 403 && /rate limit/i.test(msg)) return 'GitHub ha limitat les peticions temporalment. Torna-ho a provar d\'aquí uns minuts.';
  if (status === 403) return 'El token no té permís per fer aquesta acció (cal permís «Contents: Read and write»).';
  if (status === 404) return 'No s\'ha trobat el fitxer o el repositori.';
  if (status === 409) return 'Hi ha hagut un conflicte: el fitxer ha canviat mentrestant.';
  if (status === 422) return 'GitHub ha rebutjat el canvi' + (msg ? ': ' + msg : '.');
  return `Error de GitHub (${status})${msg ? ': ' + msg : ''}`;
}

const repoBase = () => `/repos/${encodeURIComponent(state.cfg.owner)}/${encodeURIComponent(state.cfg.repo)}`;
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');

async function ghGetFile(path, ref, token) {
  const q = '?ref=' + encodeURIComponent(ref || state.cfg.branch);
  const r = await gh(`${repoBase()}/contents/${encPath(path)}${q}`, {}, token);
  let text = '';
  if (r.content && r.encoding === 'base64') text = b64ToUtf8(r.content);
  else if (r.download_url || r.git_url) {
    const blob = await gh(`${repoBase()}/git/blobs/${r.sha}`, {}, token);
    text = b64ToUtf8(blob.content);
  }
  return { text, sha: r.sha };
}

async function ghPutFile(path, b64, message, sha, token) {
  const body = { message, content: b64, branch: state.cfg.branch };
  if (sha) body.sha = sha;
  return gh(`${repoBase()}/contents/${encPath(path)}`, { method: 'PUT', body: JSON.stringify(body) }, token);
}

async function ghDeleteFile(path, message, sha) {
  return gh(`${repoBase()}/contents/${encPath(path)}`, {
    method: 'DELETE', body: JSON.stringify({ message, sha, branch: state.cfg.branch })
  });
}

async function checkToken(token) {
  const repo = await gh(repoBase(), {}, token);
  if (!repo.permissions || !repo.permissions.push) {
    throw new GhError(403, 'Aquest token pot llegir el repositori però NO hi pot escriure. Cal el permís «Contents: Read and write».');
  }
  return repo;
}

/* ════════════════════════════════════════════
   UI: TOASTS I MODALS
════════════════════════════════════════════ */
function toast(msg, type = 'ok', ms = 4200) {
  const t = el('div', { class: 'toast ' + (type === 'ok' ? '' : type) },
    icon(type === 'err' ? 'alert' : type === 'warn' ? 'info' : 'check'), el('div', null, msg));
  $('#toast-root').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
}

function modal({ title, body, actions = [], size = '', dismissable = true, onClose }) {
  const root = $('#modal-root');
  const back = el('div', { class: 'modal-back' });
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
  const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(); };
  const foot = actions.length ? el('div', { class: 'modal-foot' }, actions.map((a) =>
    el('button', { class: 'btn ' + (a.cls || 'btn-ghost'), type: 'button', onclick: () => a.onClick ? a.onClick(close, a) : close() },
      a.icon ? icon(a.icon) : null, a.label))) : null;
  const box = el('div', { class: 'modal ' + size, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    el('div', { class: 'modal-head' }, el('h3', { text: title }),
      dismissable ? el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Tancar', onclick: close }, icon('x')) : null),
    el('div', { class: 'modal-body' }, body),
    foot);
  back.appendChild(box);
  if (dismissable) back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', onKey);
  root.appendChild(back);
  setTimeout(() => { const f = box.querySelector('input, textarea, .modal-foot .btn-primary, .modal-foot .btn-danger'); f && f.focus(); }, 30);
  return { close, box };
}

function confirmDialog(title, message, { okLabel = 'D\'acord', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    modal({
      title,
      body: typeof message === 'string' ? el('p', { text: message }) : message,
      onClose: () => { if (!done) resolve(false); },
      actions: [
        { label: 'Cancel·la', cls: 'btn-ghost' },
        { label: okLabel, cls: danger ? 'btn-danger' : 'btn-primary', onClick: (close) => { done = true; close(); resolve(true); } }
      ]
    });
  });
}

function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) {
    btn.dataset.html = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = '';
    btn.appendChild(el('span', { class: 'spinner' }));
    if (label) btn.appendChild(document.createTextNode(' ' + label));
  } else {
    btn.disabled = false;
    if (btn.dataset.html !== undefined) btn.innerHTML = btn.dataset.html;
  }
}

function passwordInput(attrs) {
  const input = el('input', { class: 'input', type: 'password', autocomplete: 'current-password', spellcheck: 'false', ...attrs });
  const eye = el('button', { class: 'icon-btn eye', type: 'button', 'aria-label': 'Mostra la contrasenya' }, icon('eye'));
  eye.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.replaceChildren(icon(show ? 'eyeoff' : 'eye'));
  });
  return { wrap: el('div', { class: 'input-wrap' }, input, eye), input };
}

/* ════════════════════════════════════════════
   ARRENCADA
════════════════════════════════════════════ */
async function boot() {
  if (!window.crypto || !crypto.subtle) {
    renderFatal('Aquest navegador no és compatible o la pàgina no s\'ha obert amb https. Obre el panell des de l\'adreça segura del web (https://).');
    return;
  }
  renderLoading('Carregant el panell…');
  try {
    const auth = await loadAuth();
    if (!auth) { renderSetup(); return; }
    state.auth = auth.data;
    state.authSha = auth.sha;
    state.cfg = { owner: auth.data.owner || DEFAULT_REPO.owner, repo: auth.data.repo || DEFAULT_REPO.repo, branch: auth.data.branch || DEFAULT_REPO.branch };
    renderLogin();
  } catch (e) {
    renderFatal(e.message || 'No s\'ha pogut carregar el panell.');
  }
}

async function loadAuth() {
  /* 1) API de GitHub (sempre la versió més nova) */
  try {
    const f = await ghGetFile(AUTH_PATH, DEFAULT_REPO.branch, null);
    return { data: validAuth(JSON.parse(f.text)), sha: f.sha };
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error('El fitxer admin/auth.json està malmès. Esborra\'l a GitHub per tornar a configurar el panell.');
    if (e.status === 404) {
      /* pot ser que encara no s'hagi publicat; comprovem també la còpia del web */
      const local = await fetchLocalAuth();
      return local ? { data: local, sha: null } : null;
    }
    /* 2) Si l'API falla (límit de peticions, etc.) fem servir la còpia publicada al web */
    const local = await fetchLocalAuth();
    if (local) return { data: local, sha: null };
    throw e;
  }
}

async function fetchLocalAuth() {
  try {
    const res = await fetch('auth.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    return validAuth(await res.json());
  } catch { return null; }
}

function validAuth(a) {
  if (!a || a.v !== 1 || !a.kdf || !a.cipher || !a.kdf.salt || !a.cipher.iv || !a.cipher.data) {
    throw new Error('El fitxer admin/auth.json no té un format vàlid.');
  }
  if (!Number.isInteger(a.kdf.iterations) || a.kdf.iterations < 100000) {
    throw new Error('El fitxer admin/auth.json no és segur. Esborra\'l a GitHub per tornar a configurar el panell.');
  }
  return a;
}

function renderLoading(msg) {
  $('#app').replaceChildren(el('div', { class: 'loading' }, el('span', { class: 'spinner spinner-lg' }), el('div', { text: msg })));
}

function renderFatal(msg) {
  $('#app').replaceChildren(authShell(
    el('h1', { text: 'Alguna cosa no ha anat bé' }),
    el('div', { class: 'auth-error' }, icon('alert'), el('div', { text: msg })),
    el('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: () => location.reload() }, icon('refresh'), 'Torna-ho a provar')
  ));
}

function authShell(...children) {
  return el('div', { class: 'auth-wrap' }, el('div', { class: 'auth-card' },
    el('div', { class: 'auth-logo' },
      el('img', { src: '../assets/images/logo-fondo-blanc.png', alt: '' }),
      el('div', null, el('div', { class: 't1', text: 'OM Ioga' }), el('div', { class: 't2', text: 'Panell de control' }))),
    ...children,
    el('div', { class: 'auth-foot' }, icon('lock'), 'Connexió xifrada · Accés només per a persones autoritzades')));
}

/* ── Configuració inicial ── */
function renderSetup() {
  let err = el('div', { class: 'auth-error hidden' });
  const user = el('input', { class: 'input', autocomplete: 'username', spellcheck: 'false', required: true, maxlength: '64' });
  const p1 = passwordInput({ autocomplete: 'new-password' });
  const p2 = passwordInput({ autocomplete: 'new-password' });
  const token = el('input', { class: 'input mono', autocomplete: 'off', spellcheck: 'false', placeholder: 'github_pat_…' });
  const owner = el('input', { class: 'input', value: state.cfg.owner });
  const repo = el('input', { class: 'input', value: state.cfg.repo });
  const branch = el('input', { class: 'input', value: state.cfg.branch });
  const bar = el('div');
  const meterTxt = el('div', { class: 'field-hint' });
  const btn = el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, icon('shield'), 'Configura i protegeix el panell');

  p1.input.addEventListener('input', () => {
    const s = passwordScore(p1.input.value);
    const colors = ['#B4473C', '#B4473C', '#B7791F', '#6E9A55', '#2A4130'];
    const names = ['Molt feble', 'Feble', 'Acceptable', 'Forta', 'Molt forta'];
    bar.style.width = (p1.input.value ? (s + 1) * 20 : 0) + '%';
    bar.style.background = colors[s];
    meterTxt.textContent = p1.input.value ? 'Seguretat: ' + names[s] : `Mínim ${MIN_PASSWORD} caràcters, combinant majúscules, minúscules, números i símbols.`;
  });
  p1.input.dispatchEvent(new Event('input'));

  const form = el('form', { autocomplete: 'off' },
    err,
    el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Nom d\'usuari' }), user),
    el('div', { class: 'grid-2' },
      el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Contrasenya' }), p1.wrap),
      el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Repeteix la contrasenya' }), p2.wrap)),
    el('div', { class: 'strength' }, bar), meterTxt,
    el('div', { class: 'field', style: null }, el('br'),
      el('label', { class: 'field-label', text: 'Token de GitHub' }), token,
      el('div', { class: 'field-hint', text: 'Es xifrarà amb la teva contrasenya abans de desar-se. Mai es guarda en clar.' })),
    el('details', { class: 'adv' }, el('summary', { text: 'Opcions avançades del repositori' }),
      el('div', { class: 'grid-2' },
        el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Propietari' }), owner),
        el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Repositori' }), repo)),
      el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Branca' }), branch)),
    btn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.add('hidden');
    const showErr = (m) => { err.replaceChildren(icon('alert'), el('div', { text: m })); err.classList.remove('hidden'); };
    const u = user.value.trim();
    if (u.length < 3) return showErr('El nom d\'usuari ha de tenir com a mínim 3 caràcters.');
    const probs = passwordProblems(p1.input.value, u);
    if (probs.length) return showErr('La contrasenya ' + probs.join('; ') + '.');
    if (p1.input.value !== p2.input.value) return showErr('Les dues contrasenyes no coincideixen.');
    const t = token.value.trim();
    if (!t) return showErr('Cal enganxar el token de GitHub.');
    state.cfg = { owner: owner.value.trim() || DEFAULT_REPO.owner, repo: repo.value.trim() || DEFAULT_REPO.repo, branch: branch.value.trim() || DEFAULT_REPO.branch };
    setBusy(btn, true, 'Comprovant el token…');
    try {
      await checkToken(t);
      /* si ja existeix un auth.json (per exemple, creat des d'un altre ordinador) no el sobreescrivim */
      let existing = null;
      try { existing = await ghGetFile(AUTH_PATH, null, t); } catch (e2) { if (e2.status !== 404) throw e2; }
      if (existing) {
        setBusy(btn, false);
        toast('El panell ja estava configurat. Inicia sessió.', 'warn');
        state.auth = validAuth(JSON.parse(existing.text));
        state.authSha = existing.sha;
        renderLogin();
        return;
      }
      setBusy(btn, true, 'Xifrant…');
      const auth = await encryptToken(u, p1.input.value, t);
      setBusy(btn, true, 'Desant a GitHub…');
      const r = await ghPutFile(AUTH_PATH, utf8ToB64(JSON.stringify(auth, null, 2) + '\n'), 'Panell: configuració inicial d\'accés (token xifrat)', null, t);
      state.auth = auth;
      state.authSha = r.content.sha;
      state.token = t;
      state.user = u;
      p1.input.value = p2.input.value = token.value = '';
      toast('Panell configurat i protegit correctament.');
      await enterApp();
    } catch (e2) {
      setBusy(btn, false);
      showErr(e2.message || 'No s\'ha pogut configurar el panell.');
    }
  });

  $('#app').replaceChildren(el('div', { class: 'auth-wrap' }, el('div', { class: 'auth-card wide' },
    el('div', { class: 'auth-logo' },
      el('img', { src: '../assets/images/logo-fondo-blanc.png', alt: '' }),
      el('div', null, el('div', { class: 't1', text: 'OM Ioga' }), el('div', { class: 't2', text: 'Panell de control' }))),
    el('h1', { text: 'Configuració inicial' }),
    el('p', { class: 'lead', text: 'Només cal fer-ho una vegada. Crearàs l\'usuari i la contrasenya per entrar al panell.' }),
    el('ol', { class: 'steps' },
      el('li', null, 'Entra a GitHub amb el compte del web i ves a ', el('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener noreferrer', text: 'crear un token (fine-grained)' }), '.'),
      el('li', null, 'A «Repository access» tria ', el('b', { text: 'Only select repositories' }), ' i selecciona ', el('code', { text: `${state.cfg.owner}/${state.cfg.repo}` }), '.'),
      el('li', null, 'A «Permissions → Repository permissions» posa ', el('b', { text: 'Contents: Read and write' }), '. No cal cap altre permís.'),
      el('li', null, 'Tria la data de caducitat més llarga possible, crea el token i enganxa\'l aquí sota.')),
    form,
    el('div', { class: 'auth-foot' }, icon('lock'), 'El token es xifra al teu navegador amb AES-256. Ningú el pot llegir sense la contrasenya.'))));
  user.focus();
}

/* ── Inici de sessió ── */
function failInfo() {
  return safeStorage(() => JSON.parse(localStorage.getItem('omioga_admin_fail') || 'null'), null) || { n: 0, t: 0 };
}
function waitSeconds() {
  const f = failInfo();
  if (f.n < 3) return 0;
  const wait = Math.min(15 * Math.pow(2, f.n - 3), 900);
  return Math.max(0, Math.ceil((f.t + wait * 1000 - Date.now()) / 1000));
}

function renderLogin({ lock = false } = {}) {
  const err = el('div', { class: 'auth-error hidden' });
  const user = el('input', { class: 'input', autocomplete: 'username', spellcheck: 'false', value: lock ? (state.user || '') : '', maxlength: '64' });
  const pass = passwordInput({ autocomplete: 'current-password' });
  const btn = el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, icon('lock'), lock ? 'Desbloqueja' : 'Entra');
  const showErr = (m) => { err.replaceChildren(icon('alert'), el('div', { text: m })); err.classList.remove('hidden'); };

  const form = el('form', null,
    err,
    el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Usuari' }), user),
    el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Contrasenya' }), pass.wrap),
    el('br'), btn);

  let timer = null;
  const tick = () => {
    const w = waitSeconds();
    if (w > 0) {
      btn.disabled = true;
      showErr(`Massa intents fallits. Espera ${w} segons abans de tornar-ho a provar.`);
      timer = setTimeout(tick, 1000);
    } else {
      btn.disabled = false;
      if (timer) { err.classList.add('hidden'); timer = null; }
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (waitSeconds() > 0) return tick();
    err.classList.add('hidden');
    const u = user.value.trim();
    const p = pass.input.value;
    if (!u || !p) return showErr('Escriu l\'usuari i la contrasenya.');
    setBusy(btn, true, 'Comprovant…');
    let payload;
    try {
      payload = await decryptToken(u, p, state.auth);
    } catch {
      const f = failInfo();
      safeStorage(() => localStorage.setItem('omioga_admin_fail', JSON.stringify({ n: f.n + 1, t: Date.now() })));
      await new Promise((r) => setTimeout(r, 600));
      setBusy(btn, false);
      pass.input.value = '';
      showErr('Usuari o contrasenya incorrectes.');
      tick();
      pass.input.focus();
      return;
    }
    safeStorage(() => localStorage.removeItem('omioga_admin_fail'));
    try {
      await checkToken(payload.token);
    } catch (e2) {
      setBusy(btn, false);
      if (e2.status === 401 || e2.status === 403) {
        renewTokenFlow(u, p, e2.message);
        return;
      }
      showErr(e2.message);
      return;
    }
    pass.input.value = '';
    state.token = payload.token;
    state.user = u;
    state.lastActivity = Date.now();
    if (lock) {
      state.locked = false;
      lockModal && lockModal.close();
      lockModal = null;
      toast('Sessió desbloquejada.');
    } else {
      await enterApp();
    }
  });

  if (lock) {
    lockModal = modal({
      title: 'Sessió bloquejada',
      dismissable: false,
      body: el('div', null,
        el('p', { class: 'field-hint', text: 'Per seguretat, la sessió s\'ha bloquejat per inactivitat. Els canvis que no havies desat es mantenen.' }),
        el('br'), form)
    });
    setTimeout(() => pass.input.focus(), 50);
  } else {
    $('#app').replaceChildren(authShell(
      el('h1', { text: 'Benvinguda' }),
      el('p', { class: 'lead', text: 'Entra per editar els continguts del web.' }),
      form));
    user.focus();
  }
  tick();
}
let lockModal = null;

function renewTokenFlow(user, pass, reason) {
  const token = el('input', { class: 'input mono', placeholder: 'github_pat_…', autocomplete: 'off', spellcheck: 'false' });
  const err = el('div', { class: 'auth-error hidden' });
  modal({
    title: 'Cal un token nou',
    dismissable: true,
    body: el('div', null,
      el('div', { class: 'notice warn' }, icon('alert'), el('div', null, el('b', { text: reason }), ' Normalment passa quan el token caduca.')),
      el('p', null, 'Crea un token nou a ', el('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener noreferrer', text: 'GitHub' }),
        ' (només aquest repositori, permís «Contents: Read and write») i enganxa\'l aquí. Es xifrarà amb la mateixa contrasenya.'),
      el('br'), err,
      el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Token nou' }), token)),
    actions: [
      { label: 'Cancel·la' },
      {
        label: 'Desa el token', cls: 'btn-primary', icon: 'key', onClick: async (close) => {
          const btn = $('.modal-foot .btn-primary');
          const t = token.value.trim();
          if (!t) return;
          setBusy(btn, true, 'Comprovant…');
          try {
            await checkToken(t);
            const auth = await encryptToken(user, pass, t);
            let sha = state.authSha;
            if (!sha) { try { sha = (await ghGetFile(AUTH_PATH, null, t)).sha; } catch { /* nou */ } }
            const r = await ghPutFile(AUTH_PATH, utf8ToB64(JSON.stringify(auth, null, 2) + '\n'), 'Panell: actualitza el token xifrat', sha, t);
            state.auth = auth; state.authSha = r.content.sha; state.token = t; state.user = user;
            close();
            toast('Token actualitzat correctament.');
            if (state.locked) { state.locked = false; lockModal && lockModal.close(); lockModal = null; }
            else await enterApp();
          } catch (e) {
            setBusy(btn, false);
            err.replaceChildren(icon('alert'), el('div', { text: e.message }));
            err.classList.remove('hidden');
          }
        }
      }
    ]
  });
}

/* ── Inactivitat ── */
function initActivityWatch() {
  const bump = () => { state.lastActivity = Date.now(); };
  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, bump, { passive: true }));
  setInterval(() => {
    if (state.token && !state.locked && Date.now() - state.lastActivity > LOCK_AFTER_MS) lockSession();
  }, 20000);
}

function lockSession() {
  state.token = null;
  state.locked = true;
  $$('.modal-back').forEach((m) => m.remove());
  renderLogin({ lock: true });
}

function logout() {
  const go = () => { state.token = null; state.dirty = false; location.hash = ''; location.reload(); };
  if (state.dirty) {
    confirmDialog('Tancar sessió', 'Tens canvis sense desar. Si tanques la sessió es perdran.', { okLabel: 'Tanca igualment', danger: true })
      .then((ok) => ok && go());
  } else go();
}

/* ════════════════════════════════════════════
   CÀRREGA DE CONTINGUT
════════════════════════════════════════════ */
async function enterApp() {
  renderLoading('Carregant els continguts del web…');
  try {
    const [file, me] = await Promise.all([
      ghGetFile(CONTENT_PATH),
      gh('/user').catch(() => null)
    ]);
    state.ghUser = me;
    state.sha = file.sha;
    try {
      const data = JSON.parse(file.text);
      setLoaded(data);
      state.broken = null;
    } catch (e) {
      state.broken = { text: file.text, error: e.message };
      state.data = null;
      state.original = null;
      state.originalStr = '';
    }
    renderShell();
    if (!initialized) {
      initialized = true;
      window.addEventListener('hashchange', route);
      window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (state.token) saveFlow(); }
      });
      initActivityWatch();
    }
    route();
  } catch (e) {
    renderFatal(e.message);
  }
}
let initialized = false;

function setLoaded(data) {
  state.data = data;
  state.original = clone(data);
  state.originalStr = JSON.stringify(data);
  state.dirty = false;
}

/* ════════════════════════════════════════════
   ESTRUCTURA DE L'APP
════════════════════════════════════════════ */
function renderShell() {
  const sidebar = el('aside', { class: 'sidebar', id: 'sidebar' },
    el('a', { class: 'sb-brand', href: '#/' },
      el('img', { src: '../assets/images/logo-fondo-blanc.png', alt: '' }),
      el('div', null, el('div', { class: 't1', text: 'OM Ioga' }), el('div', { class: 't2', text: 'Panell de control' }))),
    el('nav', { class: 'sb-scroll', id: 'sb-nav', 'aria-label': 'Seccions del panell' }),
    el('div', { class: 'sb-foot' },
      state.ghUser?.avatar_url ? el('img', { src: state.ghUser.avatar_url, alt: '', width: '32', height: '32', style: null, class: 'sb-avatar' }) : null,
      el('div', { class: 'sb-user' }, el('div', { class: 'u', text: state.user || '' }), el('div', { class: 'r', text: `${state.cfg.owner}/${state.cfg.repo}` })),
      el('button', { class: 'icon-btn', type: 'button', title: 'Bloqueja', 'aria-label': 'Bloqueja la sessió', onclick: lockSession }, icon('lock')),
      el('button', { class: 'icon-btn', type: 'button', title: 'Tanca la sessió', 'aria-label': 'Tanca la sessió', onclick: logout }, icon('logout'))));
  const overlay = el('div', { class: 'sb-overlay', id: 'sb-overlay', onclick: () => toggleSidebar(false) });
  const main = el('div', { class: 'main' },
    el('header', { class: 'topbar', id: 'topbar' }),
    el('main', { class: 'content', id: 'content' }));
  $('#app').replaceChildren(el('div', { class: 'layout' }, sidebar, overlay, main));
  const av = $('.sb-avatar');
  if (av) { av.style.width = '32px'; av.style.height = '32px'; av.style.borderRadius = '50%'; }
}

function toggleSidebar(open) {
  $('#sidebar')?.classList.toggle('open', open);
  $('#sb-overlay')?.classList.toggle('show', open);
}

function navItems() {
  const items = [];
  items.push({ group: null, route: '#/', label: 'Inici del panell', icon: 'grid' });
  if (state.data) {
    items.push({ group: 'Tot el web' });
    if (state.data.site) items.push({ route: '#/site', label: 'Dades del centre i menú', icon: 'home', root: ['site'] });
    if (state.data.global_labels) items.push({ route: '#/labels', label: 'Textos comuns', icon: 'type', root: ['global_labels'] });
    items.push({ group: 'Pàgines' });
    for (const k of pageOrder()) items.push({ route: '#/page/' + encodeURIComponent(k), label: pageName(k), icon: PAGE_INFO[k]?.icon || 'book', root: ['pages', k] });
    const extra = Object.keys(state.data).filter((k) => !['site', 'pages', 'global_labels', '_GUIDE_'].includes(k));
    if (extra.length) {
      items.push({ group: 'Altres continguts' });
      for (const k of extra) items.push({ route: '#/root/' + encodeURIComponent(k), label: humanize(k), icon: 'book', root: [k] });
    }
  }
  items.push({ group: 'Eines' });
  items.push({ route: '#/images', label: 'Imatges', icon: 'image' });
  items.push({ route: '#/history', label: 'Historial de canvis', icon: 'history' });
  if (state.data?._GUIDE_) items.push({ route: '#/guide', label: 'Guia del fitxer', icon: 'book', root: ['_GUIDE_'] });
  items.push({ route: '#/json', label: 'Editor avançat (JSON)', icon: 'code' });
  items.push({ route: '#/security', label: 'Seguretat i accés', icon: 'shield' });
  return items;
}

function renderSidebar() {
  const nav = $('#sb-nav');
  if (!nav) return;
  const cur = location.hash || '#/';
  nav.replaceChildren(...navItems().map((it) => {
    if (it.group !== undefined && !it.route) return el('div', { class: 'sb-group', text: it.group });
    const active = cur === it.route || (it.route !== '#/' && cur.startsWith(it.route + '/'));
    const dirty = it.root && rootDirty(it.root);
    return el('a', { class: 'sb-link' + (active ? ' active' : ''), href: it.route, onclick: () => toggleSidebar(false) },
      icon(it.icon), el('span', { text: it.label }), dirty ? el('span', { class: 'dot', title: 'Canvis sense desar' }) : null);
  }));
}

function rootDirty(path) {
  if (!state.data || !state.original) return false;
  return JSON.stringify(getAt(path)) !== JSON.stringify(getAt(path, state.original));
}

function renderTopbar({ crumb, name, viewUrl }) {
  const tb = $('#topbar');
  if (!tb) return;
  const dirty = state.dirty;
  tb.replaceChildren(
    el('button', { class: 'icon-btn menu-btn', type: 'button', 'aria-label': 'Obre el menú', onclick: () => toggleSidebar(true) }, icon('menu')),
    el('div', { class: 'tb-title' }, el('div', { class: 'crumb', text: crumb || 'Panell de control' }), el('div', { class: 'name', text: name })),
    el('span', { class: 'status-pill' + (dirty ? ' dirty' : ''), id: 'status-pill', title: dirty ? 'Canvis sense desar' : 'Tot desat' },
      el('span', { class: 'd' }), el('span', { class: 'txt', text: dirty ? 'Canvis sense desar' : 'Tot desat' })),
    el('div', { class: 'tb-actions' },
      viewUrl ? el('a', { class: 'btn btn-ghost', href: viewUrl, target: '_blank', rel: 'noopener', title: 'Veure la pàgina publicada' }, icon('ext'), el('span', { class: 'lbl', text: 'Veure al web' })) : null,
      dirty ? el('button', { class: 'btn btn-ghost', type: 'button', onclick: discardChanges, title: 'Descarta els canvis' }, icon('undo'), el('span', { class: 'lbl', text: 'Descarta' })) : null,
      el('button', { class: 'btn btn-primary', id: 'save-btn', type: 'button', disabled: !dirty, onclick: saveFlow, title: 'Desa i publica (Ctrl+S)' }, icon('upload'), el('span', { class: 'lbl', text: 'Desa i publica' }))));
}

let currentTop = { crumb: '', name: '', viewUrl: null };
let dirtyTimer = null;
function onChanged() {
  clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(() => {
    const was = state.dirty;
    state.dirty = state.data ? JSON.stringify(state.data) !== state.originalStr : false;
    if (was !== state.dirty) renderTopbar(currentTop);
    renderSidebar();
    refreshCardBadges();
  }, 120);
}

function refreshCardBadges() {
  $$('.card[data-path]').forEach((card) => {
    const path = JSON.parse(card.dataset.path);
    const changed = isChanged(path, card.dataset.multi ? JSON.parse(card.dataset.multi) : null);
    const badge = card.querySelector(':scope > .card-head .changed-badge');
    if (badge) badge.classList.toggle('hidden', !changed);
  });
}

function isChanged(path, multiKeys) {
  if (!state.original) return false;
  if (multiKeys) return multiKeys.some((k) => JSON.stringify(getAt([...path, k])) !== JSON.stringify(getAt([...path, k], state.original)));
  return JSON.stringify(getAt(path)) !== JSON.stringify(getAt(path, state.original));
}

async function discardChanges() {
  const ok = await confirmDialog('Descartar els canvis', 'Es perdran tots els canvis que no has desat i tornarà a quedar com està publicat ara.', { okLabel: 'Descarta', danger: true });
  if (!ok) return;
  state.data = clone(state.original);
  state.dirty = false;
  route();
  toast('Canvis descartats.');
}

/* ════════════════════════════════════════════
   RUTES
════════════════════════════════════════════ */
function route() {
  if (!$('#content')) return;
  const h = location.hash || '#/';
  const parts = h.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const scroll = window.scrollY;
  const sameView = route.last === h;
  route.last = h;

  if (state.broken && parts[0] !== 'json' && parts[0] !== 'history' && parts[0] !== 'security') {
    location.hash = '#/json';
    return;
  }

  const content = $('#content');
  content.replaceChildren();
  switch (parts[0]) {
    case '':
      viewDashboard(content); break;
    case 'site':
      viewEditor(content, ['site'], { crumb: 'Tot el web', name: 'Dades del centre i menú', desc: 'Nom del centre, dades de contacte, menú, peu de pàgina i xarxes socials. Aquests textos surten a totes les pàgines.', viewUrl: '../index.html' }); break;
    case 'labels':
      viewEditor(content, ['global_labels'], { crumb: 'Tot el web', name: 'Textos comuns', desc: 'Textos que es repeteixen a diverses pàgines (bloc final, títols de seccions, missatges d\'activitats…).', viewUrl: null, openAll: true }); break;
    case 'page': {
      const key = parts[1];
      if (!state.data?.pages?.[key]) { location.hash = '#/'; return; }
      viewEditor(content, ['pages', key], { crumb: 'Pàgines', name: pageName(key), desc: PAGE_INFO[key]?.desc || '', viewUrl: '../' + pageFile(key) });
      break;
    }
    case 'root': {
      const key = parts[1];
      if (!state.data || !(key in state.data)) { location.hash = '#/'; return; }
      viewEditor(content, [key], { crumb: 'Altres continguts', name: humanize(key), desc: '', viewUrl: null });
      break;
    }
    case 'guide':
      viewEditor(content, ['_GUIDE_'], { crumb: 'Eines', name: 'Guia del fitxer', desc: 'Aquests textos són la guia escrita dins del fitxer de continguts. No surten al web.', viewUrl: null, openAll: true }); break;
    case 'images': viewImages(content); break;
    case 'history': viewHistory(content); break;
    case 'json': viewJson(content); break;
    case 'security': viewSecurity(content); break;
    default: location.hash = '#/'; return;
  }
  renderSidebar();
  if (sameView) window.scrollTo(0, scroll); else window.scrollTo(0, 0);
  requestAnimationFrame(() => autosizeAll(content));
}

function setTop(t) { currentTop = t; renderTopbar(t); }

/* ── Dashboard ── */
function viewDashboard(c) {
  setTop({ crumb: 'Panell de control', name: 'Inici del panell', viewUrl: '../index.html' });
  const hello = el('div', { class: 'hello' },
    el('h2', { text: `Hola${state.user ? ', ' + state.user : ''}!` }),
    el('p', { text: 'Des d\'aquí pots canviar tots els textos, preus, horaris, activitats i imatges del web. Quan acabis, prem «Desa i publica»: el web s\'actualitzarà sol en 1 o 2 minuts.' }),
    el('div', { class: 'btns' },
      el('a', { class: 'btn btn-gold', href: '#/page/horaris' }, icon('clock'), 'Horaris'),
      el('a', { class: 'btn btn-gold', href: '#/page/activitats' }, icon('calendar'), 'Activitats'),
      el('a', { class: 'btn btn-ghost', href: '../index.html', target: '_blank', rel: 'noopener' }, icon('ext'), 'Veure el web')));
  c.appendChild(hello);

  const tile = (href, ic, title, sub, root) => el('a', { class: 'tile', href },
    el('div', { class: 'ti' }, icon(ic)),
    el('div', null, el('div', { class: 'tt', text: title }), el('div', { class: 'ts', text: sub })),
    root && rootDirty(root) ? el('span', { class: 'dot', title: 'Canvis sense desar' }) : null);

  c.appendChild(el('div', { class: 'section-title', text: 'Pàgines del web' }));
  c.appendChild(el('div', { class: 'tiles' }, pageOrder().map((k) =>
    tile('#/page/' + encodeURIComponent(k), PAGE_INFO[k]?.icon || 'book', pageName(k), PAGE_INFO[k]?.desc || pageFile(k), ['pages', k]))));

  c.appendChild(el('div', { class: 'section-title', text: 'Tot el web' }));
  c.appendChild(el('div', { class: 'tiles' },
    tile('#/site', 'home', 'Dades del centre i menú', 'Telèfon, adreça, correu, menú, peu de pàgina i xarxes.', ['site']),
    tile('#/labels', 'type', 'Textos comuns', 'Textos que es repeteixen a diverses pàgines.', ['global_labels']),
    tile('#/images', 'image', 'Imatges', 'Puja, revisa i elimina les imatges del web.')));

  c.appendChild(el('div', { class: 'section-title', text: 'Últims canvis publicats' }));
  const box = el('div', { class: 'card' }, el('div', { class: 'card-body', style: null }, el('div', { class: 'loading', style: null }, el('span', { class: 'spinner' }))));
  box.querySelector('.card-body').style.display = 'block';
  box.querySelector('.loading').style.minHeight = '120px';
  c.appendChild(box);
  loadCommits(5).then((list) => {
    const body = box.querySelector('.card-body');
    body.replaceChildren(commitList(list, false), el('a', { class: 'btn btn-soft btn-sm', href: '#/history' }, icon('history'), 'Veure tot l\'historial'));
  }).catch((e) => {
    box.querySelector('.card-body').replaceChildren(el('div', { class: 'notice warn' }, icon('alert'), el('div', { text: e.message })));
  });
}

/* ── Editor d'una secció ── */
function viewEditor(c, rootPath, { crumb, name, desc, viewUrl, openAll }) {
  setTop({ crumb, name, viewUrl });
  const root = getAt(rootPath);
  c.appendChild(el('div', { class: 'page-head' },
    el('div', null, el('h2', { text: name }), desc ? el('p', { text: desc }) : null),
    viewUrl ? el('a', { class: 'btn btn-ghost btn-sm', href: viewUrl, target: '_blank', rel: 'noopener' }, icon('ext'), 'Obre la pàgina') : null));

  if (!isObj(root)) {
    c.appendChild(el('div', { class: 'card open' }, el('div', { class: 'card-body' }, renderField(rootPath, 0))));
    return;
  }

  const keys = Object.keys(root);
  const prim = keys.filter((k) => !isObj(root[k]) && !Array.isArray(root[k]));
  const complex = keys.filter((k) => isObj(root[k]) || Array.isArray(root[k]));
  /* ordre visual: capçalera primer, imatges i SEO al final (l'ordre del fitxer no canvia) */
  const weight = (k) => (k === 'hero' ? -1 : k === 'images' ? 90 : k === 'meta' ? 100 : 0);
  complex.sort((a, b) => weight(a) - weight(b));

  let first = true;
  const isFirstOpen = () => { const r = first; first = false; return r; };

  const renderPrim = () => {
    if (!prim.length) return;
    const title = rootPath[0] === 'global_labels' ? 'Tots els textos comuns' : rootPath[0] === '_GUIDE_' ? 'Textos de la guia' : rootPath[0] === 'site' ? 'Nom i descripció del centre' : 'Textos de la pàgina';
    c.appendChild(sectionCard(rootPath, title, 'type', prim.map((k) => renderField([...rootPath, k], 1)), isFirstOpen() || openAll, prim));
  };
  if (complex[0] !== 'hero') renderPrim();
  complex.forEach((k, idx) => {
    const path = [...rootPath, k];
    const val = root[k];
    const body = [];
    const hint = lookup(HINTS, path);
    if (hint && !Array.isArray(val)) body.push(el('div', { class: 'notice info' }, icon('info'), el('div', { text: hint })));
    if (path.join('.') === 'pages.activitats.activitat_actual') body.push(activityTools(path));
    if (Array.isArray(val)) body.push(renderField(path, 0, { bare: true }));
    else if (!Object.keys(val).length) body.push(el('div', { class: 'list-empty', text: 'Aquesta secció està buida.' }));
    else for (const ck of Object.keys(val)) body.push(renderField([...path, ck], 1));
    c.appendChild(sectionCard(path, labelFor(path), SECTION_ICONS[k] || 'book', body, isFirstOpen() || openAll, null, sectionSub(path, val)));
    if (idx === 0 && k === 'hero') renderPrim();
  });

  /* Galeria d'activitats anteriors (opcional, la fa servir el web si existeix) */
  if (rootPath.join('.') === 'pages.activitats' && !root.galeria_anterior) {
    c.appendChild(el('div', { class: 'card open' },
      el('div', { class: 'card-head' }, el('div', { class: 'ci' }, icon('image')), el('h3', null, 'Galeria d\'activitats anteriors', el('small', { text: 'Opcional · ara mateix no n\'hi ha' }))),
      el('div', { class: 'card-body' },
        el('p', { class: 'field-hint', text: 'Si hi afegeixes fotos, sortiran a la pàgina d\'Activitats sota el títol «Activitats anteriors» (fins a 6 fotos).' }),
        el('br'),
        el('button', { class: 'btn btn-soft', type: 'button', onclick: () => { root.galeria_anterior = { fotos: [] }; state.open.add(pkey([...rootPath, 'galeria_anterior'])); onChanged(); route(); } }, icon('plus'), 'Afegeix una galeria d\'activitats anteriors'))));
  }
}

function sectionSub(path, val) {
  if (Array.isArray(val)) return `${val.length} ${val.length === 1 ? 'element' : 'elements'}`;
  const k = path[path.length - 1];
  if (k === 'meta') return 'Títol i descripció per a Google';
  if (k === 'images') return 'Fotos d\'aquesta pàgina';
  return null;
}

function sectionCard(path, title, ic, children, defaultOpen, multiKeys, sub) {
  const id = pkey(path) + (multiKeys ? '\u001f__prim' : '');
  const openNow = state.open.has(id) || (defaultOpen && !state.open.has('!' + id));
  const card = el('section', { class: 'card' + (openNow ? ' open' : ''), 'data-path': JSON.stringify(path) });
  if (multiKeys) card.dataset.multi = JSON.stringify(multiKeys);
  const changed = isChanged(path, multiKeys);
  const head = el('div', { class: 'card-head', role: 'button', tabindex: '0', 'aria-expanded': String(openNow) },
    el('div', { class: 'ci' }, icon(ic)),
    el('h3', null, title, sub ? el('small', { text: sub }) : null),
    el('span', { class: 'changed-badge' + (changed ? '' : ' hidden'), text: 'Modificat' }),
    icon('down', 'chev'));
  const toggle = () => {
    const open = card.classList.toggle('open');
    head.setAttribute('aria-expanded', String(open));
    if (open) { state.open.add(id); state.open.delete('!' + id); autosizeAll(card); }
    else { state.open.delete(id); state.open.add('!' + id); }
  };
  head.addEventListener('click', toggle);
  head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  card.append(head, el('div', { class: 'card-body' }, children));
  return card;
}

function activityTools(path) {
  return el('div', { class: 'textarea-tools act-tools' },
    el('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', onclick: async () => {
        const ok = await confirmDialog('Buidar l\'activitat', 'S\'esborraran la imatge, el títol, el dia, l\'hora, el lloc, la descripció i el preu de l\'activitat actual. Al web sortirà el missatge «Aquest mes no hi han activitats». El botó es manté.', { okLabel: 'Buida-la', danger: true });
        if (!ok) return;
        const a = getAt(path);
        for (const k of Object.keys(a)) {
          if (k === 'cta') continue;
          if (k === 'image') a[k] = null;
          else if (typeof a[k] === 'string') a[k] = '';
        }
        onChanged(); route();
      }
    }, icon('trash'), 'Buida l\'activitat (no en mostris cap)'),
    el('br'));
}

/* ════════════════════════════════════════════
   CAMPS
════════════════════════════════════════════ */
function isImageArray(path, val) {
  const k = path[path.length - 1];
  if (k === 'gallery') return true;
  return val.length > 0 && val.every((v) => typeof v === 'string' && IMG_RE.test(v));
}

function isImageField(path, val) {
  const k = path[path.length - 1];
  const parent = path[path.length - 2];
  if (k === 'image' || k === 'src') return true;
  if (parent === 'images' && (k === 'hero' || k === 'middle')) return true;
  if (typeof val === 'string' && /^(assets\/|https?:\/\/).+/.test(val) && IMG_RE.test(val)) return true;
  if (typeof k === 'number' && parent === 'gallery') return true;
  return false;
}

function detectKind(path, val) {
  if (Array.isArray(val)) return isImageArray(path, val) ? 'gallery' : 'array';
  if (isObj(val)) return 'object';
  if (typeof val === 'boolean') return 'bool';
  if (typeof val === 'number') return 'number';
  if (isImageField(path, val)) return 'image';
  if (lookup(SELECTS, path)) return 'select';
  const k = path[path.length - 1];
  if (k === 'href') return 'href';
  return 'text';
}

function isLongText(path, val) {
  const k = path[path.length - 1];
  const parent = path[path.length - 2];
  if (typeof k === 'number') return ['paragraphs', 'items'].includes(parent) || (typeof val === 'string' && val.length > 70);
  if (path.join('.').endsWith('meta.title')) return false;
  return LONG_KEYS.has(k) || (typeof val === 'string' && (val.length > 70 || /<br|<b>/i.test(val)));
}

function fieldWrap(path, control, { hideLabel = false, extraHint, labelExtra } = {}) {
  const hint = extraHint || lookup(HINTS, path);
  const last = path[path.length - 1];
  return el('div', { class: 'field' },
    hideLabel ? null : el('label', { class: 'field-label' },
      el('span', null, labelFor(path)),
      labelExtra || el('span', { class: 'key', text: typeof last === 'number' ? '' : String(last) })),
    control,
    hint ? el('div', { class: 'field-hint', text: hint }) : null);
}

function markChanged(input, path) {
  if (!state.original) return;
  const now = getAt(path);
  const was = getAt(path, state.original);
  input.classList.toggle('changed', JSON.stringify(now) !== JSON.stringify(was));
}

function renderField(path, depth, opts = {}) {
  const val = getAt(path);
  const kind = detectKind(path, val);
  switch (kind) {
    case 'object': return renderObject(path, depth);
    case 'array': return renderArray(path, depth, opts);
    case 'gallery': return renderGallery(path, opts);
    case 'bool': return renderBool(path, opts);
    case 'number': return renderNumber(path, opts);
    case 'image': return renderImage(path, opts);
    case 'select': return renderSelect(path, opts);
    case 'href': return renderHref(path, opts);
    default: return renderText(path, opts);
  }
}

function renderObject(path, depth) {
  const obj = getAt(path);
  const hint = lookup(HINTS, path);
  return el('div', { class: 'group' },
    el('div', { class: 'group-title' }, icon(SECTION_ICONS[path[path.length - 1]] || 'layers'), labelFor(path)),
    hint ? el('div', { class: 'field-hint', text: hint }) : null,
    hint ? el('br') : null,
    Object.keys(obj).map((k) => renderField([...path, k], depth + 1)));
}

function renderText(path, { hideLabel } = {}) {
  const val = getAt(path);
  const wasNull = val === null;
  const long = isLongText(path, val);
  const input = long
    ? el('textarea', { class: 'textarea', rows: '3', value: val ?? '', 'data-path': pkey(path), spellcheck: 'true' })
    : el('input', { class: 'input', type: 'text', value: val ?? '', 'data-path': pkey(path), spellcheck: 'true' });
  const isMeta = path.join('.').match(/meta\.(title|description)$/);
  const counter = isMeta ? el('span', { class: 'counter' }) : null;
  const limit = isMeta ? (isMeta[1] === 'title' ? 60 : 160) : 0;
  const updCounter = () => {
    if (!counter) return;
    const n = input.value.length;
    counter.textContent = `${n} / ${limit}`;
    counter.classList.toggle('over', n > limit);
  };
  updCounter();
  input.addEventListener('input', () => {
    const v = input.value;
    setAt(path, wasNull && v === '' ? null : v);
    if (long) autosize(input);
    updCounter();
    markChanged(input, path);
    onChanged();
  });
  markChanged(input, path);

  let control = input;
  if (long) {
    const insert = (before, after = '') => {
      const s = input.selectionStart ?? input.value.length;
      const e = input.selectionEnd ?? s;
      const sel = input.value.slice(s, e);
      input.setRangeText(before + sel + after, s, e, 'end');
      if (!sel && after) input.setSelectionRange(s + before.length, s + before.length);
      input.focus();
      input.dispatchEvent(new Event('input'));
    };
    control = el('div', null, input, el('div', { class: 'textarea-tools' },
      el('button', { class: 'chip-btn', type: 'button', title: 'Insereix un salt de línia', onclick: () => insert('<br> ') }, '↵ Salt de línia'),
      el('button', { class: 'chip-btn', type: 'button', title: 'Posa el text seleccionat en negreta', onclick: () => insert('<b>', '</b>') }, 'N  Negreta')));
  }
  if (hideLabel) return control;
  return fieldWrap(path, control, { labelExtra: counter || undefined });
}

function renderBool(path, { hideLabel } = {}) {
  const input = el('input', { type: 'checkbox', checked: !!getAt(path) });
  const txt = el('span', { text: getAt(path) ? 'Sí' : 'No' });
  input.addEventListener('change', () => { setAt(path, input.checked); txt.textContent = input.checked ? 'Sí' : 'No'; onChanged(); });
  const control = el('label', { class: 'toggle' }, input, el('span', { class: 'track' }), txt);
  return hideLabel ? control : fieldWrap(path, control);
}

function renderNumber(path, { hideLabel } = {}) {
  const input = el('input', { class: 'input', type: 'number', value: String(getAt(path)), step: 'any' });
  input.addEventListener('input', () => { const n = Number(input.value); if (input.value !== '' && !Number.isNaN(n)) { setAt(path, n); markChanged(input, path); onChanged(); } });
  return hideLabel ? input : fieldWrap(path, input);
}

function renderSelect(path, { hideLabel } = {}) {
  const opts = lookup(SELECTS, path);
  const val = getAt(path);
  const sel = el('select', { class: 'select' },
    opts.map(([v, l]) => el('option', { value: v, text: l })),
    opts.some(([v]) => v === val) ? null : el('option', { value: val ?? '', text: val ? `${val} (personalitzat)` : '(buit)' }));
  sel.value = val ?? '';
  sel.addEventListener('change', () => { setAt(path, sel.value); markChanged(sel, path); onChanged(); });
  return hideLabel ? sel : fieldWrap(path, sel);
}

function linkOptions() {
  const opts = [];
  for (const k of pageOrder()) {
    opts.push([pageFile(k), pageName(k)]);
  }
  if (state.data?.pages?.preus) opts.push(['preus.html#prova', 'Preus → Classe de prova gratuïta']);
  return opts;
}

function renderHref(path, { hideLabel } = {}) {
  const val = getAt(path) ?? '';
  const opts = linkOptions();
  const known = opts.some(([v]) => v === val);
  const sel = el('select', { class: 'select' },
    opts.map(([v, l]) => el('option', { value: v, text: `${l}  (${v})` })),
    el('option', { value: '__custom', text: 'Una altra adreça…' }));
  const input = el('input', { class: 'input', value: val, placeholder: 'https://… o pagina.html', spellcheck: 'false' });
  sel.value = known ? val : '__custom';
  input.classList.toggle('hidden', known);
  sel.addEventListener('change', () => {
    if (sel.value === '__custom') { input.classList.remove('hidden'); input.focus(); return; }
    input.classList.add('hidden');
    input.value = sel.value;
    setAt(path, sel.value); markChanged(sel, path); onChanged();
  });
  input.addEventListener('input', () => { setAt(path, input.value.trim()); markChanged(input, path); onChanged(); });
  markChanged(sel, path);
  const control = el('div', { class: 'href-ctl' }, sel, input);
  return hideLabel ? control : fieldWrap(path, control);
}

function imgSrc(p) {
  if (!p) return '';
  if (state.previews[p]) return state.previews[p];
  if (/^https?:\/\//.test(p)) return p;
  return '../' + p.replace(/^\/+/, '');
}

function thumbEl(p, cls = 'thumb') {
  const t = el('div', { class: cls });
  if (p) {
    const img = el('img', { src: imgSrc(p), alt: '', loading: 'lazy' });
    img.addEventListener('error', () => { t.replaceChildren(icon('alert')); t.title = 'No s\'ha trobat la imatge'; });
    if (/\.png$/i.test(p)) t.classList.add('contain');
    t.appendChild(img);
  } else t.appendChild(icon('image', 'ico-lg'));
  return t;
}

function renderImage(path, { hideLabel } = {}) {
  const val = getAt(path);
  const nullable = path[path.length - 1] === 'image' || val === null || (state.original && getAt(path, state.original) === null);
  const wrap = el('div', { class: 'img-field' });
  const paint = () => {
    const v = getAt(path);
    wrap.replaceChildren(
      thumbEl(v),
      el('div', { class: 'meta' },
        el('div', { class: 'path', text: v || 'Sense imatge' }),
        el('div', { class: 'acts' },
          el('button', { class: 'btn btn-soft btn-sm', type: 'button', onclick: async () => {
            const chosen = await pickImage(v, nullable);
            if (chosen === undefined || (chosen === null && !nullable)) return;
            setAt(path, chosen); paint(); onChanged();
          } }, icon('image'), v ? 'Canvia la imatge' : 'Tria una imatge'),
          nullable && v ? el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { setAt(path, null); paint(); onChanged(); } }, icon('x'), 'Treu la imatge') : null)));
    wrap.classList.toggle('changed', state.original ? JSON.stringify(getAt(path)) !== JSON.stringify(getAt(path, state.original)) : false);
  };
  paint();
  return hideLabel ? wrap : fieldWrap(path, wrap);
}

function renderGallery(path, { bare } = {}) {
  const arr = getAt(path);
  const grid = el('div', { class: 'gallery' });
  arr.forEach((p, i) => {
    const g = el('div', { class: 'g-item' },
      el('div', { class: 'g-img', title: 'Clica per canviar-la', onclick: async () => {
        const chosen = await pickImage(p, false);
        if (chosen === undefined || chosen === null) return;
        arr[i] = chosen; onChanged(); route();
      } }, el('img', { src: imgSrc(p), alt: '', loading: 'lazy' })),
      el('div', { class: 'g-bar' },
        el('span', { text: String(p).split('/').pop() }),
        el('div', null,
          el('button', { class: 'icon-btn', type: 'button', title: 'Mou a l\'esquerra', 'aria-label': 'Mou a l\'esquerra', disabled: i === 0, onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; onChanged(); route(); } }, icon('left')),
          el('button', { class: 'icon-btn', type: 'button', title: 'Mou a la dreta', 'aria-label': 'Mou a la dreta', disabled: i === arr.length - 1, onclick: () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; onChanged(); route(); } }, icon('right')),
          el('button', { class: 'icon-btn danger', type: 'button', title: 'Treu de la galeria', 'aria-label': 'Treu de la galeria', onclick: async () => {
            if (!(await confirmDialog('Treure la imatge', 'Vols treure aquesta imatge de la galeria? (La imatge no s\'esborra del web, només deixa de sortir aquí.)', { okLabel: 'Treu-la', danger: true }))) return;
            arr.splice(i, 1); onChanged(); route();
          } }, icon('trash')))));
    const img = g.querySelector('img');
    img.addEventListener('error', () => { img.replaceWith(el('div', { class: 'thumb' }, icon('alert'))); });
    grid.appendChild(g);
  });
  grid.appendChild(el('button', { class: 'g-add', type: 'button', onclick: async () => {
    const chosen = await pickImage(null, false);
    if (!chosen) return;
    arr.push(chosen); onChanged(); route();
  } }, icon('plus', 'ico-lg'), 'Afegeix una imatge'));
  const hint = lookup(HINTS, path);
  const content = el('div', null, hint ? el('div', { class: 'field-hint', text: hint }) : null, hint ? el('br') : null, grid);
  if (bare) return content;
  return el('div', { class: 'field' }, el('label', { class: 'field-label' }, el('span', null, labelFor(path)), el('span', { class: 'key', text: String(path[path.length - 1]) })), content);
}

function itemName(path) {
  return lookup(ITEM_NAMES, path) || 'element';
}

function itemSummary(item) {
  if (!isObj(item)) return stripHtml(item ?? '');
  const g = (k) => (typeof item[k] === 'string' ? stripHtml(item[k]) : '');
  if ('time' in item) return [g('time'), g('type')].filter(Boolean).join(' · ');
  if ('days' in item) return [g('days'), g('price')].filter(Boolean).join(' — ');
  if ('classes' in item && 'price' in item) return [g('classes'), g('price')].filter(Boolean).join(' — ');
  if ('year' in item) return [g('year'), g('title')].filter(Boolean).join(' · ');
  if ('day' in item) return g('day') + (Array.isArray(item.slots) ? ` (${item.slots.length} ${item.slots.length === 1 ? 'classe' : 'classes'})` : '');
  if ('title' in item && Array.isArray(item.items)) return g('title') + ` (${item.items.length})`;
  for (const k of ['title', 'titol', 'label', 'name', 'heading', 'alt', 'src', 'text']) if (g(k)) return g(k);
  const firstStr = Object.values(item).find((v) => typeof v === 'string' && v.trim());
  return firstStr ? stripHtml(firstStr) : '';
}

function findSample(normTarget, node = state.data, path = []) {
  if (normPath(path).join('.') === normTarget && node !== undefined) return node;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) { const r = findSample(normTarget, node[i], [...path, i]); if (r !== undefined) return r; }
  } else if (isObj(node)) {
    for (const k of Object.keys(node)) { const r = findSample(normTarget, node[k], [...path, k]); if (r !== undefined) return r; }
  }
  return undefined;
}

function blankFrom(sample) {
  if (Array.isArray(sample)) return [];
  if (isObj(sample)) { const o = {}; for (const k of Object.keys(sample)) o[k] = blankFrom(sample[k]); return o; }
  if (typeof sample === 'boolean') return false;
  if (typeof sample === 'number') return 0;
  if (sample === null) return null;
  return '';
}

function newItemFor(path) {
  const itemPath = [...path, 0];
  const tpl = lookup(TEMPLATES, itemPath);
  if (tpl !== undefined) return clone(tpl);
  const arr = getAt(path);
  if (arr.length) return blankFrom(arr[0]);
  const sample = findSample(normPath(itemPath).join('.'));
  if (sample !== undefined) return blankFrom(sample);
  return '';
}

function swapOpen(a, b) {
  const ka = pkey(a), kb = pkey(b);
  const next = new Set();
  for (const k of state.open) {
    if (k === ka || k.startsWith(ka + '\u001f')) next.add(kb + k.slice(ka.length));
    else if (k === kb || k.startsWith(kb + '\u001f')) next.add(ka + k.slice(kb.length));
    else next.add(k);
  }
  state.open = next;
}

function shiftOpenAfterDelete(path, index) {
  const base = pkey(path);
  const next = new Set();
  for (const k of state.open) {
    if (!k.startsWith(base + '\u001f')) { next.add(k); continue; }
    const rest = k.slice(base.length + 1).split('\u001f');
    const i = Number(rest[0]);
    if (i === index) continue;
    if (i > index) rest[0] = String(i - 1);
    next.add(base + '\u001f' + rest.join('\u001f'));
  }
  state.open = next;
}

function renderArray(path, depth, { bare } = {}) {
  const arr = getAt(path);
  const name = itemName(path);
  const list = el('div', { class: 'list' });
  const objects = arr.some((v) => isObj(v) || Array.isArray(v)) || (arr.length === 0 && isObj(newItemFor(path)));

  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    swapOpen([...path, i], [...path, j]);
    onChanged(); route();
  };
  const remove = async (i) => {
    const v = arr[i];
    const empty = v === '' || v === null || (isObj(v) && !itemSummary(v));
    if (!empty) {
      const s = itemSummary(v);
      const ok = await confirmDialog(`Eliminar ${name}`, `Segur que vols eliminar ${s ? '«' + (s.length > 80 ? s.slice(0, 80) + '…' : s) + '»' : 'aquest element'}?`, { okLabel: 'Elimina', danger: true });
      if (!ok) return;
    }
    arr.splice(i, 1);
    shiftOpenAfterDelete(path, i);
    onChanged(); route();
  };
  const ctrls = (i) => el('div', { class: 'row-ctrl' },
    el('button', { class: 'icon-btn', type: 'button', title: 'Mou amunt', 'aria-label': 'Mou amunt', disabled: i === 0, onclick: (e) => { e.stopPropagation(); move(i, -1); } }, icon('up')),
    el('button', { class: 'icon-btn', type: 'button', title: 'Mou avall', 'aria-label': 'Mou avall', disabled: i === arr.length - 1, onclick: (e) => { e.stopPropagation(); move(i, 1); } }, icon('down')),
    el('button', { class: 'icon-btn danger', type: 'button', title: 'Elimina', 'aria-label': 'Elimina', onclick: (e) => { e.stopPropagation(); remove(i); } }, icon('trash')));

  if (!arr.length) list.appendChild(el('div', { class: 'list-empty', text: 'Encara no hi ha cap element.' }));

  arr.forEach((v, i) => {
    const ip = [...path, i];
    if (objects && (isObj(v) || Array.isArray(v))) {
      const id = pkey(ip);
      const open = state.open.has(id);
      const sumTxt = itemSummary(v);
      const sum = el('div', { class: 'sum' + (sumTxt ? '' : ' empty'), text: sumTxt || `(${name} sense títol)` });
      const body = el('div', { class: 'item-body' });
      if (isObj(v)) for (const k of Object.keys(v)) body.appendChild(renderField([...ip, k], depth + 1));
      else body.appendChild(renderField(ip, depth + 1, { bare: true }));
      body.addEventListener('input', () => { const s = itemSummary(getAt(ip)); sum.textContent = s || `(${name} sense títol)`; sum.classList.toggle('empty', !s); });
      body.addEventListener('change', () => { const s = itemSummary(getAt(ip)); sum.textContent = s || `(${name} sense títol)`; sum.classList.toggle('empty', !s); });
      const item = el('div', { class: 'item' + (open ? ' open' : '') });
      const head = el('div', { class: 'item-head', role: 'button', tabindex: '0', 'aria-expanded': String(open) },
        el('span', { class: 'num', text: String(i + 1) }), sum, ctrls(i), icon('down', 'chev'));
      const toggle = () => {
        const o = item.classList.toggle('open');
        head.setAttribute('aria-expanded', String(o));
        if (o) { state.open.add(id); autosizeAll(item); } else state.open.delete(id);
      };
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', (e) => { if (e.target === head && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } });
      item.append(head, body);
      list.appendChild(item);
    } else {
      list.appendChild(el('div', { class: 'row' },
        el('span', { class: 'row-num', text: String(i + 1) }),
        el('div', { class: 'row-main' }, renderField(ip, depth + 1, { hideLabel: true })),
        ctrls(i)));
    }
  });

  const add = el('button', { class: 'add-btn', type: 'button', onclick: () => {
    const item = newItemFor(path);
    arr.push(item);
    const ip = [...path, arr.length - 1];
    state.open.add(pkey(ip));
    onChanged(); route();
    requestAnimationFrame(() => {
      const k = pkey(ip);
      const target = $$('[data-path]').find((n) => n.dataset.path === k || n.dataset.path.startsWith(k + '')) || null;
      if (target) { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); target.focus({ preventScroll: true }); }
    });
  } }, icon('plus'), 'Afegeix ' + name);

  const hint = lookup(HINTS, path);
  const content = el('div', null, hint ? el('div', { class: 'field-hint', text: hint }) : null, hint ? el('br') : null, list, add);
  if (bare) return content;
  return el('div', { class: 'group' },
    el('div', { class: 'group-title' }, icon(SECTION_ICONS[path[path.length - 1]] || 'list'), labelFor(path), el('span', { class: 'counter', text: `(${arr.length})` })),
    content);
}

function autosize(t) {
  if (!t.offsetParent) return;
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight + 2, 640) + 'px';
}
function autosizeAll(root) { $$('textarea.textarea', root).forEach(autosize); }

/* ════════════════════════════════════════════
   IMATGES
════════════════════════════════════════════ */
async function loadImages(force) {
  if (state.images && !force) return state.images;
  const list = await gh(`${repoBase()}/contents/${encPath(IMAGES_DIR)}?ref=${encodeURIComponent(state.cfg.branch)}`);
  state.images = list.filter((f) => f.type === 'file' && IMG_RE.test(f.name))
    .map((f) => ({ name: f.name, path: f.path, sha: f.sha, size: f.size, url: f.download_url }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return state.images;
}

function imageUsage(path) {
  const uses = [];
  const walk = (node, p) => {
    if (typeof node === 'string') { if (node === path) uses.push(p); return; }
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, [...p, i]));
    else if (isObj(node)) Object.keys(node).forEach((k) => walk(node[k], [...p, k]));
  };
  if (state.data) walk(state.data, []);
  return uses;
}

function slugName(name) {
  const dot = name.lastIndexOf('.');
  let base = dot > 0 ? name.slice(0, dot) : name;
  let ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : 'jpg';
  if (ext === 'jpeg') ext = 'jpg';
  base = base.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'imatge';
  return { base, ext };
}

function readAsDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}

async function maybeCompress(file) {
  if (!/^image\/(jpeg|webp)$/.test(file.type) || file.size < 900 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = 2000;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    if (blob && blob.size < file.size) return new File([blob], file.name.replace(/\.(webp|jpeg)$/i, '.jpg'), { type: 'image/jpeg' });
  } catch { /* si no es pot comprimir, es puja l'original */ }
  return file;
}

async function uploadImage(file) {
  if (!/^image\//.test(file.type) && !IMG_RE.test(file.name)) throw new Error(`«${file.name}» no és una imatge.`);
  const f = await maybeCompress(file);
  if (f.size > 20 * 1024 * 1024) throw new Error(`«${file.name}» és massa gran (màxim 20 MB).`);
  const list = await loadImages();
  const { base, ext } = slugName(f.name);
  let name = `${base}.${ext}`;
  let n = 2;
  while (list.some((x) => x.name.toLowerCase() === name)) name = `${base}-${n++}.${ext}`;
  const dataUrl = await readAsDataURL(f);
  const b64 = dataUrl.split(',')[1];
  const path = `${IMAGES_DIR}/${name}`;
  const r = await ghPutFile(path, b64, `Panell: puja la imatge ${name}`);
  state.previews[path] = dataUrl;
  list.push({ name, path, sha: r.content.sha, size: f.size, url: r.content.download_url });
  list.sort((a, b) => a.name.localeCompare(b.name));
  return path;
}

function uploadZone(onDone, multiple = true) {
  const input = el('input', { type: 'file', accept: 'image/*', class: 'hidden', multiple: multiple ? true : null });
  const label = el('div', null, icon('upload', 'ico-lg'), el('div', null, el('b', { text: 'Puja imatges' }), ' — arrossega-les aquí o ', el('a', { href: '#', text: 'tria-les de l\'ordinador', onclick: (e) => { e.preventDefault(); input.click(); } })),
    el('div', { class: 'field-hint', text: 'Les fotos grans es redueixen automàticament perquè el web carregui ràpid.' }));
  label.querySelector('svg').style.margin = '0 auto .4rem';
  const zone = el('div', { class: 'dropzone' }, label, input);
  const handle = async (files) => {
    files = Array.from(files || []);
    if (!files.length) return;
    zone.replaceChildren(el('span', { class: 'spinner' }), el('div', { text: `Pujant ${files.length} ${files.length === 1 ? 'imatge' : 'imatges'}…` }));
    const done = [];
    for (const f of files) {
      try { done.push(await uploadImage(f)); }
      catch (e) { toast(e.message, 'err', 7000); }
    }
    zone.replaceChildren(label, input);
    if (done.length) toast(done.length === 1 ? 'Imatge pujada.' : `${done.length} imatges pujades.`);
    onDone(done);
  };
  input.addEventListener('change', () => handle(input.files));
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); handle(e.dataTransfer.files); });
  return zone;
}

/* Selector d'imatges. Retorna el camí triat, null (sense imatge) o undefined (cancel·lat) */
function pickImage(current, allowNone) {
  return new Promise((resolve) => {
    let result;
    const grid = el('div', { class: 'lib-grid' }, el('div', { class: 'loading' }, el('span', { class: 'spinner' })));
    grid.querySelector('.loading').style.minHeight = '160px';
    const paint = (list) => {
      grid.replaceChildren(...list.map((img) => el('button', {
        class: 'lib-item' + (img.path === current ? ' sel' : ''), type: 'button', title: img.name,
        onclick: () => { result = img.path; m.close(); }
      }, el('div', { class: 'li-img' }, el('img', { src: imgSrc(img.path), alt: '', loading: 'lazy' })),
      el('div', { class: 'li-name', text: img.name }), el('div', { class: 'li-sub', text: fmtSize(img.size) }))));
      if (!list.length) grid.replaceChildren(el('div', { class: 'list-empty', text: 'No hi ha imatges.' }));
    };
    const zone = uploadZone((paths) => { if (paths.length === 1) { result = paths[0]; m.close(); } else loadImages().then(paint); }, true);
    const m = modal({
      title: 'Tria una imatge', size: 'lg',
      body: el('div', null, zone, grid),
      onClose: () => resolve(result),
      actions: [
        allowNone && current ? { label: 'Sense imatge', cls: 'btn-ghost', icon: 'x', onClick: (close) => { result = null; close(); } } : null,
        { label: 'Cancel·la', cls: 'btn-ghost' }
      ].filter(Boolean)
    });
    loadImages().then(paint).catch((e) => grid.replaceChildren(el('div', { class: 'notice err' }, icon('alert'), el('div', { text: e.message }))));
  });
}

function viewImages(c) {
  setTop({ crumb: 'Eines', name: 'Imatges', viewUrl: null });
  c.appendChild(el('div', { class: 'page-head' }, el('div', null, el('h2', { text: 'Imatges del web' }),
    el('p', { text: 'Totes les imatges de la carpeta assets/images. Pujar o eliminar una imatge es publica immediatament. Per fer-la sortir en una pàgina, tria-la des de l\'editor d\'aquella pàgina.' })),
    el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { loadImages(true).then(paint).catch((e) => toast(e.message, 'err')); } }, icon('refresh'), 'Actualitza')));
  const grid = el('div', { class: 'lib-grid' }, el('div', { class: 'loading' }, el('span', { class: 'spinner' })));
  grid.querySelector('.loading').style.minHeight = '200px';
  c.appendChild(uploadZone(() => loadImages().then(paint)));
  c.appendChild(grid);

  function paint(list) {
    grid.replaceChildren(...list.map((img) => {
      const uses = imageUsage(img.path);
      const prot = PROTECTED_IMAGES[img.path];
      const card = el('div', { class: 'lib-item', title: img.name },
        el('div', { class: 'li-img' }, el('img', { src: imgSrc(img.path), alt: '', loading: 'lazy' })),
        el('div', { class: 'li-name', text: img.name }),
        el('div', { class: 'li-sub', text: `${fmtSize(img.size)} · ${prot ? 'la fa servir el web' : uses.length ? `en ús (${uses.length})` : 'no s\'utilitza'}` }),
        (uses.length || prot) ? el('span', { class: 'used', text: 'En ús' }) : null,
        el('button', { class: 'icon-btn danger del', type: 'button', title: 'Elimina la imatge', 'aria-label': 'Elimina la imatge', onclick: () => deleteImage(img, uses, prot).then((ok) => ok && paint(state.images)) }, icon('trash')));
      card.addEventListener('click', (e) => {
        if (e.target.closest('.del')) return;
        modal({
          title: img.name, size: 'lg',
          body: el('div', null,
            el('img', { src: imgSrc(img.path), alt: '' }),
            el('br'),
            el('p', { class: 'field-hint', text: `${img.path} · ${fmtSize(img.size)}` }),
            prot ? el('p', { class: 'field-hint', text: 'Ús: ' + prot }) : null,
            uses.length ? el('div', null, el('br'), el('b', { text: 'On surt:' }), el('ul', null, uses.map((u) => el('li', { class: 'field-hint', text: humanPath(u) })))) : (!prot ? el('p', { class: 'field-hint', text: 'Ara mateix no surt a cap pàgina.' }) : null)),
          actions: [{ label: 'Tanca' }]
        });
      });
      return card;
    }));
  }
  loadImages().then(paint).catch((e) => grid.replaceChildren(el('div', { class: 'notice err' }, icon('alert'), el('div', { text: e.message }))));
}

async function deleteImage(img, uses, prot) {
  if (prot) {
    modal({ title: 'No es pot eliminar', body: el('p', { text: `Aquesta imatge la fa servir directament el codi del web (${prot}). Si l'elimines, el web es veuria malament.` }), actions: [{ label: 'D\'acord', cls: 'btn-primary' }] });
    return false;
  }
  if (uses.length) {
    modal({
      title: 'Imatge en ús',
      body: el('div', null, el('p', { text: 'Aquesta imatge surt en aquests llocs. Primer treu-la o canvia-la allà (i desa), i després ja la podràs eliminar:' }),
        el('ul', null, uses.map((u) => el('li', { class: 'field-hint', text: humanPath(u) })))),
      actions: [{ label: 'D\'acord', cls: 'btn-primary' }]
    });
    return false;
  }
  const ok = await confirmDialog('Eliminar la imatge', `Segur que vols eliminar «${img.name}» del web? Aquesta acció es publica immediatament.`, { okLabel: 'Elimina', danger: true });
  if (!ok) return false;
  try {
    await ghDeleteFile(img.path, `Panell: elimina la imatge ${img.name}`, img.sha);
    state.images = state.images.filter((x) => x.path !== img.path);
    toast('Imatge eliminada.');
    return true;
  } catch (e) {
    toast(e.message, 'err');
    return false;
  }
}

/* ════════════════════════════════════════════
   DIFERÈNCIES I DESAR
════════════════════════════════════════════ */
function humanPath(path) {
  const out = [];
  for (let i = 0; i < path.length; i++) {
    const sub = path.slice(0, i + 1);
    if (i === 0 && path[0] === 'pages') continue;
    if (i === 0 && path[0] === 'site') { out.push('Dades del centre'); continue; }
    out.push(labelFor(sub));
  }
  return out.join(' › ') || 'Tot el fitxer';
}

function diff(a, b, path = [], out = []) {
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (i >= a.length) out.push({ type: 'add', path: [...path, i], to: b[i] });
      else if (i >= b.length) out.push({ type: 'del', path: [...path, i], from: a[i] });
      else diff(a[i], b[i], [...path, i], out);
    }
    return out;
  }
  if (isObj(a) && isObj(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in b)) out.push({ type: 'del', path: [...path, k], from: a[k] });
      else if (!(k in a)) out.push({ type: 'add', path: [...path, k], to: b[k] });
      else diff(a[k], b[k], [...path, k], out);
    }
    return out;
  }
  out.push({ type: 'mod', path, from: a, to: b });
  return out;
}

function preview(v) {
  if (v === null || v === undefined) return '(sense valor)';
  if (typeof v === 'string') return v === '' ? '(buit)' : v.length > 220 ? v.slice(0, 220) + '…' : v;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (isObj(v) || Array.isArray(v)) { const s = itemSummary(v); return s ? s : JSON.stringify(v).slice(0, 160); }
  return String(v);
}

function defaultCommitMessage(changes) {
  const roots = [];
  for (const ch of changes) {
    const p = ch.path;
    let name;
    if (p[0] === 'pages' && p[1]) name = pageName(p[1]);
    else if (p[0] === 'site') name = 'Dades del centre';
    else if (p[0] === 'global_labels') name = 'Textos comuns';
    else if (p[0] === '_GUIDE_') name = 'Guia';
    else name = humanize(p[0] || 'contingut');
    if (!roots.includes(name)) roots.push(name);
  }
  return 'Panell: actualitza ' + (roots.length > 4 ? roots.slice(0, 4).join(', ') + '…' : roots.join(', '));
}

function saveFlow() {
  if (!state.token) return;
  if (!state.data) { toast('Primer cal reparar el fitxer a l\'editor avançat.', 'warn'); return; }
  const repairing = !state.original;
  const changes = repairing ? [] : diff(state.original, state.data);
  if (!repairing && !changes.length) { toast('No hi ha canvis per desar.', 'warn'); return; }
  const msg = el('input', { class: 'input', value: repairing ? 'Panell: repara el format de content.json' : defaultCommitMessage(changes), maxlength: '120' });
  const list = el('div', { class: 'diff' }, changes.slice(0, 150).map((ch) => el('div', { class: 'diff-row' },
    el('div', { class: 'p' }, el('span', { class: 'tag ' + ch.type, text: ch.type === 'mod' ? 'Canviat' : ch.type === 'add' ? 'Afegit' : 'Eliminat' }), el('span', { text: humanPath(ch.path) })),
    el('div', { class: 'v' },
      ch.type !== 'add' ? el('div', { class: 'from', text: preview(ch.from) }) : null,
      ch.type !== 'del' ? el('div', { class: 'to', text: preview(ch.to) }) : null))));
  if (changes.length > 150) list.appendChild(el('div', { class: 'field-hint', text: `… i ${changes.length - 150} canvis més.` }));
  modal({
    title: 'Desar i publicar', size: 'lg',
    body: el('div', null,
      repairing ? el('div', { class: 'notice info' }, icon('info'), el('div', { text: 'Es desarà el fitxer de continguts reparat.' }))
        : el('p', { class: 'field-hint', text: `Revisa els ${changes.length} ${changes.length === 1 ? 'canvi' : 'canvis'} abans de publicar:` }),
      repairing ? null : list,
      el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Descripció del canvi (per a l\'historial)' }), msg)),
    actions: [
      { label: 'Continua editant' },
      { label: 'Publica', cls: 'btn-primary', icon: 'upload', onClick: async (close) => {
        const btn = $('.modal-foot .btn-primary');
        setBusy(btn, true, 'Publicant…');
        const ok = await publish(msg.value.trim() || 'Panell: actualitza el contingut');
        if (ok) close(); else setBusy(btn, false);
      } }
    ]
  });
}

async function publish(message, force = false) {
  const text = JSON.stringify(state.data, null, 2) + '\n';
  try {
    if (force) state.sha = (await ghGetFile(CONTENT_PATH)).sha;
    const r = await ghPutFile(CONTENT_PATH, utf8ToB64(text), message, state.sha);
    state.sha = r.content.sha;
    setLoaded(JSON.parse(text));
    state.broken = null;
    state.commits = null;
    route();
    renderTopbar(currentTop);
    toast('Publicat! El web s\'actualitzarà en 1 o 2 minuts.', 'ok', 6500);
    return true;
  } catch (e) {
    if (e.status === 409 || e.status === 422) return handleConflict(message);
    if (e.status === 401) { toast('El token ha caducat. Ves a «Seguretat i accés» per posar-ne un de nou (no perds els canvis).', 'err', 9000); return false; }
    toast(e.message, 'err', 8000);
    return false;
  }
}

async function handleConflict(message) {
  let latest;
  try { latest = await ghGetFile(CONTENT_PATH); } catch (e) { toast(e.message, 'err'); return false; }
  let latestData = null;
  try { latestData = JSON.parse(latest.text); } catch { /* invàlid */ }
  if (latestData && state.original && JSON.stringify(latestData) === state.originalStr) {
    state.sha = latest.sha;
    return publish(message);
  }
  return new Promise((resolve) => {
    modal({
      title: 'El contingut ha canviat',
      body: el('div', null,
        el('div', { class: 'notice warn' }, icon('alert'), el('div', { text: 'Mentre editaves, algú (o tu des d\'un altre lloc) ha publicat canvis al fitxer de continguts.' })),
        el('p', { text: 'Pots sobreescriure-ho amb la teva versió, o bé carregar la versió nova (i perdre els teus canvis sense desar).' })),
      onClose: () => resolve(false),
      actions: [
        { label: 'Carrega la versió nova', cls: 'btn-ghost', onClick: (close) => {
          if (latestData) { setLoaded(latestData); state.sha = latest.sha; route(); renderTopbar(currentTop); toast('S\'ha carregat la versió més nova.'); }
          close();
        } },
        { label: 'Sobreescriu amb la meva', cls: 'btn-danger', onClick: async (close) => { close(); resolve(await publish(message, true)); } }
      ]
    });
  });
}

/* ════════════════════════════════════════════
   HISTORIAL
════════════════════════════════════════════ */
async function loadCommits(n = 30) {
  if (state.commits && state.commits.length >= n) return state.commits.slice(0, n);
  const list = await gh(`${repoBase()}/commits?path=${encodeURIComponent(CONTENT_PATH)}&sha=${encodeURIComponent(state.cfg.branch)}&per_page=${n}`);
  state.commits = list;
  return list;
}

function commitList(list, withRestore) {
  if (!list.length) return el('div', { class: 'list-empty', text: 'Encara no hi ha canvis.' });
  return el('div', { class: 'commits' }, list.map((cm, idx) => el('div', { class: 'commit' },
    cm.author?.avatar_url ? el('img', { src: cm.author.avatar_url, alt: '' }) : el('div', { class: 'thumb' }, icon('user')),
    el('div', { class: 'cm' },
      el('div', { class: 'm', text: cm.commit.message.split('\n')[0] }),
      el('div', { class: 's', text: `${cm.commit.author?.name || cm.author?.login || ''} · ${fmtDate(cm.commit.author?.date)}` })),
    el('a', { class: 'sha', href: cm.html_url, target: '_blank', rel: 'noopener', title: 'Veure a GitHub', text: cm.sha.slice(0, 7) }),
    withRestore && idx > 0 ? el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => restoreVersion(cm) }, icon('undo'), 'Recupera') : null)));
}

async function restoreVersion(cm) {
  const ok = await confirmDialog('Recuperar una versió anterior',
    `Es carregarà al panell el contingut tal com estava el ${fmtDate(cm.commit.author?.date)} («${cm.commit.message.split('\n')[0]}»). No es publicarà fins que premis «Desa i publica».`,
    { okLabel: 'Carrega aquesta versió' });
  if (!ok) return;
  try {
    const f = await ghGetFile(CONTENT_PATH, cm.sha);
    let data;
    try { data = JSON.parse(f.text); } catch { toast('Aquesta versió té el format malmès i no es pot recuperar des d\'aquí.', 'err', 7000); return; }
    if (state.broken) { state.broken = null; }
    state.data = data;
    if (!state.original) { state.original = null; }
    state.dirty = true;
    location.hash = '#/';
    route();
    onChanged();
    renderTopbar(currentTop);
    toast('Versió carregada. Revisa-la i prem «Desa i publica» per publicar-la.', 'ok', 7000);
  } catch (e) { toast(e.message, 'err'); }
}

function viewHistory(c) {
  setTop({ crumb: 'Eines', name: 'Historial de canvis', viewUrl: null });
  c.appendChild(el('div', { class: 'page-head' }, el('div', null, el('h2', { text: 'Historial de canvis' }),
    el('p', { text: 'Cada vegada que es publica es guarda una versió. Si t\'equivoques, pots recuperar qualsevol versió anterior.' })),
    el('a', { class: 'btn btn-ghost btn-sm', href: `https://github.com/${state.cfg.owner}/${state.cfg.repo}/commits/${state.cfg.branch}`, target: '_blank', rel: 'noopener' }, icon('ext'), 'Obre a GitHub')));
  const card = el('div', { class: 'card open' }, el('div', { class: 'card-body' }, el('div', { class: 'loading' }, el('span', { class: 'spinner' }))));
  card.querySelector('.loading').style.minHeight = '160px';
  c.appendChild(card);
  state.commits = null;
  loadCommits(30).then((list) => card.querySelector('.card-body').replaceChildren(commitList(list, true)))
    .catch((e) => card.querySelector('.card-body').replaceChildren(el('div', { class: 'notice err' }, icon('alert'), el('div', { text: e.message }))));
}

/* ════════════════════════════════════════════
   EDITOR JSON AVANÇAT
════════════════════════════════════════════ */
function viewJson(c) {
  setTop({ crumb: 'Eines', name: 'Editor avançat (JSON)', viewUrl: null });
  const text = state.broken ? state.broken.text : JSON.stringify(state.data, null, 2);
  const ta = el('textarea', { class: 'json-editor', spellcheck: 'false', value: text, 'aria-label': 'Contingut JSON' });
  const status = el('div');
  const showErr = (msg) => status.replaceChildren(el('div', { class: 'notice err' }, icon('alert'), el('div', { text: msg })));

  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); }
  });

  const parse = () => {
    try { return JSON.parse(ta.value); } catch (e) {
      const m = /position (\d+)/.exec(e.message);
      let where = '';
      if (m) {
        const pos = Number(m[1]);
        const before = ta.value.slice(0, pos);
        const line = before.split('\n').length;
        const col = pos - before.lastIndexOf('\n');
        where = ` (línia ${line}, columna ${col})`;
        ta.focus(); ta.setSelectionRange(pos, Math.min(pos + 1, ta.value.length));
      }
      showErr('El JSON té un error de format' + where + ': ' + e.message);
      return undefined;
    }
  };

  c.appendChild(el('div', { class: 'page-head' }, el('div', null, el('h2', { text: 'Editor avançat' }),
    el('p', { text: 'Aquí veus tot el fitxer data/content.json tal com és. Serveix per afegir o treure camps nous. Si no saps què és JSON, fes servir les altres seccions.' }))));
  if (state.broken) {
    c.appendChild(el('div', { class: 'notice err' }, icon('alert'), el('div', null,
      el('b', { text: 'El fitxer de continguts del repositori té un error de format i el web no el pot llegir. ' }),
      'Corregeix-lo aquí (sovint és una coma de més o de menys), prem «Valida i aplica» i després «Desa i publica». També pots recuperar una versió anterior a l\'Historial. ',
      el('br'), el('span', { class: 'mono', text: state.broken.error }))));
  } else {
    c.appendChild(el('div', { class: 'notice warn' }, icon('alert'), el('div', { text: 'Compte: aquí es pot trencar l\'estructura del web. Els canvis no es publiquen fins que premis «Desa i publica».' })));
  }
  c.appendChild(status);
  c.appendChild(ta);
  c.appendChild(el('div', { class: 'textarea-tools' },
    el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => {
      const data = parse();
      if (data === undefined) return;
      if (!isObj(data)) return showErr('El contingut ha de ser un objecte JSON ({ … }).');
      state.data = data;
      if (state.broken) { state.broken = null; state.original = null; state.originalStr = ''; state.dirty = true; renderTopbar(currentTop); renderSidebar(); }
      else onChanged();
      status.replaceChildren(el('div', { class: 'notice info' }, icon('check'), el('div', { text: 'JSON vàlid i aplicat. Ara pots continuar editant o prémer «Desa i publica».' })));
      ta.value = JSON.stringify(state.data, null, 2);
    } }, icon('check'), 'Valida i aplica'),
    el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { const d = parse(); if (d !== undefined) { ta.value = JSON.stringify(d, null, 2); status.replaceChildren(); } } }, icon('code'), 'Formata'),
    state.data ? el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { ta.value = JSON.stringify(state.data, null, 2); status.replaceChildren(); } }, icon('undo'), 'Desfés els canvis d\'aquest editor') : null));
  if (state.broken) {
    const m = /position (\d+)/.exec(state.broken.error);
    if (m) setTimeout(() => { ta.focus(); ta.setSelectionRange(Number(m[1]), Number(m[1]) + 1); }, 50);
  }
}

/* ════════════════════════════════════════════
   SEGURETAT
════════════════════════════════════════════ */
function viewSecurity(c) {
  setTop({ crumb: 'Eines', name: 'Seguretat i accés', viewUrl: null });
  c.appendChild(el('div', { class: 'page-head' }, el('div', null, el('h2', { text: 'Seguretat i accés' }),
    el('p', { text: 'Canvia l\'usuari o la contrasenya del panell, o posa un token de GitHub nou quan caduqui.' }))));

  /* Canviar contrasenya */
  const cur = passwordInput({ autocomplete: 'current-password' });
  const nu = el('input', { class: 'input', value: state.user || '', autocomplete: 'username', maxlength: '64' });
  const p1 = passwordInput({ autocomplete: 'new-password' });
  const p2 = passwordInput({ autocomplete: 'new-password' });
  const err1 = el('div', { class: 'auth-error hidden' });
  const btn1 = el('button', { class: 'btn btn-primary', type: 'submit' }, icon('key'), 'Canvia la contrasenya');
  const f1 = el('form', null, err1,
    el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Contrasenya actual' }), cur.wrap),
    el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Nom d\'usuari (pots canviar-lo)' }), nu),
    el('div', { class: 'grid-2' },
      el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Contrasenya nova' }), p1.wrap),
      el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Repeteix-la' }), p2.wrap)),
    el('div', { class: 'field-hint', text: `Mínim ${MIN_PASSWORD} caràcters, combinant majúscules, minúscules, números i símbols.` }), el('br'),
    btn1);
  f1.addEventListener('submit', async (e) => {
    e.preventDefault();
    const show = (m) => { err1.replaceChildren(icon('alert'), el('div', { text: m })); err1.classList.remove('hidden'); };
    err1.classList.add('hidden');
    const u = nu.value.trim();
    if (u.length < 3) return show('El nom d\'usuari ha de tenir com a mínim 3 caràcters.');
    const probs = passwordProblems(p1.input.value, u);
    if (probs.length) return show('La contrasenya nova ' + probs.join('; ') + '.');
    if (p1.input.value !== p2.input.value) return show('Les contrasenyes noves no coincideixen.');
    setBusy(btn1, true, 'Comprovant…');
    try {
      await decryptToken(state.user, cur.input.value, state.auth);
    } catch {
      setBusy(btn1, false);
      return show('La contrasenya actual no és correcta.');
    }
    try {
      setBusy(btn1, true, 'Desant…');
      const auth = await encryptToken(u, p1.input.value, state.token);
      const sha = state.authSha || (await ghGetFile(AUTH_PATH)).sha;
      const r = await ghPutFile(AUTH_PATH, utf8ToB64(JSON.stringify(auth, null, 2) + '\n'), 'Panell: canvia les credencials d\'accés', sha);
      state.auth = auth; state.authSha = r.content.sha; state.user = u;
      cur.input.value = p1.input.value = p2.input.value = '';
      setBusy(btn1, false);
      toast('Contrasenya canviada. A partir d\'ara entra amb les noves dades.');
      renderShell(); route();
    } catch (e2) {
      setBusy(btn1, false);
      show(e2.message);
    }
  });
  c.appendChild(sectionCard(['__sec', 'pass'], 'Canviar usuari i contrasenya', 'key', [f1], true));

  /* Token nou */
  const tk = el('input', { class: 'input mono', placeholder: 'github_pat_…', autocomplete: 'off', spellcheck: 'false' });
  const pw = passwordInput({ autocomplete: 'current-password' });
  const err2 = el('div', { class: 'auth-error hidden' });
  const btn2 = el('button', { class: 'btn btn-primary', type: 'submit' }, icon('refresh'), 'Desa el token nou');
  const f2 = el('form', null, err2,
    el('p', { class: 'field-hint' }, 'Crea\'l a ', el('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener noreferrer', text: 'GitHub → Fine-grained tokens' }),
      ` amb accés només a ${state.cfg.owner}/${state.cfg.repo} i el permís «Contents: Read and write».`), el('br'),
    el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'Token nou' }), tk),
    el('div', { class: 'field' }, el('label', { class: 'field-label', text: 'La teva contrasenya actual' }), pw.wrap), el('br'),
    btn2);
  f2.addEventListener('submit', async (e) => {
    e.preventDefault();
    const show = (m) => { err2.replaceChildren(icon('alert'), el('div', { text: m })); err2.classList.remove('hidden'); };
    err2.classList.add('hidden');
    const t = tk.value.trim();
    if (!t) return show('Enganxa el token nou.');
    setBusy(btn2, true, 'Comprovant…');
    try { await decryptToken(state.user, pw.input.value, state.auth); } catch { setBusy(btn2, false); return show('La contrasenya no és correcta.'); }
    try {
      await checkToken(t);
      const auth = await encryptToken(state.user, pw.input.value, t);
      const sha = state.authSha || (await ghGetFile(AUTH_PATH, null, t)).sha;
      const r = await ghPutFile(AUTH_PATH, utf8ToB64(JSON.stringify(auth, null, 2) + '\n'), 'Panell: actualitza el token xifrat', sha, t);
      state.auth = auth; state.authSha = r.content.sha; state.token = t;
      tk.value = pw.input.value = '';
      setBusy(btn2, false);
      toast('Token actualitzat correctament.');
    } catch (e2) { setBusy(btn2, false); show(e2.message); }
  });
  c.appendChild(sectionCard(['__sec', 'token'], 'Posar un token de GitHub nou', 'refresh', [f2], false));

  /* Info */
  c.appendChild(sectionCard(['__sec', 'info'], 'Com està protegit el panell', 'shield', [
    el('ul', { class: 'steps' },
      el('li', null, 'El token de GitHub es guarda ', el('b', { text: 'xifrat' }), ' (AES-GCM de 256 bits) a ', el('code', { text: AUTH_PATH }), '. La clau de xifratge surt del teu usuari i contrasenya amb ', el('b', { text: `PBKDF2-SHA256 (${(state.auth?.kdf?.iterations || KDF_ITERATIONS).toLocaleString('ca-ES')} iteracions)` }), ', cosa que fa inviable endevinar-la.'),
      el('li', null, 'Sense l\'usuari i la contrasenya correctes no es pot obtenir el token, i sense el token és impossible modificar el web.'),
      el('li', null, 'Un cop dins, el token només es guarda a la memòria d\'aquesta pestanya. En tancar-la o recarregar-la, cal tornar a entrar.'),
      el('li', null, 'La sessió es bloqueja sola després de 30 minuts sense activitat, i després de 3 intents fallits cal esperar cada vegada més.'),
      el('li', null, 'Si oblides la contrasenya: entra a GitHub, esborra el fitxer ', el('code', { text: AUTH_PATH }), ' i torna a obrir el panell per configurar-lo de nou amb un token nou.'))
  ], false));
}

/* ════════════════════════════════════════════ */
boot();

})();
