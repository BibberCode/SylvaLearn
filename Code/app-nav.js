class AppNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.init();
  }

  getBasePath() {
    return location.hostname.includes("github.io") ? "/SylvaLearn" : "";
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 9999;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          justify-content: center;
          pointer-events: none;
          view-transition-name: app-nav;
        }

        .nav {
          position: relative;
          /* FIX: 100% statt 100vw – unabhängig von Scrollbar-Breite+Gutter */
          width: min(420px, calc(100% - 32px));
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          padding: 6px;
          margin-bottom: 14px;
          box-sizing: border-box;
          border-radius: 999px;
          background: var(--nav-bg, rgba(255, 255, 255, 0.78));
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--nav-border, rgba(255, 255, 255, 0.65));
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          pointer-events: auto;
          contain: layout;
          transition: background 0.25s ease, border-color 0.25s ease;
        }

        button {
          position: relative;
          z-index: 2;
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          padding: 10px 0;
          font-family: inherit;
          font-size: 12px;
          color: var(--muted, #7a8a82);
          border-radius: 999px;
          cursor: pointer;
          transition: color 0.2s ease, transform 0.12s ease;
        }

        button:hover { color: var(--primary, #1f6f4a); }
        button.active { color: var(--primary, #1f6f4a); font-weight: 600; }
        button span { display: block; font-size: 18px; line-height: 20px; margin-bottom: 2px; }
        button:active { transform: scale(0.93); }

        /*
         * ==========================================
         * BUBBLE – rein via CSS-Variable, kein JS-Messen
         * ==========================================
         */
        .bubble {
          position: absolute;
          top: 6px;
          left: 6px;
          height: calc(100% - 12px);
          /* Breite = exakt 1/5 der verfügbaren Nav-Breite */
          width: calc((100% - 12px) / 5);
          border-radius: 999px;
          background: var(--bubble-bg, #e8f3ed);
          box-shadow: var(--bubble-shadow, inset 0 0 0 1px rgba(31, 111, 74, 0.04));
          z-index: 1;
          pointer-events: none;
          /* Index 0..4 – wird via JS gesetzt */
          --active-index: 0;
          transform: translateX(calc(var(--active-index) * 100%));
          transition: none;
          will-change: transform;
          /* Eigener View-Transition-Name für MPA-Slide zwischen Seiten */
          view-transition-name: app-nav-bubble;
        }

        .bubble.ready {
          transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* Während View Transition soll Bubble-Slide dieselbe Dauer haben */
        @supports (view-transition-name: app-nav-bubble) {
          .bubble { view-transition-name: app-nav-bubble; }
        }

        @media (max-width: 420px) {
          .nav { width: calc(100% - 20px); margin-bottom: 10px; }
          button { padding: 9px 0; font-size: 11px; }
          button span { font-size: 17px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .bubble { transition: none !important; }
          button { transition: none !important; }
        }
      </style>

      <nav class="nav" aria-label="Hauptnavigation">
        <div class="bubble"></div>
        <button data-page="/index"><span>🏠</span>Home</button>
        <button data-page="/Code/cards/cards"><span>📚</span>Karten</button>
        <button data-page="/Code/learn/learn"><span>🎓</span>Lernen</button>
        <button data-page="/Code/stats/stats"><span>📊</span>Statistik</button>
        <button data-page="/Code/profile/profile"><span>👤</span>Profil</button>
      </nav>
    `;
  }

  init() {
    const nav = this.shadowRoot.querySelector(".nav");
    const bubble = this.shadowRoot.querySelector(".bubble");
    const buttons = Array.from(this.shadowRoot.querySelectorAll("button"));
    const base = this.getBasePath();

    let currentPath = location.pathname;
    if (base && currentPath.startsWith(base)) currentPath = currentPath.slice(base.length);
    if (!currentPath) currentPath = "/";

    const normalize = (path) => {
      if (path === "/index") return "/index.html";
      return path.endsWith(".html") ? path : path + ".html";
    };

    let activeButton = null;
    let activeIndex = 0;
    buttons.forEach((button, idx) => {
      const page = button.dataset.page;
      const target = normalize(page);
      if (currentPath === target || currentPath.endsWith(target)) {
        activeButton = button;
        activeIndex = idx;
      }
      if (page === "/index" && (currentPath === "/" || currentPath === "/index.html")) {
        activeButton = button;
        activeIndex = idx;
      }
    });
    // Letzte Prüfung für Home auf GitHub Pages ("/SylvaLearn/" -> "/")
    if (!activeButton) {
      const fallback = buttons[0];
      // Wenn kein Treffer aber Root, Home als aktiv
      if (currentPath === "/" || currentPath === "/index.html") {
        activeButton = fallback;
        activeIndex = 0;
      }
    }

    const setIndex = (index, instant = false) => {
      if (instant) bubble.classList.remove("ready");
      bubble.style.setProperty("--active-index", String(index));
    };

    // ==========================================
    // INITIALISIERUNG – sofort korrekt, kein Hide/Flash
    // Bubble via CSS-Variable ist bereits per calc() korrekt,
    // daher kein visibility:hidden nötig. Nur Transition kurz aus.
    // ==========================================
    if (activeButton) {
      activeButton.classList.add("active");
      // Direkt korrekten Index setzen – kein Sprung, kein Entladen
      setIndex(activeIndex, true);
      // Nach erstem Paint Transition aktivieren für smooth Gleiten bei Klick
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bubble.classList.add("ready");
        });
      });

      // ResizeObserver nur für Viewport-Änderungen (z.B. Rotation)
      // Kein hide/show, da calc() bereits stabil
      if (typeof ResizeObserver !== "undefined") {
        let roFrame = 0;
        const ro = new ResizeObserver(() => {
          cancelAnimationFrame(roFrame);
          roFrame = requestAnimationFrame(() => {
            // Kurz Transition aus für instant Neuberechnung bei Größenänderung
            const wasReady = bubble.classList.contains("ready");
            if (wasReady) bubble.classList.remove("ready");
            bubble.style.setProperty("--active-index", String(activeIndex));
            if (wasReady) requestAnimationFrame(() => bubble.classList.add("ready"));
          });
        });
        ro.observe(nav);
        this._ro = ro;
      }

      // Fonts nachladen (Emoji) – nur falls nötig leicht nachjustieren
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          // Index bleibt gleich, Browser rechnet calc() neu – kein Visible-Jump
          bubble.style.setProperty("--active-index", String(activeIndex));
        });
      }
    }

    // ==========================================
    // NAVIGATION – Bubble gleitet, kein künstlicher Delay
    // View Transition API übernimmt MPA-Slide für Bubble
    // ==========================================
    buttons.forEach((button, idx) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button === activeButton) return;

        buttons.forEach((b) => b.classList.remove("active"));
        button.classList.add("active");

        // Bubble gleitet smooth (falls View Transitions nicht unterstützen,
        // sieht man kurzen Glide vor dem Unload; mit View Transitions
        // übernimmt die Cross-Document-Animation den Slide)
        bubble.classList.add("ready");
        bubble.style.setProperty("--active-index", String(idx));

        const target = normalize(button.dataset.page);
        const destination = base + target;

        // Für sauberen Wechsel auch mit/ohne Loading Screen:
        // Markiert Nav-Navigation für verkürzten Loading-Screen (Web)
        try { sessionStorage.setItem("sylva-nav-from", Date.now().toString()); } catch {}
        window.location.href = destination;
      });
    });
  }

  disconnectedCallback() {
    if (this._ro) this._ro.disconnect();
  }
}

customElements.define("app-nav", AppNav);
