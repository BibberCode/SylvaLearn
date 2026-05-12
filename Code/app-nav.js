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
        .nav {
          position: fixed;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 32px);
          max-width: 420px;

          display: flex;
          justify-content: space-between;
          align-items: center;

          padding: 6px;

          border-radius: 999px;

          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(16px);

          box-shadow:
            0 10px 25px rgba(0,0,0,0.08),
            0 2px 6px rgba(0,0,0,0.05);

          border: 1px solid rgba(255,255,255,0.6);

          overflow: hidden;
        }

        button {
          flex: 1;
          border: none;
          background: transparent;
          padding: 10px 0;
          font-size: 12px;
          color: #7a8a82;
          border-radius: 999px;
          cursor: pointer;
          z-index: 2;
          position: relative;
        }

        button.active {
          color: #1f6f4a;
          font-weight: 600;
        }

        button span {
          display: block;
          font-size: 18px;
          margin-bottom: 2px;
        }

        .bubble {
          position: absolute;
          top: 6px;
          left: 0;
          height: calc(100% - 12px);

          background: rgba(31,111,74,0.12);
          border-radius: 999px;

          transition:
            transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            width 0.25s ease;

          z-index: 1;
        }

        button:active {
          transform: scale(0.92);
          transition: transform 0.1s ease;
        }
      </style>

      <div class="nav">
        <div class="bubble"></div>

        <button data-page="/index"><span>🏠</span>Home</button>
        <button data-page="/Code/cards/cards"><span>📚</span>Karten</button>
        <button data-page="/Code/learn/learn"><span>🎓</span>Lernen</button>
        <button data-page="/Code/stats/stats"><span>📊</span>Statistik</button>
        <button data-page="/Code/profile/profile"><span>👤</span>Profil</button>
      </div>
    `;
  }

  init() {
    const nav = this.shadowRoot.querySelector(".nav");
    const bubble = this.shadowRoot.querySelector(".bubble");
    const buttons = this.shadowRoot.querySelectorAll("button");

    const base = this.getBasePath();
    const currentPath = location.pathname.replace(base, "");

    const moveBubble = (el) => {
      const elRect = el.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();

      bubble.style.width = elRect.width + "px";
      bubble.style.transform = `translateX(${elRect.left - navRect.left}px)`;
    };

    const setActive = (btn) => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      moveBubble(btn);
    };

    const normalize = (p) =>
      p.endsWith(".html") ? p : p + ".html";

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const target = normalize(btn.dataset.page);
        window.location.href = base + target;
      });
    });

    // Active Button erkennen
    let activeBtn = null;

    buttons.forEach(btn => {
      const target = normalize(btn.dataset.page);

      if (
        currentPath.endsWith(target) ||
        (btn.dataset.page === "/index" &&
          (currentPath === "/" || currentPath === "/index.html"))
      ) {
        activeBtn = btn;
      }
    });

    const initBubble = () => {
      if (activeBtn) {
        setActive(activeBtn);
      } else {
        bubble.style.width = "0px";
        bubble.style.transform = "translateX(0px)";
      }
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(() =>
        requestAnimationFrame(initBubble)
      );
    } else {
      requestAnimationFrame(initBubble);
    }

    window.addEventListener("resize", () => {
      const active = this.shadowRoot.querySelector(".active");
      if (active) moveBubble(active);
    });
  }
}

customElements.define("app-nav", AppNav);