# APCD Website

African People Collaboration Donegal
[www.apcdonegal.com](https://www.apcdonegal.com)

A complete, professional, multi-page static website for APCD, the umbrella organisation representing African diaspora communities across County Donegal, Ireland.

> Unity. Culture. Collaboration. Empowerment.

---

## Stack

- HTML5, semantic and accessible markup
- CSS3, custom properties, mobile-first responsive design
- Vanilla JavaScript, no frameworks, no build step

No React, no Vue, no Node, no npm, no Bootstrap, no Tailwind, no jQuery.

---

## File Structure

```
/
├── index.html          (Home, with rotating Africa map)
├── about.html          (About Us)
├── members.html        (Member Organisations)
├── events.html         (Events, with RSVP form)
├── business.html       (Business Connect)
├── contact.html        (Contact, with form)
├── css/
│   └── styles.css      (All shared styles)
├── js/
│   └── main.js         (Shared JS: nav, cursor, animations, forms)
├── assets/
│   └── APCD/
│       ├── logo-dark.png   (for dark surfaces: nav, footer)
│       └── logo-light.png  (for light surfaces: about page, favicon)
└── README.md
```

---

## Local Preview

Open `index.html` directly in a browser, or use the VS Code Live Server extension for live reload.

You can also serve it locally with any static server:

```bash
# Python 3
python -m http.server 8000

# Node (if installed)
npx serve
```

Then visit <http://localhost:8000>.

---

## Deploy to GitHub Pages

1. Push all files to the `master` branch of <https://github.com/Breccs/apcdwebsite>.
2. Go to GitHub, open the repository, go to Settings, then Pages.
3. Under Source, select Deploy from a branch.
4. Set Branch to `master` and folder to `/ (root)`.
5. Click Save.
6. The site will be live at <https://breccs.github.io/apcdwebsite/> within a few minutes.

---

## Connect Custom Domain (`www.apcdonegal.com`)

1. In GitHub Pages settings, enter the custom domain `www.apcdonegal.com` and save.
2. At your domain registrar, create a CNAME record:
   - Name: `www`
   - Value: `breccs.github.io`
3. Also create four A records on the apex domain (`apcdonegal.com`) pointing to these GitHub Pages IP addresses:
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```
4. Allow up to 24 hours for DNS changes to propagate.
5. Once the domain is verified in GitHub Pages settings, tick Enforce HTTPS.

GitHub will automatically create a `CNAME` file in your repo when you set the custom domain. Leave it in place.

---

## Logo Files

Two contrast-matched variants live in `assets/APCD/`:

```
assets/APCD/logo-dark.png    (logo on black background, for DARK surfaces)
assets/APCD/logo-light.png   (logo on white background, for LIGHT surfaces)
```

The site automatically picks the variant that contrasts best with each surface:

- Nav bar (dark): `logo-dark.png`
- Footer (dark): `logo-dark.png`
- About page "Who We Are" (light): `logo-light.png`
- Browser favicon: `logo-light.png`

If a file is missing, the nav falls back to a gold circle with the letter "A".

---

## Brand Reference

### Colours

| Token | Hex | Use |
|---|---|---|
| `--red` | `#C0392B` | Pan-African red accent |
| `--gold` | `#E6A817` | Primary accent, CTAs, active states |
| `--green` | `#1A6B3A` | Secondary accent, supporting elements |
| `--black` | `#111111` | Dark text and sections |
| `--off-white` | `#F9F5EE` | Main page background |
| `--light-bg` | `#F2EDE3` | Section background |
| `--dark-bg` | `#0D1B11` | Hero, footer, dark sections |

### Typography

- Headings: Playfair Display (700, 900)
- Body and UI: DM Sans (300, 400, 500, 600)

Loaded from Google Fonts. No local copies required.

---

## Features

- Fully responsive, fluid layouts from 320px to 2560px wide.
- Semantic HTML, ARIA labels, skip link, full keyboard navigation.
- Custom cursor on desktop, automatically disabled on touch devices.
- Rotating Africa SVG map skeleton in the home hero (120 second rotation, respects `prefers-reduced-motion`).
- Mobile drawer navigation with hamburger toggle.
- Scroll-triggered fade-in animations using `IntersectionObserver`.
- RSVP and contact forms with JavaScript-handled inline success messages. No backend required.
- British English spelling throughout.

---

## Editing Content

Each page is a standalone `.html` file. To edit content:

- Text and copy: edit the relevant `.html` file directly.
- Colours, spacing, typography: edit CSS custom properties at the top of `css/styles.css`.
- Behaviour (forms, nav, cursor, animations): edit `js/main.js`.

No build step required. Save and refresh.

---

## License

2025 African People Collaboration Donegal. All rights reserved.
