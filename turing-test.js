import { TuringTestCore } from "./detector-core.js";

const overlayTemplate = document.createElement("template");
overlayTemplate.innerHTML = `
  <style>
    :host {
      --human-color: rgba(23, 184, 106, 0.95);
      --robot-color: rgba(255, 48, 48, 0.98);
      --toast-bg: rgba(228, 235, 240, 0.82);
      --detection-color: var(--human-color);
      position: fixed;
      inset: 0;
      display: block;
      pointer-events: none;
      z-index: 50;
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
      color: #f7fbfd;
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
      border: 1px solid rgba(90, 113, 128, 0.24);
      background: var(--toast-bg);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      gap: 10px;
      color: #182128;
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
      background: rgba(247, 251, 253, 0.95);
      border: 2px solid var(--detection-color);
      color: #182128;
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

  <div class="achievement-toasts" part="toasts" aria-live="polite" aria-atomic="true"></div>
`;

const debugTemplate = document.createElement("template");
debugTemplate.innerHTML = `
  <style>
    :host {
      --panel-bg: rgba(223, 230, 236, 0.72);
      --panel-border: rgba(104, 126, 142, 0.28);
      --panel-text: #19242d;
      --panel-muted: rgba(25, 36, 45, 0.62);
      --panel-accent: rgba(23, 184, 106, 0.95);
      position: fixed;
      left: 18px;
      bottom: 18px;
      display: block;
      width: min(240px, calc(100vw - 36px));
      color: var(--panel-text);
      font: 500 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      letter-spacing: 0.02em;
      z-index: 40;
    }

    :host([state="robot"]) {
      --panel-accent: rgba(255, 48, 48, 0.98);
    }

    .panel {
      border: 1px solid var(--panel-border);
      background: var(--panel-bg);
      backdrop-filter: blur(12px);
      padding: 12px 14px;
    }

    .title {
      margin-bottom: 8px;
      color: var(--panel-accent);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .list {
      margin: 4px 0 8px;
      padding-left: 12px;
      color: var(--panel-muted);
      font-size: 11px;
    }

    .list div { margin: 2px 0; }

    .divider {
      height: 1px;
      margin: 8px 0;
      background: rgba(104, 126, 142, 0.2);
    }

    .status {
      margin-bottom: 8px;
      color: var(--panel-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
  </style>

  <aside class="panel" aria-label="Turing Test debug stats">
    <div class="title">debug</div>
    <div class="status" data-status>waiting for source</div>
    <div class="row"><span>base</span><span data-base>0</span></div>
    <div class="list" data-details>baseline</div>
    <div class="row"><span>motion</span><span data-motion>0</span></div>
    <div class="row"><span>typing</span><span data-typing>0</span></div>
    <div class="row"><span>scroll</span><span data-scroll>0</span></div>
    <div class="row"><span>click</span><span data-click>0</span></div>
    <div class="divider"></div>
    <div class="row"><span>human</span><span data-human>0</span></div>
    <div class="row"><span>robot</span><span data-robot>0</span></div>
    <div class="row"><span>class</span><span data-state>human</span></div>
  </aside>
`;

const formatSigned = (value) => `${value > 0 ? "+" : ""}${value}`;

const toPublicSnapshot = (snapshot) => ({
  visible: snapshot.visible,
  state: snapshot.isRobot ? "robot" : "human",
  colorState: snapshot.isRobot ? "robot" : "human",
  confidence: snapshot.confidence,
  humanConfidence: snapshot.confidence,
  robotConfidence: 100 - snapshot.confidence,
  label: snapshot.label,
  baseConfidence: snapshot.baseConfidence,
  totalAdjustment: snapshot.totalAdjustment,
  scores: { ...snapshot.scores },
  baseBreakdown: {
    score: snapshot.baseBreakdown.score,
    details: [...snapshot.baseBreakdown.details],
  },
});

export class TuringTestElement extends HTMLElement {
  static get observedAttributes() {
    return ["achievements", "human-color", "robot-color"];
  }

  constructor() {
    super();
    this.core = new TuringTestCore();
    this.snapshot = null;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(overlayTemplate.content.cloneNode(true));

    this.box = this.shadowRoot.querySelector(".detection-box");
    this.label = this.shadowRoot.querySelector(".detection-label");
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
    this.applyConfiguredColors();
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
  }

  attributeChangedCallback() {
    this.applyConfiguredColors();
    if (this.isConnected) {
      this.render(this.core.getSnapshot());
    }
  }

  applyConfiguredColors() {
    const humanColor = this.getAttribute("human-color");
    const robotColor = this.getAttribute("robot-color");
    if (humanColor) this.style.setProperty("--human-color", humanColor);
    if (robotColor) this.style.setProperty("--robot-color", robotColor);
  }

