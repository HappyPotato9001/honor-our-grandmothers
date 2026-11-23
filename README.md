# Honor Our Grandmothers: Intersectional Memory, Elder Protection, and Solidarity

A responsive, accessible single-page application (SPA) web memorial and digital archive dedicated to honoring Asian elders and confronting the intersections of race, gender, age, and language access. Built as a zero-build static web application optimized for **GitHub Pages**.

## Core Features

- **Senior Accessibility Toolbar (Fixed Top Navbar)**:
  - **Font-Size Scaler**: 5-step root scaling (`87.5%`, `100%`, `115%`, `130%`, `145%`) persisted in `localStorage`.
  - **High-Contrast Mode**: Dedicated WCAG AAA high-contrast palette toggle (`#000000` / `#FFFFFF` / `#FFD700` / `#FF4D4D`).
  - **Multilingual Switcher**: Complete translations across **English**, **Cantonese (廣東話 / 繁體中文)**, **Mandarin (普通话 / 简体中文)**, **Tagalog**, and **Vietnamese (Tiếng Việt)**.
- **Five Interactive Memorial Zones**:
  1. **Zone 1 — Historical Foundations**: Interactive horizontal timeline covering the Page Act (1875), Chinese Exclusion Act (1882), Angel Island carved detention poetry (1910–1940), and Executive Order 9066 (1942), paired with an Archival Primary Source Reader.
  2. **Zone 2 — Ideological & Institutional Oppression**: Side-by-side historical vs. pandemic comparative media matrix with theme filtering, an **Echo Lens** trope highlighter, and a municipal language-access barrier breakdown.
  3. **Zone 3 — Interpersonal & Intersectional Impact**: Accessible SVG data visualizations of Stop AAPI Hate gender disparities (`2.3×` rate for women), Bay Area Chinatown elder assault trends, interactive risk/incident breakdowns, and filterable anonymized survivor testimonies.
  4. **Zone 4 — Internalized Oppression & Reflection Mirror**: Interactive mirror frame surrounded by clickable historical headlines, reflection notes, grounding prompts, and a private-or-shareable contemplation drawer.
  5. **Zone 5 — Resistance & Elder Protection**: Searchable, filterable directory of Bay Area elder escort patrols, intergenerational solidarity marches, mutual aid networks, and legal/reporting organizations.
- **Community Solidarity & Elder Support Pledge Wall**:
  - Visitors can light a virtual tribute candle, submit a volunteer support pledge, or post a solidarity message with instant live rendering, category filtering, and `localStorage` persistence.

## Project Structure

```text
.
├── .nojekyll          # Disables Jekyll processing on GitHub Pages
├── favicon.svg        # Tribute candle icon
├── index.html         # Semantic SPA document
├── css/
│   └── styles.css     # Responsive theme, accessibility scaling, high-contrast mode
├── js/
│   ├── i18n.js        # UI translations (en, yue, zh, tl, vi)
│   ├── data.js        # Multilingual datasets for Zones 1–5 & seeded tributes
│   └── app.js         # State management, SVG charts, XSS-safe DOM rendering
└── README.md
```

## Deploying to GitHub Pages (3 Steps)

1. **Push to GitHub**: Commit all files to your repository's `main` branch.
2. **Enable Pages**: In your GitHub repository, open **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`, and click **Save**.
3. **Visit Your Site**: GitHub Pages will publish the memorial within ~1–2 minutes at `https://<your-username>.github.io/<repository-name>/`. All asset links are relative and require no build step.
