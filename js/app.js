(function () {
  "use strict";

  const STORAGE_KEYS = {
    lang: "ips_lang",
    fontScale: "ips_font_scale",
    highContrast: "ips_high_contrast",
    pledgeWall: "ips_pledge_wall_v1",
    candleCount: "ips_candle_count"
  };

  const FONT_SCALES = [87.5, 100, 115, 130, 145];
  const LANG_HTML_MAP = { en: "en", yue: "zh-Hant", zh: "zh-Hans", tl: "tl", vi: "vi" };
  const ICON_LABEL = { candle: "candle", chrysanthemum: "chrysanthemum", solidarity: "solidarity" };

  const state = {
    lang: "en",
    fontScaleIndex: 1,
    highContrast: false,
    activeTimelineId: "page-act-1875",
    expandedTestimonyId: null,
    routineMode: "before",
    wallFilter: "all",
    userWallEntries: [],
    candleCount: 0
  };

  function getI18n(path) {
    const langDict = (window.MemorialI18n && window.MemorialI18n[state.lang]) || window.MemorialI18n.en;
    const parts = path.split(".");
    let cur = langDict;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
      else {
        cur = null;
        break;
      }
    }
    if (cur !== null && cur !== undefined) return cur;
    let fallback = window.MemorialI18n.en;
    for (const p of parts) fallback = fallback ? fallback[p] : "";
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
      /* private browsing / quota */
    }
  }

  function loadPersistedState() {
    const savedLang = safeStorageGet(STORAGE_KEYS.lang, "en");
    if (window.MemorialI18n && window.MemorialI18n[savedLang]) state.lang = savedLang;

    const savedScale = parseFloat(safeStorageGet(STORAGE_KEYS.fontScale, "100"));
    const scaleIdx = FONT_SCALES.indexOf(savedScale);
    if (scaleIdx !== -1) state.fontScaleIndex = scaleIdx;

    state.highContrast = safeStorageGet(STORAGE_KEYS.highContrast, "false") === "true";

    const candle = parseInt(safeStorageGet(STORAGE_KEYS.candleCount, "0"), 10);
    state.candleCount = Number.isFinite(candle) && candle >= 0 ? candle : 0;

    try {
      const parsed = JSON.parse(safeStorageGet(STORAGE_KEYS.pledgeWall, "[]"));
      if (Array.isArray(parsed)) {
        state.userWallEntries = parsed.filter(
          (item) => item && typeof item.message === "string" && typeof item.icon === "string"
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

    updateCandleDisplay();
  }

  function applyStaticTranslations() {
    const pageTitle = getI18n("footer.title");
    if (pageTitle) document.title = pageTitle;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const val = getI18n(el.getAttribute("data-i18n"));
      if (val) el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const val = getI18n(el.getAttribute("data-i18n-aria"));
      if (val) el.setAttribute("aria-label", val);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const val = getI18n(el.getAttribute("data-i18n-placeholder"));
      if (val) el.setAttribute("placeholder", val);
    });
  }

  function updateCandleDisplay() {
    const countEl = document.getElementById("hero-candle-count");
    if (countEl) countEl.textContent = String(state.candleCount);
  }

  /* Zone 1 */
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
      if (card) card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  /* Zone 2 */
  function renderZone2() {
    const matrix = document.getElementById("comparison-matrix");
    if (!matrix) return;
    matrix.textContent = "";
    const data = window.MemorialData.scapegoating;

    ["left", "right"].forEach((side) => {
      const col = data[side];
      const article = document.createElement("article");
      article.className = `matrix-col matrix-col--${side}`;

      const badge = document.createElement("span");
      badge.className = side === "left" ? "alert-badge" : "alert-badge alert-badge--amber";
      badge.textContent = getI18n(col.badgeKey);

      const h3 = document.createElement("h3");
      h3.className = "panel-title";
      h3.textContent = getI18n(col.titleKey);

      article.append(badge, h3);

      col.items.forEach((item) => {
        const block = document.createElement("div");
        block.className = "matrix-item";
        const era = document.createElement("span");
        era.className = "matrix-era";
        era.textContent = localized(item.era);
        const p = document.createElement("p");
        p.textContent = localized(item.text);
        block.append(era, p);
        article.appendChild(block);
      });

      matrix.appendChild(article);
    });
  }

  /* Zone 3 */
  function renderZone3() {
    const statsEl = document.getElementById("stat-cards");
    const gridEl = document.getElementById("testimonies-grid");
    if (!statsEl || !gridEl) return;

    statsEl.textContent = "";
    window.MemorialData.stats.forEach((stat) => {
      const card = document.createElement("article");
      card.className = `stat-card stat-card--${stat.accent}`;
      const value = document.createElement("div");
      value.className = "stat-value";
      value.textContent = stat.value;
      const label = document.createElement("p");
      label.className = "stat-label";
      label.textContent = localized(stat.label);
      card.append(value, label);
      statsEl.appendChild(card);
    });

    const note = document.createElement("p");
    note.className = "viz-source-note sm:col-span-3";
    note.textContent = getI18n("zone3.sourceNote");
    statsEl.appendChild(note);

    gridEl.textContent = "";
    window.MemorialData.testimonies.forEach((t) => {
      const expanded = state.expandedTestimonyId === t.id;
      const card = document.createElement("button");
      card.type = "button";
      card.className = `testimony-card${expanded ? " is-expanded" : ""}`;
      card.setAttribute("aria-expanded", String(expanded));

      const place = document.createElement("span");
      place.className = "testimony-place";
      place.textContent = localized(t.place);

      const speaker = document.createElement("span");
      speaker.className = "testimony-speaker";
      speaker.textContent = localized(t.speaker);

      const quote = document.createElement("blockquote");
      quote.className = "testimony-quote";
      quote.textContent = localized(t.quote);

      const hint = document.createElement("span");
      hint.className = "testimony-hint";
      hint.textContent = expanded ? getI18n("zone3.clickToCollapse") : getI18n("zone3.clickToExpand");

      card.append(place, speaker, quote);
      if (expanded) {
        const ctx = document.createElement("p");
        ctx.className = "testimony-context";
        ctx.textContent = localized(t.context);
        card.appendChild(ctx);
      }
      card.appendChild(hint);

      card.addEventListener("click", () => {
        state.expandedTestimonyId = expanded ? null : t.id;
        renderZone3();
      });
      gridEl.appendChild(card);
    });
  }

  /* Zone 4 */
  function renderZone4() {
    const headlinesEl = document.getElementById("mirror-headlines");
    const routineEl = document.getElementById("routine-content");
    const beforeBtn = document.getElementById("routine-before");
    const afterBtn = document.getElementById("routine-after");
    if (!headlinesEl || !routineEl) return;

    headlinesEl.textContent = "";
    window.MemorialData.headlines.forEach((h) => {
      const chip = document.createElement("span");
      chip.className = "headline-chip";
      chip.textContent = localized(h);
      headlinesEl.appendChild(chip);
    });

    const isBefore = state.routineMode === "before";
    if (beforeBtn && afterBtn) {
      beforeBtn.setAttribute("aria-pressed", String(isBefore));
      afterBtn.setAttribute("aria-pressed", String(!isBefore));
      beforeBtn.className = `text-btn${isBefore ? " is-active" : ""}`;
      afterBtn.className = `text-btn${!isBefore ? " is-active" : ""}`;
    }

    const items = window.MemorialData.routines[state.routineMode];
    routineEl.textContent = "";
    routineEl.className = `routine-content routine-content--${state.routineMode}`;

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "routine-row";
      const label = document.createElement("h4");
      label.textContent = getI18n(`zone4.${item.key}`);
      const p = document.createElement("p");
      p.textContent = localized(item.text);
      row.append(label, p);
      routineEl.appendChild(row);
    });
  }

  /* Zone 5 */
  function renderZone5() {
    const grid = document.getElementById("resistance-grid");
    if (!grid) return;
    grid.textContent = "";

    window.MemorialData.resistance.forEach((res) => {
      const card = document.createElement("article");
      card.className = "resource-card";
      const h3 = document.createElement("h3");
      h3.className = "resource-name";
      h3.textContent = localized(res.title);
      const p = document.createElement("p");
      p.className = "resource-desc";
      p.textContent = localized(res.desc);
      const link = document.createElement("a");
      link.href = res.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = getI18n("zone5.learnMore");
      card.append(h3, p, link);
      grid.appendChild(card);
    });
  }

  /* Pledge Wall */
  function getAllWallEntries() {
    return [...state.userWallEntries, ...window.MemorialData.seededWall];
  }

  function updateCharCounter() {
    const textarea = document.getElementById("pledge-message");
    const counter = document.getElementById("message-char-count");
    if (!textarea || !counter) return;
    counter.textContent = `${textarea.value.length} / 400`;
  }

  function renderPledgeWall() {
    const filtersEl = document.getElementById("wall-filters");
    const listEl = document.getElementById("pledge-wall-list");
    if (!filtersEl || !listEl) return;

    const filterDefs = [
      { id: "all", key: "wall.filterAll" },
      { id: "candle", key: "wall.filterCandle" },
      { id: "chrysanthemum", key: "wall.filterFlower" },
      { id: "solidarity", key: "wall.filterSolidarity" }
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

    const visible = getAllWallEntries().filter(
      (entry) => state.wallFilter === "all" || entry.icon === state.wallFilter
    );

    listEl.textContent = "";
    if (visible.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-muted";
      empty.textContent = getI18n("wall.emptyWall");
      listEl.appendChild(empty);
      return;
    }

    visible.forEach((entry) => {
      const card = document.createElement("article");
      card.className = `wall-card wall-card--${entry.icon}`;

      const top = document.createElement("div");
      top.className = "wall-card-top";
      const icon = document.createElement("span");
      icon.className = "wall-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.dataset.kind = ICON_LABEL[entry.icon] || "candle";
      const meta = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = entry.name || getI18n("wall.defaultName");
      const time = document.createElement("span");
      time.className = "wall-timestamp";
      time.textContent = entry.timestamp || "";
      meta.append(name, time);
      top.append(icon, meta);
      card.appendChild(top);

      const msg = document.createElement("p");
      msg.className = "wall-message";
      msg.textContent = localized(entry.message);
      card.appendChild(msg);

      const footer = document.createElement("div");
      footer.className = "wall-card-footer";
      if (entry.city) {
        const city = document.createElement("span");
        city.textContent = entry.city;
        footer.appendChild(city);
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
      if (footer.childNodes.length) card.appendChild(footer);

      listEl.appendChild(card);
    });
  }

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

    document.getElementById("contrast-toggle")?.addEventListener("click", () => {
      state.highContrast = !state.highContrast;
      safeStorageSet(STORAGE_KEYS.highContrast, String(state.highContrast));
      applyAccessibilityState();
      announce(getI18n(state.highContrast ? "a11y.contrastOn" : "a11y.contrastOff"));
    });

    document.getElementById("lang-select")?.addEventListener("change", (e) => {
      const nextLang = e.target.value;
      if (window.MemorialI18n[nextLang]) {
        state.lang = nextLang;
        safeStorageSet(STORAGE_KEYS.lang, nextLang);
        renderAll();
        announce(getI18n("a11y.langAnnounce"));
      }
    });

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

    document.getElementById("hero-candle-btn")?.addEventListener("click", () => {
      state.candleCount += 1;
      safeStorageSet(STORAGE_KEYS.candleCount, String(state.candleCount));
      updateCandleDisplay();
      const btn = document.getElementById("hero-candle-btn");
      btn?.classList.add("is-lit");
      window.setTimeout(() => btn?.classList.remove("is-lit"), 600);
      announce(getI18n("a11y.candleAnnounce").replace("{n}", String(state.candleCount)));
    });

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

    document.getElementById("routine-before")?.addEventListener("click", () => {
      state.routineMode = "before";
      renderZone4();
    });
    document.getElementById("routine-after")?.addEventListener("click", () => {
      state.routineMode = "after";
      renderZone4();
    });

    document.getElementById("pledge-message")?.addEventListener("input", () => {
      updateCharCounter();
      const errEl = document.getElementById("pledge-form-error");
      if (errEl) errEl.hidden = true;
    });

    document.getElementById("pledge-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const msgEl = document.getElementById("pledge-message");
      const nameEl = document.getElementById("pledge-name");
      const cityEl = document.getElementById("pledge-city");
      const errEl = document.getElementById("pledge-form-error");
      const iconEl = document.querySelector('input[name="entryIcon"]:checked');

      const message = msgEl ? msgEl.value.trim() : "";
      if (!message) {
        if (errEl) {
          errEl.textContent = getI18n("wall.errorRequired");
          errEl.hidden = false;
        }
        msgEl?.focus();
        return;
      }

      const name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : getI18n("wall.defaultName");
      const entry = {
        id: `user-${Date.now()}`,
        icon: iconEl ? iconEl.value : "candle",
        isSeeded: false,
        name,
        city: cityEl ? cityEl.value.trim() : "",
        message,
        timestamp: new Date().toISOString().slice(0, 10)
      };

      state.userWallEntries.unshift(entry);
      safeStorageSet(STORAGE_KEYS.pledgeWall, JSON.stringify(state.userWallEntries));

      if (msgEl) msgEl.value = "";
      if (nameEl) nameEl.value = "";
      if (cityEl) cityEl.value = "";
      updateCharCounter();
      if (errEl) errEl.hidden = true;
      state.wallFilter = "all";
      renderPledgeWall();
      announce(getI18n("wall.postedSuccess"));
    });

    if ("IntersectionObserver" in window) {
      const sections = document.querySelectorAll("main > section[id]");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              document.querySelectorAll(".chapter-link").forEach((link) => {
                link.classList.toggle("is-active", link.dataset.zoneLink === entry.target.id);
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
    updateCharCounter();
    renderAll();
  });
})();
