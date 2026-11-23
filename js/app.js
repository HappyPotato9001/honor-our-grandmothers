(function () {
  "use strict";

  const STORAGE_KEYS = {
    lang: "hog_lang",
    fontScale: "hog_font_scale",
    highContrast: "hog_high_contrast",
    pledgeWall: "hog_pledge_wall_v1"
  };

  const FONT_SCALES = [87.5, 100, 115, 130, 145];
  const LANG_HTML_MAP = {
    en: "en",
    yue: "zh-Hant",
    zh: "zh-Hans",
    tl: "tl",
    vi: "vi"
  };

  const state = {
    lang: "en",
    fontScaleIndex: 1,
    highContrast: false,
    activeTimelineId: "page-act-1875",
    matrixTheme: "all",
    echoLens: false,
    chartMode: "types",
    testimonyFilter: "all",
    activeMirrorHeadlineId: "hl-5",
    groundingPromptIndex: 0,
    resourceCategory: "all",
    resourceSearch: "",
    wallFilter: "all",
    userWallEntries: []
  };

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  function getI18n(path) {
    const langDict = (window.MemorialI18n && window.MemorialI18n[state.lang]) || window.MemorialI18n.en;
    const parts = path.split(".");
    let cur = langDict;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = cur[p];
      } else {
        cur = null;
        break;
      }
    }
    if (cur !== null && cur !== undefined) return cur;
    let fallback = window.MemorialI18n.en;
    for (const p of parts) {
      fallback = fallback ? fallback[p] : "";
    }
    return fallback || "";
  }

  function localized(value) {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return "";
    return value[state.lang] || value.en || "";
  }

  function announce(message) {
    const el = document.getElementById("a11y-announcer");
    if (!el) return;
    el.textContent = "";
    window.setTimeout(() => {
      el.textContent = message;
    }, 30);
  }

  function safeStorageGet(key, fallback) {
    try {
      const val = window.localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeStorageSet(key, val) {
    try {
      window.localStorage.setItem(key, val);
    } catch (_) {
      // Ignore storage quota or private browsing errors
    }
  }

  /* ------------------------------------------------------------------------
     State Initialization & Accessibility Toolbar
     ------------------------------------------------------------------------ */
  function loadPersistedState() {
    const savedLang = safeStorageGet(STORAGE_KEYS.lang, "en");
    if (window.MemorialI18n && window.MemorialI18n[savedLang]) {
      state.lang = savedLang;
    }

    const savedScale = parseFloat(safeStorageGet(STORAGE_KEYS.fontScale, "100"));
    const scaleIdx = FONT_SCALES.indexOf(savedScale);
    if (scaleIdx !== -1) {
      state.fontScaleIndex = scaleIdx;
    }

    state.highContrast = safeStorageGet(STORAGE_KEYS.highContrast, "false") === "true";

    const rawWall = safeStorageGet(STORAGE_KEYS.pledgeWall, "[]");
    try {
      const parsed = JSON.parse(rawWall);
      if (Array.isArray(parsed)) {
        state.userWallEntries = parsed.filter(
          (item) => item && typeof item.message === "string" && typeof item.type === "string"
        );
      }
    } catch (_) {
      state.userWallEntries = [];
    }
  }

  function applyAccessibilityState() {
    const scale = FONT_SCALES[state.fontScaleIndex];
    document.documentElement.style.fontSize = `${scale}%`;
    document.documentElement.setAttribute("data-high-contrast", String(state.highContrast));
    document.documentElement.setAttribute("lang", LANG_HTML_MAP[state.lang] || "en");

    const resetBtn = document.getElementById("font-reset");
    if (resetBtn) resetBtn.textContent = `${scale}%`;

    const decBtn = document.getElementById("font-decrease");
    const incBtn = document.getElementById("font-increase");
    if (decBtn) decBtn.disabled = state.fontScaleIndex === 0;
    if (incBtn) incBtn.disabled = state.fontScaleIndex === FONT_SCALES.length - 1;

    const contrastBtn = document.getElementById("contrast-toggle");
    if (contrastBtn) contrastBtn.setAttribute("aria-pressed", String(state.highContrast));

    const langSelect = document.getElementById("lang-select");
    if (langSelect) langSelect.value = state.lang;
  }

  function applyStaticTranslations() {
    const pageTitle = getI18n("footer.title");
    if (pageTitle) document.title = pageTitle;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = getI18n(key);
      if (val) el.textContent = val;
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      const val = getI18n(key);
      if (val) el.setAttribute("aria-label", val);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const val = getI18n(key);
      if (val) el.setAttribute("placeholder", val);
    });
  }

  /* ------------------------------------------------------------------------
     Zone 1 — Historical Timeline & Primary Source Reader
     ------------------------------------------------------------------------ */
  function renderZone1() {
    const items = window.MemorialData.timeline;
    const stepper = document.getElementById("timeline-stepper");
    const track = document.getElementById("timeline-track");
    const reader = document.getElementById("primary-source-reader");
    if (!stepper || !track || !reader) return;

    stepper.textContent = "";
    track.textContent = "";

    items.forEach((item, idx) => {
      const isSelected = item.id === state.activeTimelineId;

      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "step-tab";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(isSelected));
      tab.textContent = item.year;
      tab.addEventListener("click", () => selectTimelineItem(item.id, true));
      stepper.appendChild(tab);

      const card = document.createElement("button");
      card.type = "button";
      card.className = `timeline-card${isSelected ? " is-selected" : ""}`;
      card.setAttribute("aria-pressed", String(isSelected));
      card.dataset.timelineId = item.id;

      const yearSpan = document.createElement("span");
      yearSpan.className = "timeline-year";
      yearSpan.textContent = item.year;

      const titleH3 = document.createElement("h3");
      titleH3.className = "timeline-card-title";
      titleH3.textContent = localized(item.title);

      const summaryP = document.createElement("p");
      summaryP.className = "timeline-card-summary";
      summaryP.textContent = localized(item.summary);

      const ctaSpan = document.createElement("span");
      ctaSpan.className = "timeline-card-cta";
      ctaSpan.textContent = getI18n("zone1.readSource");

      card.append(yearSpan, titleH3, summaryP, ctaSpan);
      card.addEventListener("click", () => selectTimelineItem(item.id, false));
      track.appendChild(card);

      if (isSelected) {
        const prevBtn = document.getElementById("timeline-prev");
        const nextBtn = document.getElementById("timeline-next");
        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.disabled = idx === items.length - 1;
      }
    });

    const active = items.find((i) => i.id === state.activeTimelineId) || items[0];
    reader.textContent = "";

    const top = document.createElement("div");
    top.className = "reader-top";

    const topLeft = document.createElement("div");
    const rYear = document.createElement("span");
    rYear.className = "reader-year";
    rYear.textContent = active.year;
    const rTitle = document.createElement("h3");
    rTitle.className = "reader-title";
    rTitle.textContent = localized(active.title);
    topLeft.append(rYear, rTitle);

    const rCitation = document.createElement("span");
    rCitation.className = "reader-citation";
    rCitation.textContent = localized(active.citation);
    top.append(topLeft, rCitation);

    const grid = document.createElement("div");
    grid.className = "reader-grid";

    const quoteBox = document.createElement("blockquote");
    quoteBox.className = "primary-quote-box";

    if (active.poemOriginal) {
      const poemP = document.createElement("p");
      poemP.className = "poem-original";
      poemP.setAttribute("lang", "zh-Hant");
      poemP.textContent = active.poemOriginal;
      quoteBox.appendChild(poemP);
    }

    const qText = document.createElement("p");
    qText.className = "quote-text";
    qText.textContent = localized(active.quote);

    const qSrc = document.createElement("footer");
    qSrc.className = "quote-source";
    qSrc.textContent = `${getI18n("zone1.quoteLabel")} — ${localized(active.citation)}`;

    quoteBox.append(qText, qSrc);

    const analysis = document.createElement("div");
    analysis.className = "reader-analysis";

    const mechBlock = document.createElement("div");
    mechBlock.className = "analysis-block";
    const mechH4 = document.createElement("h4");
    mechH4.textContent = getI18n("zone1.mechanismLabel");
    const mechP = document.createElement("p");
    mechP.textContent = localized(active.mechanism);
    mechBlock.append(mechH4, mechP);

    const linBlock = document.createElement("div");
    linBlock.className = "analysis-block analysis-block--lineage";
    const linH4 = document.createElement("h4");
    linH4.textContent = getI18n("zone1.lineageLabel");
    const linP = document.createElement("p");
    linP.textContent = localized(active.lineage);
    linBlock.append(linH4, linP);

    analysis.append(mechBlock, linBlock);
    grid.append(quoteBox, analysis);
    reader.append(top, grid);
  }

  function selectTimelineItem(id, scrollIntoView) {
    state.activeTimelineId = id;
    renderZone1();
    if (scrollIntoView) {
      const card = document.querySelector(`.timeline-card[data-timeline-id="${id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }

  /* ------------------------------------------------------------------------
     Zone 2 — Comparative Matrix & Municipal Language Gaps
     ------------------------------------------------------------------------ */
  function appendHighlightedText(container, text, echoWords) {
    if (!state.echoLens || !Array.isArray(echoWords) || echoWords.length === 0) {
      container.textContent = text;
      return;
    }

    const escaped = echoWords
      .filter(Boolean)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (escaped.length === 0) {
      container.textContent = text;
      return;
    }

    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    const parts = text.split(regex);
    parts.forEach((part) => {
      if (!part) return;
      const isMatch = echoWords.some((w) => w.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        const mark = document.createElement("mark");
        mark.className = "echo-highlight";
        mark.textContent = part;
        container.appendChild(mark);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    });
  }

  function renderZone2() {
    const filtersEl = document.getElementById("matrix-filters");
    const matrixEl = document.getElementById("comparative-matrix");
    const gapsEl = document.getElementById("language-gaps-grid");
    const echoBtn = document.getElementById("echo-lens-toggle");
    if (!filtersEl || !matrixEl || !gapsEl) return;

    if (echoBtn) echoBtn.setAttribute("aria-pressed", String(state.echoLens));

    const filterDefs = [
      { id: "all", key: "zone2.filterAll" },
      { id: "health", key: "zone2.filterHealth" },
      { id: "economic", key: "zone2.filterEconomic" },
      { id: "language", key: "zone2.filterLanguage" }
    ];

    filtersEl.textContent = "";
    filterDefs.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-pill";
      btn.setAttribute("aria-pressed", String(state.matrixTheme === f.id));
      btn.textContent = getI18n(f.key);
      btn.addEventListener("click", () => {
        state.matrixTheme = f.id;
        renderZone2();
      });
      filtersEl.appendChild(btn);
    });

    const rows = window.MemorialData.matrix.filter(
      (row) => state.matrixTheme === "all" || row.theme === state.matrixTheme
    );

    matrixEl.textContent = "";
    rows.forEach((row) => {
      const article = document.createElement("article");
      article.className = "matrix-row";

      const header = document.createElement("div");
      header.className = "matrix-row-header";
      const themeTag = document.createElement("span");
      themeTag.className = "matrix-theme-tag";
      themeTag.textContent = getI18n(
        row.theme === "health"
          ? "zone2.filterHealth"
          : row.theme === "economic"
            ? "zone2.filterEconomic"
            : "zone2.filterLanguage"
      );

      const tropePill = document.createElement("span");
      tropePill.className = "matrix-trope-pill";
      tropePill.textContent = `${getI18n("zone2.tropePrefix")} ${localized(row.trope)}`;
      header.append(themeTag, tropePill);

      const cols = document.createElement("div");
      cols.className = "matrix-columns";

      // Historical side
      const histCol = document.createElement("div");
      histCol.className = "matrix-col matrix-col--historical";
      const histLabel = document.createElement("span");
      histLabel.className = "matrix-era-label";
      histLabel.textContent = `${getI18n("zone2.historicalEra")} · ${localized(row.historical.era)}`;
      const histQuote = document.createElement("p");
      histQuote.className = "matrix-quote";
      appendHighlightedText(histQuote, localized(row.historical.quote), row.historical.echoWords);
      const histCtx = document.createElement("p");
      histCtx.className = "matrix-context";
      histCtx.textContent = localized(row.historical.context);
      histCol.append(histLabel, histQuote, histCtx);

      // Modern side
      const modCol = document.createElement("div");
      modCol.className = "matrix-col matrix-col--modern";
      const modLabel = document.createElement("span");
      modLabel.className = "matrix-era-label";
      modLabel.textContent = `${getI18n("zone2.modernEra")} · ${localized(row.modern.era)}`;
      const modQuote = document.createElement("p");
      modQuote.className = "matrix-quote";
      appendHighlightedText(modQuote, localized(row.modern.quote), row.modern.echoWords);
      const modCtx = document.createElement("p");
      modCtx.className = "matrix-context";
      modCtx.textContent = localized(row.modern.context);
      modCol.append(modLabel, modQuote, modCtx);

      cols.append(histCol, modCol);
      article.append(header, cols);
      matrixEl.appendChild(article);
    });

    // Municipal Language Gaps
    gapsEl.textContent = "";
    window.MemorialData.languageGaps.forEach((gap) => {
      const card = document.createElement("div");
      card.className = "gap-card";
      const h4 = document.createElement("h4");
      h4.textContent = localized(gap.title);
      const p = document.createElement("p");
      p.textContent = localized(gap.desc);
      card.append(h4, p);
      gapsEl.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------------
     Zone 3 — Interactive SVG Data Visualizations & Testimonies
     ------------------------------------------------------------------------ */
  function createSvgElement(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    return el;
  }

  function renderGenderSvg() {
    const container = document.getElementById("svg-gender-chart");
    if (!container) return;
    container.textContent = "";

    const svg = createSvgElement("svg", {
      viewBox: "0 0 420 140",
      role: "img",
      "aria-label": `${getI18n("zone3.chartWomenLabel")}, ${getI18n("zone3.chartMenLabel")}, ${getI18n("zone3.chartOtherLabel")}`
    });

    const rows = [
      { label: getI18n("zone3.chartWomenLabel"), pct: 68, color: "#DC2626", y: 20 },
      { label: getI18n("zone3.chartMenLabel"), pct: 29, color: "#D97706", y: 65 },
      { label: getI18n("zone3.chartOtherLabel"), pct: 3, color: "#94A3B8", y: 110 }
    ];

    rows.forEach((r) => {
      const lbl = createSvgElement("text", {
        x: 0,
        y: r.y - 4,
        fill: "#F8FAFC",
        "font-size": "12",
        "font-weight": "600"
      });
      lbl.textContent = r.label;
      svg.appendChild(lbl);

      const bg = createSvgElement("rect", {
        x: 0,
        y: r.y + 4,
        width: 420,
        height: 16,
        rx: 6,
        fill: "#0F172A"
      });
      svg.appendChild(bg);

      const bar = createSvgElement("rect", {
        x: 0,
        y: r.y + 4,
        width: Math.max(12, (420 * r.pct) / 100),
        height: 16,
        rx: 6,
        fill: r.color
      });
      svg.appendChild(bar);
    });

    container.appendChild(svg);
  }

  function renderElderSvg() {
    const container = document.getElementById("svg-elder-chart");
    if (!container) return;
    container.textContent = "";

    const svg = createSvgElement("svg", {
      viewBox: "0 0 420 140",
      role: "img",
      "aria-label": `${getI18n("zone3.chartElderFocusLabel")} — ${getI18n("zone3.chartElderSubLabel")}`
    });

    // Subtle rising trend area representing 2019 -> 2020 -> 2021 -> 2022 surge
    const points = [
      { x: 35, y: 98, label: "2019" },
      { x: 145, y: 64, label: "2020" },
      { x: 265, y: 28, label: "2021" },
      { x: 380, y: 38, label: "2022" }
    ];

    const gridLine = createSvgElement("line", {
      x1: 20,
      y1: 110,
      x2: 400,
      y2: 110,
      stroke: "#475569",
      "stroke-width": 1
    });
    svg.appendChild(gridLine);

    const pathD = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y}`;
    const line = createSvgElement("path", {
      d: pathD,
      fill: "none",
      stroke: "#FBBF24",
      "stroke-width": 3.5,
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
    svg.appendChild(line);

    points.forEach((pt, i) => {
      const dot = createSvgElement("circle", {
        cx: pt.x,
        cy: pt.y,
        r: i === 2 ? 7 : 5,
        fill: i >= 2 ? "#DC2626" : "#FBBF24",
        stroke: "#0F172A",
        "stroke-width": 2
      });
      svg.appendChild(dot);

      const yr = createSvgElement("text", {
        x: pt.x,
        y: 128,
        "text-anchor": "middle",
        fill: "#CBD5E1",
        "font-size": "11",
        "font-weight": "600"
      });
      yr.textContent = pt.label;
      svg.appendChild(yr);
    });

    const note = createSvgElement("text", {
      x: 20,
      y: 16,
      fill: "#FCA5A5",
      "font-size": "11.5",
      "font-weight": "700"
    });
    note.textContent = getI18n("zone3.chartElderFocusLabel");
    svg.appendChild(note);

    container.appendChild(svg);
  }

  function renderBreakdownSvg() {
    const container = document.getElementById("svg-breakdown-chart");
    const btnTypes = document.getElementById("chart-mode-types");
    const btnFactors = document.getElementById("chart-mode-factors");
    if (!container) return;

    if (btnTypes && btnFactors) {
      const isTypes = state.chartMode === "types";
      btnTypes.setAttribute("aria-pressed", String(isTypes));
      btnFactors.setAttribute("aria-pressed", String(!isTypes));
      btnTypes.className = `btn btn-sm ${isTypes ? "btn-primary" : "btn-secondary"}`;
      btnFactors.className = `btn btn-sm ${!isTypes ? "btn-primary" : "btn-secondary"}`;
    }

    const dataset =
      state.chartMode === "types"
        ? window.MemorialData.breakdownData.types
        : window.MemorialData.breakdownData.factors;

    container.textContent = "";
    const rowH = 44;
    const totalH = dataset.length * rowH + 12;
    const svg = createSvgElement("svg", {
      viewBox: `0 0 700 ${totalH}`,
      role: "img",
      "aria-label": getI18n("zone3.viz3Title")
    });

    dataset.forEach((item, i) => {
      const y = i * rowH + 10;
      const lbl = createSvgElement("text", {
        x: 0,
        y: y + 14,
        fill: "#F8FAFC",
        "font-size": "13",
        "font-weight": "600"
      });
      lbl.textContent = `${localized(item.label)} — ${item.pct}%`;
      svg.appendChild(lbl);

      const track = createSvgElement("rect", {
        x: 0,
        y: y + 20,
        width: 700,
        height: 14,
        rx: 5,
        fill: "#0F172A"
      });
      svg.appendChild(track);

      const bar = createSvgElement("rect", {
        x: 0,
        y: y + 20,
        width: Math.max(18, (700 * item.pct) / 100),
        height: 14,
        rx: 5,
        fill: item.color
      });
      svg.appendChild(bar);
    });

    container.appendChild(svg);
  }

  function renderZone3() {
    renderGenderSvg();
    renderElderSvg();
    renderBreakdownSvg();

    const filtersEl = document.getElementById("testimony-filters");
    const gridEl = document.getElementById("testimonies-grid");
    if (!filtersEl || !gridEl) return;

    const filterDefs = [
      { id: "all", key: "zone3.filterAll" },
      { id: "elders", key: "zone3.filterElders" },
      { id: "transit", key: "zone3.filterTransit" },
      { id: "caregivers", key: "zone3.filterCaregivers" }
    ];

    filtersEl.textContent = "";
    filterDefs.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-pill";
      btn.setAttribute("aria-pressed", String(state.testimonyFilter === f.id));
      btn.textContent = getI18n(f.key);
      btn.addEventListener("click", () => {
        state.testimonyFilter = f.id;
        renderZone3();
      });
      filtersEl.appendChild(btn);
    });

    const items = window.MemorialData.testimonies.filter(
      (t) => state.testimonyFilter === "all" || t.tag === state.testimonyFilter
    );

    gridEl.textContent = "";
    items.forEach((t) => {
      const card = document.createElement("article");
      card.className = "testimony-card";

      const meta = document.createElement("div");
      meta.className = "testimony-meta";
      const spk = document.createElement("span");
      spk.className = "testimony-speaker";
      spk.textContent = localized(t.speaker);
      const tag = document.createElement("span");
      tag.className = "testimony-tag";
      tag.textContent = localized(t.tagLabel);
      meta.append(spk, tag);

      const q = document.createElement("blockquote");
      q.className = "testimony-quote";
      q.textContent = localized(t.quote);

      const ctx = document.createElement("p");
      ctx.className = "testimony-context";
      ctx.textContent = localized(t.context);

      card.append(meta, q, ctx);
      gridEl.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------------
     Zone 4 — Reflection Mirror ("Behind Closed Doors")
     ------------------------------------------------------------------------ */
  function renderZone4() {
    const leftEl = document.getElementById("mirror-headlines-left");
    const rightEl = document.getElementById("mirror-headlines-right");
    const noteEl = document.getElementById("mirror-active-note");
    const promptEl = document.getElementById("active-grounding-prompt");
    if (!leftEl || !rightEl || !noteEl || !promptEl) return;

    leftEl.textContent = "";
    rightEl.textContent = "";

    const headlines = window.MemorialData.mirrorHeadlines;
    headlines.forEach((item) => {
      const isSelected = item.id === state.activeMirrorHeadlineId;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "headline-chip";
      btn.setAttribute("aria-pressed", String(isSelected));

      const yr = document.createElement("span");
      yr.className = "headline-year";
      yr.textContent = item.year;

      const txt = document.createElement("span");
      txt.className = "headline-text";
      txt.textContent = localized(item.headline);

      btn.append(yr, txt);
      btn.addEventListener("click", () => {
        state.activeMirrorHeadlineId = item.id;
        renderZone4();
      });

      if (item.side === "left") {
        leftEl.appendChild(btn);
      } else {
        rightEl.appendChild(btn);
      }
    });

    const active = headlines.find((h) => h.id === state.activeMirrorHeadlineId) || headlines[0];
    noteEl.textContent = "";
    const heading = document.createElement("strong");
    heading.textContent = `${getI18n("zone4.reflectionHeading")} ${localized(active.headline)}`;
    const body = document.createElement("span");
    body.textContent = localized(active.reflection);
    noteEl.append(heading, body);

    const prompts = window.MemorialData.groundingPrompts;
    const prompt = prompts[state.groundingPromptIndex % prompts.length];
    promptEl.textContent = localized(prompt);
  }

  /* ------------------------------------------------------------------------
     Zone 5 — Interactive Resource Directory
     ------------------------------------------------------------------------ */
  function renderZone5() {
    const filtersEl = document.getElementById("resource-filters");
    const gridEl = document.getElementById("resources-grid");
    const countEl = document.getElementById("resource-count");
    if (!filtersEl || !gridEl || !countEl) return;

    const filterDefs = [
      { id: "all", key: "zone5.filterAll" },
      { id: "escort", key: "zone5.filterEscort" },
      { id: "solidarity", key: "zone5.filterSolidarity" },
      { id: "mutual-aid", key: "zone5.filterMutualAid" },
      { id: "legal", key: "zone5.filterLegal" }
    ];

    filtersEl.textContent = "";
    filterDefs.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-pill";
      btn.setAttribute("aria-pressed", String(state.resourceCategory === f.id));
      btn.textContent = getI18n(f.key);
      btn.addEventListener("click", () => {
        state.resourceCategory = f.id;
        renderZone5();
      });
      filtersEl.appendChild(btn);
    });

    const query = state.resourceSearch.trim().toLowerCase();
    const filtered = window.MemorialData.resources.filter((res) => {
      const catMatch = state.resourceCategory === "all" || res.category === state.resourceCategory;
      if (!catMatch) return false;
      if (!query) return true;
      const haystack = [
        res.name,
        res.region,
        localized(res.catLabel),
        localized(res.desc),
        ...res.languages
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    const countTemplate = filtered.length === 1 ? getI18n("zone5.countSingular") : getI18n("zone5.countPlural");
    countEl.textContent = countTemplate.replace("{n}", String(filtered.length));

    gridEl.textContent = "";
    if (filtered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "panel-desc";
      empty.textContent = getI18n("zone5.noResults");
      gridEl.appendChild(empty);
      return;
    }

    filtered.forEach((res) => {
      const card = document.createElement("article");
      card.className = "resource-card";

      const badges = document.createElement("div");
      badges.className = "resource-badges";
      const cat = document.createElement("span");
      cat.className = "cat-badge";
      cat.textContent = localized(res.catLabel);
      const reg = document.createElement("span");
      reg.className = "region-badge";
      reg.textContent = res.region;
      badges.append(cat, reg);

      const h3 = document.createElement("h3");
      h3.className = "resource-name";
      h3.textContent = res.name;

      const p = document.createElement("p");
      p.className = "resource-desc";
      p.textContent = localized(res.desc);

      const langs = document.createElement("div");
      langs.className = "lang-chips";
      res.languages.forEach((langName) => {
        const chip = document.createElement("span");
        chip.className = "lang-chip";
        chip.textContent = langName;
        langs.appendChild(chip);
      });

      const actions = document.createElement("div");
      actions.className = "resource-actions";

      const link = document.createElement("a");
      link.className = "btn btn-secondary btn-sm";
      link.href = res.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = getI18n("zone5.visitSite");

      const pledgeBtn = document.createElement("button");
      pledgeBtn.type = "button";
      pledgeBtn.className = "btn btn-outline-amber btn-sm";
      pledgeBtn.textContent = getI18n("zone5.pledgeSupport");
      pledgeBtn.addEventListener("click", () => {
        prefillPledgeWall("pledge", `${res.name}: `);
      });

      actions.append(link, pledgeBtn);
      card.append(badges, h3, p, langs, actions);
      gridEl.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------------
     Community Solidarity & Elder Support Pledge Wall (XSS-Safe + localStorage)
     ------------------------------------------------------------------------ */
  function getAllWallEntries() {
    return [...state.userWallEntries, ...window.MemorialData.seededWall];
  }

  function updateDedicationVisibility() {
    const selected = document.querySelector('input[name="entryType"]:checked');
    const wrap = document.getElementById("dedication-field-wrap");
    if (!selected || !wrap) return;
    wrap.hidden = selected.value !== "candle";
  }

  function prefillPledgeWall(type, messageText) {
    const radio = document.querySelector(`input[name="entryType"][value="${type}"]`);
    if (radio) {
      radio.checked = true;
      updateDedicationVisibility();
    }
    const textarea = document.getElementById("pledge-message");
    if (textarea) {
      textarea.value = messageText;
      updateCharCounter();
    }
    const wallSection = document.getElementById("pledge-wall");
    if (wallSection) {
      wallSection.scrollIntoView({ behavior: "smooth" });
    }
    window.setTimeout(() => {
      if (textarea) textarea.focus();
    }, 350);
  }

  function updateCharCounter() {
    const textarea = document.getElementById("pledge-message");
    const counter = document.getElementById("message-char-count");
    if (!textarea || !counter) return;
    counter.textContent = `${textarea.value.length} / 400`;
  }

  function renderPledgeWall() {
    const allEntries = getAllWallEntries();
    const candleCountEl = document.getElementById("count-candles");
    const pledgeCountEl = document.getElementById("count-pledges");
    const messageCountEl = document.getElementById("count-messages");

    if (candleCountEl) candleCountEl.textContent = String(allEntries.filter((e) => e.type === "candle").length);
    if (pledgeCountEl) pledgeCountEl.textContent = String(allEntries.filter((e) => e.type === "pledge").length);
    if (messageCountEl) messageCountEl.textContent = String(allEntries.filter((e) => e.type === "message").length);

    const filtersEl = document.getElementById("wall-filters");
    const listEl = document.getElementById("pledge-wall-list");
    if (!filtersEl || !listEl) return;

    const filterDefs = [
      { id: "all", key: "wall.filterAll" },
      { id: "candle", key: "wall.filterCandles" },
      { id: "pledge", key: "wall.filterPledges" },
      { id: "message", key: "wall.filterMessages" }
    ];

    filtersEl.textContent = "";
    filterDefs.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-pill";
      btn.setAttribute("aria-pressed", String(state.wallFilter === f.id));
      btn.textContent = getI18n(f.key);
      btn.addEventListener("click", () => {
        state.wallFilter = f.id;
        renderPledgeWall();
      });
      filtersEl.appendChild(btn);
    });

    const visible = allEntries.filter(
      (entry) => state.wallFilter === "all" || entry.type === state.wallFilter
    );

    listEl.textContent = "";
    if (visible.length === 0) {
      const empty = document.createElement("p");
      empty.className = "panel-desc";
      empty.textContent = getI18n("wall.emptyWall");
      listEl.appendChild(empty);
      return;
    }

    visible.forEach((entry) => {
      const card = document.createElement("article");
      card.className = `wall-card wall-card--${entry.type}`;

      const top = document.createElement("div");
      top.className = "wall-card-top";
      const badge = document.createElement("span");
      badge.className = "wall-type-badge";
      badge.textContent =
        entry.type === "candle"
          ? getI18n("wall.badgeCandle")
          : entry.type === "pledge"
            ? getI18n("wall.badgePledge")
            : getI18n("wall.badgeMessage");

      const timeSpan = document.createElement("span");
      timeSpan.className = "wall-timestamp";
      timeSpan.textContent = entry.timestamp || getI18n("wall.justNow");
      top.append(badge, timeSpan);
      card.appendChild(top);

      if (entry.type === "candle" && entry.dedication) {
        const dedText = localized(entry.dedication);
        if (dedText) {
          const dedP = document.createElement("div");
          dedP.className = "wall-dedication";
          dedP.textContent = `${getI18n("wall.inHonorOf")} ${dedText}`;
          card.appendChild(dedP);
        }
      }

      const msgP = document.createElement("p");
      msgP.className = "wall-message";
      msgP.textContent = localized(entry.message);
      card.appendChild(msgP);

      const trimmedCity = typeof entry.city === "string" ? entry.city.trim() : "";
      if (trimmedCity || !entry.isSeeded) {
        const footer = document.createElement("div");
        footer.className = "wall-card-footer";
        if (trimmedCity) {
          const citySpan = document.createElement("span");
          citySpan.textContent = trimmedCity;
          footer.appendChild(citySpan);
        }

        if (!entry.isSeeded) {
          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "wall-delete-btn";
          delBtn.textContent = getI18n("wall.removeBtn");
          delBtn.addEventListener("click", () => {
            state.userWallEntries = state.userWallEntries.filter((u) => u.id !== entry.id);
            safeStorageSet(STORAGE_KEYS.pledgeWall, JSON.stringify(state.userWallEntries));
            renderPledgeWall();
          });
          footer.appendChild(delBtn);
        }

        card.appendChild(footer);
      }

      listEl.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------------
     Render All & Bind Events
     ------------------------------------------------------------------------ */
  function renderAll() {
    applyAccessibilityState();
    applyStaticTranslations();
    renderZone1();
    renderZone2();
    renderZone3();
    renderZone4();
    renderZone5();
    renderPledgeWall();
  }

  function bindEvents() {
    // Font scaling
    document.getElementById("font-decrease")?.addEventListener("click", () => {
      if (state.fontScaleIndex > 0) {
        state.fontScaleIndex -= 1;
        const scale = FONT_SCALES[state.fontScaleIndex];
        safeStorageSet(STORAGE_KEYS.fontScale, String(scale));
        applyAccessibilityState();
        announce(getI18n("a11y.fontAnnounce").replace("{scale}", String(scale)));
      }
    });

    document.getElementById("font-increase")?.addEventListener("click", () => {
      if (state.fontScaleIndex < FONT_SCALES.length - 1) {
        state.fontScaleIndex += 1;
        const scale = FONT_SCALES[state.fontScaleIndex];
        safeStorageSet(STORAGE_KEYS.fontScale, String(scale));
        applyAccessibilityState();
        announce(getI18n("a11y.fontAnnounce").replace("{scale}", String(scale)));
      }
    });

    document.getElementById("font-reset")?.addEventListener("click", () => {
      state.fontScaleIndex = 1;
      safeStorageSet(STORAGE_KEYS.fontScale, "100");
      applyAccessibilityState();
      announce(getI18n("a11y.fontAnnounce").replace("{scale}", "100"));
    });

    // High contrast toggle
    document.getElementById("contrast-toggle")?.addEventListener("click", () => {
      state.highContrast = !state.highContrast;
      safeStorageSet(STORAGE_KEYS.highContrast, String(state.highContrast));
      applyAccessibilityState();
      announce(getI18n(state.highContrast ? "a11y.contrastOn" : "a11y.contrastOff"));
    });

    // Language switcher
    document.getElementById("lang-select")?.addEventListener("change", (e) => {
      const nextLang = e.target.value;
      if (window.MemorialI18n[nextLang]) {
        state.lang = nextLang;
        safeStorageSet(STORAGE_KEYS.lang, nextLang);
        renderAll();
        announce(getI18n("a11y.langAnnounce"));
      }
    });

    // Mobile chapter nav toggle
    const navToggle = document.getElementById("nav-toggle");
    const chapterNav = document.getElementById("chapter-nav");
    navToggle?.addEventListener("click", () => {
      const isOpen = chapterNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    chapterNav?.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        chapterNav.classList.remove("is-open");
        navToggle?.setAttribute("aria-expanded", "false");
      });
    });

    // Zone 1 Previous / Next & Keyboard Arrow Navigation
    document.getElementById("timeline-prev")?.addEventListener("click", () => {
      const items = window.MemorialData.timeline;
      const idx = items.findIndex((i) => i.id === state.activeTimelineId);
      if (idx > 0) selectTimelineItem(items[idx - 1].id, true);
    });

    document.getElementById("timeline-next")?.addEventListener("click", () => {
      const items = window.MemorialData.timeline;
      const idx = items.findIndex((i) => i.id === state.activeTimelineId);
      if (idx < items.length - 1) selectTimelineItem(items[idx + 1].id, true);
    });

    document.getElementById("timeline-track")?.addEventListener("keydown", (e) => {
      const items = window.MemorialData.timeline;
      const idx = items.findIndex((i) => i.id === state.activeTimelineId);
      if (e.key === "ArrowRight" && idx < items.length - 1) {
        e.preventDefault();
        selectTimelineItem(items[idx + 1].id, true);
      } else if (e.key === "ArrowLeft" && idx > 0) {
        e.preventDefault();
        selectTimelineItem(items[idx - 1].id, true);
      }
    });

    // Zone 2 Echo Lens toggle
    document.getElementById("echo-lens-toggle")?.addEventListener("click", () => {
      state.echoLens = !state.echoLens;
      renderZone2();
    });

    // Zone 3 Chart mode toggles
    document.getElementById("chart-mode-types")?.addEventListener("click", () => {
      state.chartMode = "types";
      renderBreakdownSvg();
    });
    document.getElementById("chart-mode-factors")?.addEventListener("click", () => {
      state.chartMode = "factors";
      renderBreakdownSvg();
    });

    // Zone 4 Reflection Drawer
    document.getElementById("cycle-prompt-btn")?.addEventListener("click", () => {
      state.groundingPromptIndex =
        (state.groundingPromptIndex + 1) % window.MemorialData.groundingPrompts.length;
      renderZone4();
    });

    document.getElementById("clear-reflection-btn")?.addEventListener("click", () => {
      const input = document.getElementById("private-reflection-input");
      if (input) input.value = "";
    });

    document.getElementById("share-to-wall-btn")?.addEventListener("click", () => {
      const input = document.getElementById("private-reflection-input");
      const text = input ? input.value.trim() : "";
      const prefill = text ? `${getI18n("zone4.sharedPrefix")}${text}` : "";
      prefillPledgeWall("message", prefill);
    });

    // Zone 5 Search
    document.getElementById("resource-search")?.addEventListener("input", (e) => {
      state.resourceSearch = e.target.value;
      renderZone5();
    });

    // Pledge Wall radio toggles, char count, and submit
    document.querySelectorAll('input[name="entryType"]').forEach((radio) => {
      radio.addEventListener("change", updateDedicationVisibility);
    });

    document.getElementById("pledge-message")?.addEventListener("input", () => {
      updateCharCounter();
      const errEl = document.getElementById("pledge-form-error");
      if (errEl) errEl.hidden = true;
    });

    document.getElementById("pledge-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const msgEl = document.getElementById("pledge-message");
      const cityEl = document.getElementById("pledge-city");
      const dedEl = document.getElementById("pledge-dedication");
      const errEl = document.getElementById("pledge-form-error");
      const typeEl = document.querySelector('input[name="entryType"]:checked');

      const message = msgEl ? msgEl.value.trim() : "";
      if (!message) {
        if (errEl) {
          errEl.textContent = getI18n("wall.errorRequired");
          errEl.hidden = false;
        }
        msgEl?.focus();
        return;
      }

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const entry = {
        id: `user-${Date.now()}`,
        type: typeEl ? typeEl.value : "candle",
        isSeeded: false,
        name: "",
        city: cityEl ? cityEl.value.trim() : "",
        dedication: dedEl ? dedEl.value.trim() : "",
        message,
        timestamp: dateStr
      };

      state.userWallEntries.unshift(entry);
      safeStorageSet(STORAGE_KEYS.pledgeWall, JSON.stringify(state.userWallEntries));

      if (msgEl) msgEl.value = "";
      if (dedEl) dedEl.value = "";
      updateCharCounter();
      if (errEl) errEl.hidden = true;

      state.wallFilter = "all";
      renderPledgeWall();
      announce(getI18n("wall.postedSuccess"));
    });

    // Active section highlight in chapter nav
    if ("IntersectionObserver" in window) {
      const sections = document.querySelectorAll("main > section[id]");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              document.querySelectorAll(".chapter-link").forEach((link) => {
                link.classList.toggle("is-active", link.dataset.zoneLink === id);
              });
            }
          });
        },
        { rootMargin: "-35% 0px -55% 0px" }
      );
      sections.forEach((sec) => observer.observe(sec));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadPersistedState();
    bindEvents();
    updateDedicationVisibility();
    updateCharCounter();
    renderAll();
  });
})();
