import { TuringTestCore } from "./detector-core.js";

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      --human-color: rgba(23, 184, 106, 0.95);
      --robot-color: rgba(255, 48, 48, 0.98);
      --panel-bg: rgba(247, 245, 239, 0.9);
      --toast-bg: rgba(247, 245, 239, 0.78);
      --text-color: #171717;
      --detection-color: var(--human-color);
      position: fixed;
      inset: 0;
      display: block;
      pointer-events: none;
      z-index: 50;
      color: var(--text-color);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    :host([robot]) {
      --detection-color: var(--robot-color);
    }

    .detection-box {
      position: fixed;
      left: 0;
      top: 0;
      width: 120px;
      height: 150px;
      border: 4px solid var(--detection-color);
      transform: translate(-50%, -50%);
      opacity: 0;
    }

    .detection-box.is-visible {
      opacity: 1;
    }

    .detection-label {
      right: 0;
      bottom: 0;
      position: absolute;
      padding: 2px 2px 2px 6px;
      background: var(--detection-color);
      color: #fff;
      font: 600 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0.06em;
      white-space: nowrap;
      text-align: right;
    }

    .detection-box.is-left-edge .detection-label {
      left: 0;
      right: auto;
      padding: 2px 6px 2px 2px;
      text-align: left;
    }

    .corner {
      position: absolute;
      width: 18px;
      height: 18px;
      border-color: var(--detection-color);
      border-style: solid;
    }

    .corner-top-left { top: -2px; left: -2px; border-width: 2px 0 0 2px; }
    .corner-top-right { top: -2px; right: -2px; border-width: 2px 2px 0 0; }
    .corner-bottom-left { bottom: -2px; left: -2px; border-width: 0 0 2px 2px; }
    .corner-bottom-right { right: -2px; bottom: -2px; border-width: 0 2px 2px 0; }

    .panel {
      border: 1px solid rgba(0, 0, 0, 0.12);
      background: var(--panel-bg);
      backdrop-filter: blur(6px);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.08);
      pointer-events: auto;
    }

    .debug-panel {
      position: fixed;
      left: 16px;
      bottom: 16px;
      min-width: 160px;
      padding: 10px 12px;
      font: 500 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      letter-spacing: 0.02em;
      display: none;
    }

    :host([debug]) .debug-panel {
      display: block;
    }

    .debug-title {
      margin-bottom: 8px;
      color: var(--detection-color);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .debug-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .debug-list {
      margin: 4px 0 8px;
      padding-left: 12px;
      color: rgba(0, 0, 0, 0.62);
      font-size: 11px;
    }

    .debug-list div { margin: 2px 0; }

    .debug-divider {
      height: 1px;
      margin: 6px 0 8px;
      background: rgba(0, 0, 0, 0.12);
    }

    .debug-total {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }

    .debug-control {
      display: grid;
      gap: 8px;
      margin-top: 8px;
    }

    .debug-control button {
      appearance: none;
      border: 1px solid rgba(0, 0, 0, 0.18);
      background: rgba(255, 255, 255, 0.85);
      color: var(--text-color);
      padding: 6px 8px;
      font: inherit;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .debug-control button.is-active {
      border-color: var(--detection-color);
      color: var(--detection-color);
    }

    .debug-slider {
      display: grid;
      gap: 6px;
      font-size: 11px;
      color: rgba(0, 0, 0, 0.72);
    }

    .debug-slider input[type="range"] {
      width: 100%;
    }

    .achievement-toasts {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: min(320px, calc(100vw - 32px));
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
    }

    .achievement-toast {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid rgba(0, 0, 0, 0.24);
      background: var(--toast-bg);
      display: flex;
      align-items: center;
      gap: 10px;
      font: 600 12px/1.3 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      transform: translateX(100%);
      animation: toast-in 180ms ease-out forwards;
      transition: transform 420ms cubic-bezier(0.3, 0, 0.6, 1);
    }

    .achievement-toast-icon {
      flex: 0 0 auto;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.92);
      border: 3px double var(--detection-color);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.58);
      color: #111;
      font: 700 22px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .achievement-toast-body { min-width: 0; }
    .achievement-toast-title { font-size: 12px; }

    .achievement-toast-subtitle {
      margin-top: 4px;
      font-size: 10px;
      line-height: 1.25;
      letter-spacing: 0.04em;
      text-transform: none;
      opacity: 0.72;
    }

    .achievement-toast.is-settling { transform: translateX(0); }
    .achievement-toast.is-exiting { animation: toast-out 180ms ease-in forwards; }

    @keyframes toast-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
    @keyframes toast-out { from { transform: translateX(0); } to { transform: translateX(100%); } }

    @media (max-width: 720px) {
      .debug-panel { left: 16px; right: 16px; bottom: 16px; min-width: 0; }
      .achievement-toasts { left: 16px; right: 16px; width: auto; }
    }
  </style>

  <div class="detection-box" part="box" aria-hidden="true">
    <span class="detection-label" part="label">visitor</span>
    <span class="corner corner-top-left"></span>
    <span class="corner corner-top-right"></span>
    <span class="corner corner-bottom-left"></span>
    <span class="corner corner-bottom-right"></span>
  </div>

  <aside class="panel debug-panel" part="debug-panel" aria-label="Detection debug">
    <div class="debug-title">debug</div>
    <div class="debug-row"><span>base</span><span data-debug-base>0</span></div>
    <div class="debug-list" data-debug-base-details>baseline</div>
    <div class="debug-row"><span>motion</span><span data-debug-motion>0</span></div>
    <div class="debug-row"><span>typing</span><span data-debug-typing>0</span></div>
    <div class="debug-row"><span>scroll</span><span data-debug-scroll>0</span></div>
    <div class="debug-row"><span>click</span><span data-debug-click>0</span></div>
    <div class="debug-divider"></div>
    <div class="debug-control">
      <button type="button" data-debug-toggle>override off</button>
      <label class="debug-slider">
        <span>confidence</span>
        <input type="range" min="1" max="99" value="50" data-debug-range />
        <span data-debug-value>50%</span>
      </label>
    </div>
    <div class="debug-row debug-total"><span>final</span><span data-debug-final>0</span></div>
  </aside>

  <div class="achievement-toasts" part="toasts" aria-live="polite" aria-atomic="true"></div>
`;

const formatSigned = (value) => `${value > 0 ? "+" : ""}${value}`;

export class TuringTestElement extends HTMLElement {
  static get observedAttributes() {
    return ["debug", "achievements"];
  }

  constructor() {
    super();
    this.core = new TuringTestCore();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.box = this.shadowRoot.querySelector(".detection-box");
    this.label = this.shadowRoot.querySelector(".detection-label");
    this.debugBase = this.shadowRoot.querySelector("[data-debug-base]");
    this.debugBaseDetails = this.shadowRoot.querySelector("[data-debug-base-details]");
    this.debugMotion = this.shadowRoot.querySelector("[data-debug-motion]");
    this.debugTyping = this.shadowRoot.querySelector("[data-debug-typing]");
    this.debugScroll = this.shadowRoot.querySelector("[data-debug-scroll]");
    this.debugClick = this.shadowRoot.querySelector("[data-debug-click]");
    this.debugFinal = this.shadowRoot.querySelector("[data-debug-final]");
    this.debugToggle = this.shadowRoot.querySelector("[data-debug-toggle]");
    this.debugRange = this.shadowRoot.querySelector("[data-debug-range]");
    this.debugValue = this.shadowRoot.querySelector("[data-debug-value]");
    this.achievementToasts = this.shadowRoot.querySelector(".achievement-toasts");

    this.onPointer = (event) => this.render(this.core.trackPointer(event.clientX, event.clientY));
    this.onKeydown = (event) => this.render(this.core.trackKeydown(event.key, event.code, event.repeat));
    this.onKeyup = (event) => this.render(this.core.trackKeyup(event.key, event.code));
    this.onScroll = (event) => this.render(this.core.trackScroll(event.deltaY));
    this.onClick = (event) => this.render(this.core.trackClick(event.clientX, event.clientY));
    this.onLeave = () => this.render(this.core.hide());
    this.onResize = () => this.render(this.core.resize(window.innerWidth, window.innerHeight));
  }

  connectedCallback() {
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    window.addEventListener("pointerdown", this.onPointer, { passive: true });
    window.addEventListener("keydown", this.onKeydown, { passive: true });
    window.addEventListener("keyup", this.onKeyup, { passive: true });
    window.addEventListener("wheel", this.onScroll, { passive: true });
    window.addEventListener("click", this.onClick, { passive: true });
    document.documentElement.addEventListener("mouseleave", this.onLeave);
    window.addEventListener("blur", this.onLeave);
    window.addEventListener("resize", this.onResize);
    this.debugToggle.addEventListener("click", this.onToggleDebugOverride);
    this.debugRange.addEventListener("input", this.onDebugRangeInput);

    this.core.setDebugOverrideValue(Number(this.debugRange.value));
    this.render(this.core.resize(window.innerWidth, window.innerHeight));
  }

  disconnectedCallback() {
    window.removeEventListener("pointermove", this.onPointer);
    window.removeEventListener("pointerdown", this.onPointer);
    window.removeEventListener("keydown", this.onKeydown);
    window.removeEventListener("keyup", this.onKeyup);
    window.removeEventListener("wheel", this.onScroll);
    window.removeEventListener("click", this.onClick);
    document.documentElement.removeEventListener("mouseleave", this.onLeave);
    window.removeEventListener("blur", this.onLeave);
    window.removeEventListener("resize", this.onResize);
    this.debugToggle.removeEventListener("click", this.onToggleDebugOverride);
    this.debugRange.removeEventListener("input", this.onDebugRangeInput);
  }

  attributeChangedCallback() {
    this.render(this.core.getSnapshot());
  }

  onToggleDebugOverride = () => {
    this.render(this.core.setDebugOverrideEnabled(!this.core.debugOverride.enabled));
  };

  onDebugRangeInput = (event) => {
    this.render(this.core.setDebugOverrideValue(Number(event.target.value)));
  };

  render(snapshot) {
    this.toggleAttribute("robot", snapshot.isRobot);
    this.box.style.width = `${snapshot.box.width}px`;
    this.box.style.height = `${snapshot.box.height}px`;
    this.box.style.transform = `translate(${snapshot.box.x}px, ${snapshot.box.y}px) translate(-50%, -50%)`;
    this.box.classList.toggle("is-visible", snapshot.visible);
    this.box.classList.toggle("is-left-edge", snapshot.box.isLeftEdge && snapshot.box.width < this.label.scrollWidth + 12);
    this.label.textContent = snapshot.label;

    this.debugBase.textContent = `${snapshot.baseConfidence}%`;
    this.debugBaseDetails.innerHTML = snapshot.baseBreakdown.details.length
      ? snapshot.baseBreakdown.details.map((detail) => `<div>${detail}</div>`).join("")
      : "<div>baseline</div>";
    this.debugMotion.textContent = formatSigned(snapshot.scores.motion);
    this.debugTyping.textContent = formatSigned(snapshot.scores.typing);
    this.debugScroll.textContent = formatSigned(snapshot.scores.scroll);
    this.debugClick.textContent = formatSigned(snapshot.scores.click);
    this.debugFinal.textContent = snapshot.debugOverride.enabled ? `${snapshot.confidence}% override` : `${snapshot.confidence}% human`;
    this.debugToggle.textContent = snapshot.debugOverride.enabled ? "override on" : "override off";
    this.debugToggle.classList.toggle("is-active", snapshot.debugOverride.enabled);
    this.debugValue.textContent = `${snapshot.debugOverride.value}%`;
    this.debugRange.value = String(snapshot.debugOverride.value);

    if (this.hasAttribute("achievements")) {
      snapshot.unlockedAchievements.forEach((achievement) => this.showAchievement(achievement));
    }
  }

  showAchievement(message) {
    const toast = document.createElement("div");
    toast.className = "achievement-toast panel";
    toast.innerHTML = `<div class="achievement-toast-icon" aria-hidden="true">${message.icon}</div><div class="achievement-toast-body"><div class="achievement-toast-title">${message.title}</div><div class="achievement-toast-subtitle">${message.subtitle}</div></div>`;
    this.achievementToasts.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-settling");
    });

    window.setTimeout(() => {
      const beforeRects = new Map(
        Array.from(this.achievementToasts.children)
          .filter((node) => node !== toast)
          .map((node) => [node, node.getBoundingClientRect()])
      );

      toast.addEventListener(
        "animationend",
        () => {
          toast.remove();
          requestAnimationFrame(() => {
            Array.from(this.achievementToasts.children).forEach((node) => {
              const first = beforeRects.get(node);
              if (!first) return;

              const last = node.getBoundingClientRect();
              const dx = first.left - last.left;
              const dy = first.top - last.top;

              if (!dx && !dy) return;

              node.style.transition = "none";
              node.style.transform = `translate(${dx}px, ${dy}px)`;
              node.getBoundingClientRect();
              node.style.transition = "transform 420ms cubic-bezier(0.4, 0, 0.2, 1)";
              node.style.transform = "translate(0, 0)";
            });
          });
        },
        { once: true }
      );

      toast.classList.add("is-exiting");
    }, 3400);
  }
}

if (!customElements.get("turing-test")) {
  customElements.define("turing-test", TuringTestElement);
  window.dispatchEvent(new CustomEvent("turing-test:ready"));
}