  get state() {
    return this.snapshot?.state ?? "human";
  }

  get colorState() {
    return this.snapshot?.colorState ?? "human";
  }

  get humanConfidence() {
    return this.snapshot?.humanConfidence ?? this.core.getSnapshot().confidence;
  }

  get robotConfidence() {
    return this.snapshot?.robotConfidence ?? 100 - this.humanConfidence;
  }

  render(coreSnapshot) {
    this.toggleAttribute("robot", coreSnapshot.isRobot);
    this.box.style.width = `${coreSnapshot.box.width}px`;
    this.box.style.height = `${coreSnapshot.box.height}px`;
    this.box.style.transform = `translate(${coreSnapshot.box.x}px, ${coreSnapshot.box.y}px) translate(-50%, -50%)`;
    this.box.classList.toggle("is-visible", coreSnapshot.visible);
    this.box.classList.toggle("is-left-edge", coreSnapshot.box.isLeftEdge && coreSnapshot.box.width < this.label.scrollWidth + 12);
    this.label.textContent = coreSnapshot.label;

    if (this.hasAttribute("achievements")) {
      coreSnapshot.unlockedAchievements.forEach((achievement) => this.showAchievement(achievement));
    }

    this.snapshot = toPublicSnapshot(coreSnapshot);
    this.dispatchEvent(new CustomEvent("turing-test:update", {
      detail: this.snapshot,
      bubbles: true,
      composed: true,
    }));
  }

  showAchievement(message) {
    const toast = document.createElement("div");
    toast.className = "achievement-toast";
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

export class TuringTestDebugElement extends HTMLElement {
  static get observedAttributes() {
    return ["for"];
  }

  constructor() {
    super();
    this.target = null;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(debugTemplate.content.cloneNode(true));

    this.status = this.shadowRoot.querySelector("[data-status]");
    this.base = this.shadowRoot.querySelector("[data-base]");
    this.details = this.shadowRoot.querySelector("[data-details]");
    this.motion = this.shadowRoot.querySelector("[data-motion]");
    this.typing = this.shadowRoot.querySelector("[data-typing]");
    this.scroll = this.shadowRoot.querySelector("[data-scroll]");
    this.click = this.shadowRoot.querySelector("[data-click]");
    this.human = this.shadowRoot.querySelector("[data-human]");
    this.robot = this.shadowRoot.querySelector("[data-robot]");
    this.stateValue = this.shadowRoot.querySelector("[data-state]");

    this.handleUpdate = (event) => {
      this.render(event.detail);
    };
  }

  connectedCallback() {
    this.bindTarget();
  }

  disconnectedCallback() {
    this.unbindTarget();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this.bindTarget();
    }
  }

  bindTarget() {
    this.unbindTarget();
    const targetId = this.getAttribute("for");
    this.target = targetId ? document.getElementById(targetId) : document.querySelector("turing-test");

    if (!this.target) {
      this.render(null);
      return;
    }

    this.target.addEventListener("turing-test:update", this.handleUpdate);
    this.render(this.target.snapshot ?? null);
  }

  unbindTarget() {
    if (this.target) {
      this.target.removeEventListener("turing-test:update", this.handleUpdate);
      this.target = null;
    }
  }

  render(snapshot) {
    if (!snapshot) {
      this.setAttribute("state", "human");
      this.status.textContent = "waiting for source";
      return;
    }

    this.setAttribute("state", snapshot.state);
    this.status.textContent = snapshot.visible ? snapshot.label : "idle";
    this.base.textContent = `${snapshot.baseConfidence}%`;
    this.details.innerHTML = snapshot.baseBreakdown.details.length
      ? snapshot.baseBreakdown.details.map((detail) => `<div>${detail}</div>`).join("")
      : "<div>baseline</div>";
    this.motion.textContent = formatSigned(snapshot.scores.motion);
    this.typing.textContent = formatSigned(snapshot.scores.typing);
    this.scroll.textContent = formatSigned(snapshot.scores.scroll);
    this.click.textContent = formatSigned(snapshot.scores.click);
    this.human.textContent = `${snapshot.humanConfidence}%`;
    this.robot.textContent = `${snapshot.robotConfidence}%`;
    this.stateValue.textContent = snapshot.state;
  }
}

if (!customElements.get("turing-test")) {
  customElements.define("turing-test", TuringTestElement);
}

if (!customElements.get("turing-test-debug")) {
  customElements.define("turing-test-debug", TuringTestDebugElement);
}

window.dispatchEvent(new CustomEvent("turing-test:ready"));
