const BOX_WIDTH = 120;
const BOX_HEIGHT = 150;
const MOTION_WINDOW_MS = 5000;
const MOTION_SAMPLE_LIMIT = 18;
const TYPE_SAMPLE_LIMIT = 20;
const SCROLL_WINDOW_MS = 4000;
const SCROLL_SAMPLE_LIMIT = 15;
const CLICK_SAMPLE_LIMIT = 20;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const standardDeviation = (values) => {
  if (values.length < 2) return 0;
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
};

const DEFAULT_ACHIEVEMENTS = [
  { key: "robot", maxConfidence: 49, icon: "%", title: "Did you just...failed the Turing Test?", subtitle: "Reaching 50% confidence of being a robot." },
  { key: "robot75", maxConfidence: 25, icon: "*", title: "Haraway would be proud", subtitle: "Reaching 75% confidence of being a robot." },
  { key: "robot90", maxConfidence: 10, icon: "#", title: "The last of us", subtitle: "Reaching 90% confidence of being a robot." },
  { key: "robot99", maxConfidence: 1, icon: "X", title: "24K Silicon", subtitle: "Reaching 99% confidence of being a robot." },
];

export class TuringTestCore {
  constructor(options = {}) {
    this.achievementRules = options.achievementRules ?? DEFAULT_ACHIEVEMENTS;
    this.debugOverride = { enabled: false, value: 50 };
    this.state = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      visible: false,
      trail: [],
      keydowns: [],
      keyHolds: [],
      scrolls: [],
      clicks: [],
      activeKeys: new Map(),
      lastPointerMove: null,
      scores: { motion: 0, typing: 0, scroll: 0, click: 0 },
      dirty: { motion: true, typing: true, scroll: true, click: true },
      unlockedAchievements: new Set(),
    };
  }

  resize(width = globalThis.innerWidth ?? 0, height = globalThis.innerHeight ?? 0) {
    if (!this.state.x && !this.state.y) {
      this.state.x = width / 2;
      this.state.y = height / 2;
      this.state.targetX = width / 2;
      this.state.targetY = height / 2;
    }

    return this.getSnapshot({ width, height });
  }

  setDebugOverrideEnabled(enabled) {
    this.debugOverride.enabled = enabled;
    return this.getSnapshot();
  }

  setDebugOverrideValue(value) {
    this.debugOverride.value = clamp(Number(value) || 1, 1, 99);
    return this.getSnapshot();
  }

  hide() {
    this.state.visible = false;
    return this.getSnapshot();
  }

  trackPointer(x, y, t = performance.now()) {
    const sample = { x, y, t };
    this.state.targetX = x;
    this.state.targetY = y;
    this.state.visible = true;
    this.state.trail.push(sample);
    this.state.trail = this.state.trail.filter((point) => sample.t - point.t <= MOTION_WINDOW_MS).slice(-MOTION_SAMPLE_LIMIT);
    this.state.lastPointerMove = sample;
    this.state.dirty.motion = true;
    return this.getSnapshot();
  }

  trackKeydown(key, code, repeat = false, t = performance.now()) {
    const sample = { key, t };
    this.state.keydowns.push(sample);
    this.state.keydowns = this.state.keydowns.slice(-TYPE_SAMPLE_LIMIT);
    this.state.dirty.typing = true;

    if (!repeat) {
      this.state.activeKeys.set(code, sample.t);
    }

    return this.getSnapshot();
  }

  trackKeyup(key, code, t = performance.now()) {
    const startedAt = this.state.activeKeys.get(code);
    if (startedAt === undefined) return this.getSnapshot();

    const sample = { key, duration: Math.max(t - startedAt, 0), t };
    this.state.keyHolds.push(sample);
    this.state.keyHolds = this.state.keyHolds.slice(-TYPE_SAMPLE_LIMIT);
    this.state.activeKeys.delete(code);
    this.state.dirty.typing = true;
    return this.getSnapshot();
  }

  trackScroll(deltaY, t = performance.now()) {
    const sample = { deltaY, t };
    this.state.scrolls.push(sample);
    this.state.scrolls = this.state.scrolls.filter((entry) => sample.t - entry.t <= SCROLL_WINDOW_MS).slice(-SCROLL_SAMPLE_LIMIT);
    this.state.dirty.scroll = true;
    return this.getSnapshot();
  }

  trackClick(x, y, t = performance.now()) {
    const hoverDelay = this.state.lastPointerMove ? t - this.state.lastPointerMove.t : 0;
    const hoverDistance = this.state.lastPointerMove ? Math.hypot(x - this.state.lastPointerMove.x, y - this.state.lastPointerMove.y) : 0;
    this.state.clicks.push({ hoverDelay, hoverDistance, t });
    this.state.clicks = this.state.clicks.slice(-CLICK_SAMPLE_LIMIT);
    this.state.dirty.click = true;
    return this.getSnapshot();
  }

  getSnapshot(viewport = { width: globalThis.innerWidth ?? 0, height: globalThis.innerHeight ?? 0 }) {
    if (this.state.dirty.motion) {
      this.state.scores.motion = this.getMouseAdjustment();
      this.state.dirty.motion = false;
    }

    if (this.state.dirty.typing) {
      this.state.scores.typing = this.getTypingAdjustment();
      this.state.dirty.typing = false;
    }

    if (this.state.dirty.scroll) {
      this.state.scores.scroll = this.getScrollAdjustment();
      this.state.dirty.scroll = false;
    }

    if (this.state.dirty.click) {
      this.state.scores.click = this.getClickAdjustment();
      this.state.dirty.click = false;
    }

    const baseBreakdown = this.getBaseBreakdown();
    const baseConfidence = baseBreakdown.score;
    const totalAdjustment = this.state.scores.motion + this.state.scores.typing + this.state.scores.scroll + this.state.scores.click;
    const calculatedConfidence = clamp(baseConfidence + totalAdjustment, 1, baseConfidence);
    const confidence = this.debugOverride.enabled ? this.debugOverride.value : calculatedConfidence;
    const isRobot = confidence < 50;

    return {
      box: this.getBoxLayout(viewport.width, viewport.height),
      visible: this.state.visible,
      baseConfidence,
      baseBreakdown,
      scores: { ...this.state.scores },
      totalAdjustment,
      confidence,
      isRobot,
      label: isRobot ? `Robot: ${100 - confidence}%` : `Human: ${confidence}%`,
      debugOverride: { ...this.debugOverride },
      unlockedAchievements: this.unlockAchievements({ confidence, isRobot }),
    };
  }

  getBoxLayout(width, height) {
    const halfWidth = BOX_WIDTH / 2;
    const halfHeight = BOX_HEIGHT / 2;
    const left = Math.max(0, this.state.targetX - halfWidth);
    const right = Math.min(width, this.state.targetX + halfWidth);
    const top = Math.max(0, this.state.targetY - halfHeight);
    const bottom = Math.min(height, this.state.targetY + halfHeight);
    const boxWidth = Math.max(0, right - left);
    const boxHeight = Math.max(0, bottom - top);

    this.state.x = left + boxWidth / 2;
    this.state.y = top + boxHeight / 2;

    return {
      x: this.state.x,
      y: this.state.y,
      width: boxWidth,
      height: boxHeight,
      left,
      isLeftEdge: left <= 0,
    };
  }

  unlockAchievements({ confidence, isRobot }) {
    if (!isRobot) return [];

    const unlocked = [];
    for (const rule of this.achievementRules) {
      if (confidence > rule.maxConfidence || this.state.unlockedAchievements.has(rule.key)) continue;
      this.state.unlockedAchievements.add(rule.key);
      unlocked.push(rule);
    }

    return unlocked;
  }

  getBaseBreakdown() {
    const ua = navigator.userAgent;
    const details = [];
    let score = 78;

    if (/headless|phantom|selenium|puppeteer|playwright/i.test(ua)) {
      score -= 40;
      details.push("ua:-40");
    }

    if (navigator.webdriver) {
      score -= 35;
      details.push("webdriver:-35");
    } else {
      score += 10;
      details.push("webdriver:+10");
    }

    if ((navigator.plugins?.length ?? 0) > 0) {
      score += 4;
      details.push("plugins:+4");
    }

    if ((navigator.languages?.length ?? 0) > 0) {
      score += 4;
      details.push("languages:+4");
    }

    if ((navigator.hardwareConcurrency ?? 0) >= 4) {
      score += 2;
      details.push("multi-core:+2");
    }

    if ((navigator.deviceMemory ?? 0) >= 4) {
      score += 2;
      details.push("memory:+2");
    }

    if (navigator.maxTouchPoints > 0) {
      score += 1;
      details.push("touch:+1");
    }

    return { score: clamp(Math.round(score), 1, 99), details };
  }

  getMouseAdjustment() {
    const now = performance.now();
    const trail = this.state.trail.filter((point) => now - point.t <= MOTION_WINDOW_MS);
    if (trail.length < 2) return 0;

    const segmentSpeeds = [];
    let path = 0;
    let turning = 0;
    let previousAngle = null;

    for (let index = 1; index < trail.length; index += 1) {
      const previous = trail[index - 1];
      const current = trail[index];
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const distance = Math.hypot(dx, dy);
      const deltaTime = Math.max(current.t - previous.t, 1);
      const speed = distance / deltaTime;

      path += distance;
      segmentSpeeds.push(speed);

      if (distance > 0) {
        const angle = Math.atan2(dy, dx);
        if (previousAngle !== null) {
          let delta = Math.abs(angle - previousAngle);
          delta = Math.min(delta, Math.PI * 2 - delta);
          turning += delta;
        }
        previousAngle = angle;
      }
    }

    const first = trail[0];
    const last = trail[trail.length - 1];
    const displacement = Math.hypot(last.x - first.x, last.y - first.y);
    const straightness = path > 0 ? clamp(displacement / path, 0, 1) : 0;
    const velocityMean = average(segmentSpeeds);
    const velocityDeviation = standardDeviation(segmentSpeeds);
    const velocityVariance = velocityMean > 0 ? clamp(velocityDeviation / velocityMean, 0, 1) : 0;
    const curvature = trail.length > 2 ? clamp(turning / ((trail.length - 2) * Math.PI), 0, 1) : 0;
    const jerk = segmentSpeeds.length > 2 ? clamp(average(segmentSpeeds.slice(1).map((speed, index) => Math.abs(speed - segmentSpeeds[index]))) / 0.9, 0, 1) : 0;
    const teleport = segmentSpeeds.some((speed) => speed > 1.8);
    const straightBotness = clamp((straightness - 0.85) / 0.15, 0, 1);
    const speedBotness = clamp((0.28 - velocityVariance) / 0.28, 0, 1);
    const jerkBotness = clamp((0.18 - jerk) / 0.18, 0, 1);
    const curveHumanity = clamp((curvature - 0.08) / 0.28, 0, 1);
    const botness = clamp(straightBotness * 0.4 + speedBotness * 0.3 + jerkBotness * 0.2 - curveHumanity * 0.1, 0, 1);

    let adjustment = Math.round((1 - botness) * 14 - botness * 30);
    if (teleport) adjustment -= 12;
    if (straightness > 0.92 && velocityVariance < 0.18 && trail.length > 6) adjustment -= 8;
    return clamp(adjustment, -40, 14);
  }

  getTypingAdjustment() {
    const keydowns = this.state.keydowns.slice(-TYPE_SAMPLE_LIMIT);
    const holds = this.state.keyHolds.slice(-TYPE_SAMPLE_LIMIT);
    if (keydowns.length < 3) return 0;

    const intervals = [];
    for (let index = 1; index < keydowns.length; index += 1) {
      intervals.push(keydowns[index].t - keydowns[index - 1].t);
    }

    const holdDurations = holds.map((entry) => entry.duration);
    const holdMean = average(holdDurations);
    const holdVariation = holdMean > 0 ? standardDeviation(holdDurations) / holdMean : 0;
    const pauses = intervals.filter((interval) => interval > 500).length;
    const backspaces = keydowns.filter((entry) => entry.key === "Backspace").length;
    const organicHolds = clamp((holdVariation - 0.08) / 0.2, 0, 1);

    const bins = new Map();
    for (const interval of intervals) {
      const binIndex = Math.min(Math.floor(interval / 25), 20);
      bins.set(binIndex, (bins.get(binIndex) ?? 0) + 1);
    }

    const binCounts = Array.from(bins.values()).sort((a, b) => b - a);
    const dominantShare = binCounts[0] / intervals.length;
    const topTwoShare = ((binCounts[0] ?? 0) + (binCounts[1] ?? 0)) / intervals.length;
    const occupiedBins = bins.size;
    const spreadSpan = Math.max(...bins.keys()) - Math.min(...bins.keys()) + 1;
    const histogramConcentration = clamp((dominantShare - 0.28) / 0.32, 0, 1);
    const pairedConcentration = clamp((topTwoShare - 0.5) / 0.3, 0, 1);
    const histogramSpread = clamp((occupiedBins - 2) / 5, 0, 1);
    const spanSpread = clamp((spreadSpan - 2) / 6, 0, 1);

    let adjustment = 0;
    adjustment += Math.round(histogramSpread * 16);
    adjustment += Math.round(spanSpread * 6);
    adjustment += Math.round(organicHolds * 8);
    adjustment += Math.min(pauses * 3, 9);
    if (backspaces > 0) adjustment += Math.min(backspaces * 3, 9);
    adjustment -= Math.round(histogramConcentration * 30);
    adjustment -= Math.round(pairedConcentration * 14);
    adjustment -= Math.round(clamp((0.12 - holdVariation) / 0.12, 0, 1) * 12);
    if (intervals.length >= 5 && dominantShare > 0.5) adjustment -= 12;
    if (intervals.length >= 6 && dominantShare > 0.65) adjustment -= 10;
    if (dominantShare < 0.4 && occupiedBins >= 4) adjustment += 4;
    if (topTwoShare < 0.65 && spreadSpan >= 5) adjustment += 4;
    if (holdVariation > 0.1 && keydowns.length >= 5) adjustment += 4;
    return clamp(adjustment, -45, 28);
  }

  getScrollAdjustment() {
    const now = performance.now();
    const scrolls = this.state.scrolls.filter((entry) => now - entry.t <= SCROLL_WINDOW_MS);
    if (scrolls.length < 3) return 0;

    const deltas = scrolls.map((entry) => Math.abs(entry.deltaY));
    const intervals = [];
    let directionChanges = 0;

    for (let index = 1; index < scrolls.length; index += 1) {
      intervals.push(scrolls[index].t - scrolls[index - 1].t);
      const previousDirection = Math.sign(scrolls[index - 1].deltaY);
      const currentDirection = Math.sign(scrolls[index].deltaY);
      if (previousDirection !== 0 && currentDirection !== 0 && previousDirection !== currentDirection) {
        directionChanges += 1;
      }
    }

    const deltaMean = average(deltas);
    const intervalMean = average(intervals);
    const deltaVariation = deltaMean > 0 ? standardDeviation(deltas) / deltaMean : 0;
    const intervalVariation = intervalMean > 0 ? standardDeviation(intervals) / intervalMean : 0;
    const constantScroll = directionChanges === 0 && deltaVariation < 0.25 && intervalVariation < 0.25;

    let adjustment = 0;
    adjustment += directionChanges * 4;
    adjustment += Math.round(clamp(deltaVariation, 0, 1) * 8);
    adjustment += Math.round(clamp(intervalVariation, 0, 1) * 8);
    if (constantScroll) adjustment -= 18;
    if (deltas.some((delta) => delta > 600)) adjustment -= 6;
    return clamp(adjustment, -30, 14);
  }

  getClickAdjustment() {
    const clicks = this.state.clicks.slice(-CLICK_SAMPLE_LIMIT);
    if (clicks.length < 3) return 0;

    const intervals = [];
    for (let index = 1; index < clicks.length; index += 1) {
      intervals.push(clicks[index].t - clicks[index - 1].t);
    }

    const delays = clicks.map((entry) => entry.hoverDelay);
    const distances = clicks.map((entry) => entry.hoverDistance);
    const intervalMean = average(intervals);
    const intervalVariation = intervalMean > 0 ? standardDeviation(intervals) / intervalMean : 0;
    const delayMean = average(delays);
    const delayVariation = delayMean > 0 ? standardDeviation(delays) / delayMean : 0;
    const distanceMean = average(distances);
    const organicCadence = clamp((intervalVariation - 0.1) / 0.18, 0, 1);
    const organicDelay = clamp((delayVariation - 0.08) / 0.16, 0, 1);
    const organicDistance = clamp((distanceMean - 10) / 35, 0, 1);
    const fixedCadence = clamp((0.12 - intervalVariation) / 0.12, 0, 1);
    const fixedDelay = clamp((0.12 - delayVariation) / 0.12, 0, 1);

    let adjustment = 0;
    adjustment += Math.round(organicCadence * 18);
    adjustment += Math.round(organicDelay * 10);
    adjustment += Math.round(organicDistance * 6);
    adjustment += Math.round(clamp((delayMean - 90) / 60, 0, 4) * 2);
    adjustment += Math.round(clamp((distanceMean - 8) / 30, 0, 3) * 2);
    adjustment -= Math.round(fixedCadence * 34);
    adjustment -= Math.round(fixedDelay * 12);
    if (intervals.length >= 5 && intervalVariation < 0.06) adjustment -= 18;
    if (delayMean < 90 && delayVariation < 0.08 && clicks.length >= 5) adjustment -= 8;
    if (organicCadence > 0.4 && organicDelay > 0.25 && clicks.length >= 4) adjustment += 6;
    if (organicCadence > 0.55 && delayVariation > 0.12 && clicks.length >= 4) adjustment += 4;
    if (organicDistance > 0.4 && clicks.length >= 4) adjustment += 2;
    if (delayMean > 240) adjustment += 5;
    return clamp(adjustment, -45, 24);
  }
}
