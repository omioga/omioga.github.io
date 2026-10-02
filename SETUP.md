# OM Ioga — Guia de Configuració de Millores

## Canvis implementats

### 1. Schema.org LocalBusiness (SEO Local)
Afegit a `index.html`. Google pot mostrar informació del centre directament a les cerques.
**Acció necessària:** Verificar que les coordenades GPS i l'URL de Google Maps siguin correctes.

### 2. Testimonis d'alumnes
Afegits 3 testimonis d'exemple a `data/content.json` (clau `pages.home.testimonials`).
**Acció necessària:** Substituir els texts d'exemple pels testimonis reals dels alumnes.
Edita el fitxer `data/content.json`, busca la clau `"testimonials"` i canvia els valors.

### 3. Formulari de contacte (EmailJS)
El formulari ja tenia EmailJS integrat. 
**Acció necessària:** A `js/main.js` línia ~17, substituir `'YOUR_EMAILJS_PUBLIC_KEY'` per la teva clau pública d'EmailJS.
Obte la clau a: https://dashboard.emailjs.com/admin/account

### 4. Xarxes socials al footer
Afegits enllaços a Instagram i Facebook.
**Acció necessària:** Verificar/actualitzar les URLs a `data/content.json`:
```json
"social": {
  "instagram": "https://www.instagram.com/om_ioga_igualada/",
  "facebook": "https://www.facebook.com/omiogaigualada/"
}
```

### 5. Cronologia de formació (pàgina Qui soc)
Afegida una timeline de credencials a `data/content.json` (clau `pages.qui-soc.credentials`).
**Acció necessària:** Verificar que les dates i institucions siguin correctes.

### 6. Meta descriptions millorades (SEO)
Actualitzades les meta descriptions de les pàgines principals amb paraules clau locals.

### 7. Schema markup Open Graph
Afegides metaetiquetes OG:image per millorar la previsualització a xarxes socials.

### 8. robots.txt i sitemap.xml millorats
El robots.txt ara apunta al sitemap. El sitemap.xml inclou totes les pàgines amb prioritats.

### 9. Lazy loading d'imatges
Afegit `loading="lazy"` a les imatges de galeries per millorar el rendiment.

### 10. Últim ítem de nav destacat
El darrer ítem del menú (Contacte) ara apareix amb fons verd per cridar l'atenció com a CTA.

## Notes tècniques
- GitHub Pages no té backend — el formulari usa EmailJS per enviar correus
- Les imatges originals no estan optimitzades. Per millor rendiment, converteix-les a WebP
- Per afegir Google Analytics, afegeix el codi de GA4 als fitxers HTML
