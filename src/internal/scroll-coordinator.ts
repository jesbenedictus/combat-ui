export interface ScrollStageState {
  focus: number;
  offset: number;
  active: boolean;
}

export interface ScrollStageOptions {
  focusBias: number;
  hold: number;
  threshold: number;
}

export interface ScrollStageHandle {
  element: HTMLElement;
  options: ScrollStageOptions;
  tone: string | null;
  toneTarget: Element | null;
  onUpdate(state: ScrollStageState): void;
}

export interface ParallaxOptions {
  speed: number;
  axis: "x" | "y";
  scale: number;
}

export interface ParallaxHandle {
  element: HTMLElement;
  target: HTMLElement;
  options: ParallaxOptions;
}

export interface ParallaxRegistration {
  unregister(): void;
}

const FLAT_STATE: ScrollStageState = { focus: 1, offset: 0, active: true };
const TONE_SET_FOCUS = 0.25;
const TONE_CLEAR_FOCUS = 0.1;

class ScrollCoordinator {
  private readonly stages = new Set<ScrollStageHandle>();
  private readonly parallaxes = new Set<ParallaxHandle>();
  private readonly visibleStages = new Set<ScrollStageHandle>();
  private readonly visibleParallaxes = new Set<ParallaxHandle>();
  private readonly stageIndex = new WeakMap<HTMLElement, ScrollStageHandle>();
  private readonly parallaxIndex = new WeakMap<HTMLElement, ParallaxHandle>();
  private readonly observer: IntersectionObserver | null;
  private rafId: number | null = null;
  private dirty = true;
  private reduceMotion = false;
  private readonly activeTones = new Map<Element, string>();

  constructor() {
    if (typeof window === "undefined") {
      this.observer = null;
      return;
    }

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reduceMotion = mql.matches;
    mql.addEventListener("change", (event) => {
      this.reduceMotion = event.matches;
      this.dirty = true;
      this.requestTick();
    });

    this.observer = new IntersectionObserver(this.handleIntersections, {
      rootMargin: "25% 0px 25% 0px",
      threshold: [0, 0.001, 0.999],
    });

    window.addEventListener("scroll", this.markDirty, { passive: true });
    window.addEventListener("resize", this.markDirty);
  }

  registerStage(handle: ScrollStageHandle): void {
    this.stages.add(handle);
    this.stageIndex.set(handle.element, handle);
    this.observer?.observe(handle.element);

    if (typeof window !== "undefined") {
      const initial = this.reduceMotion
        ? FLAT_STATE
        : this.computeStageState(handle, window.innerHeight);
      handle.onUpdate(initial);
    }

    this.requestTick();
  }

  unregisterStage(handle: ScrollStageHandle): void {
    this.stages.delete(handle);
    this.visibleStages.delete(handle);
    this.observer?.unobserve(handle.element);
    if (
      handle.tone !== null &&
      handle.toneTarget !== null &&
      this.activeTones.has(handle.toneTarget)
    ) {
      this.recomputeTones();
    }
  }

  registerParallax(handle: ParallaxHandle): void {
    this.parallaxes.add(handle);
    this.parallaxIndex.set(handle.element, handle);
    this.observer?.observe(handle.element);
    this.requestTick(true);
  }

  unregisterParallax(handle: ParallaxHandle): void {
    this.parallaxes.delete(handle);
    this.visibleParallaxes.delete(handle);
    this.observer?.unobserve(handle.element);
    handle.target.style.removeProperty("transform");
  }

  requestTick(force = false): void {
    if (force) {
      this.dirty = true;
    }
    if (this.rafId !== null) {
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  }

  private readonly handleIntersections = (
    entries: IntersectionObserverEntry[],
  ): void => {
    for (const entry of entries) {
      const stage = this.stageIndex.get(entry.target as HTMLElement);
      if (stage != undefined) {
        if (entry.isIntersecting) {
          this.visibleStages.add(stage);
        } else {
          this.visibleStages.delete(stage);
          stage.onUpdate({ focus: 0, offset: 0, active: false });
        }
        continue;
      }

      const parallax = this.parallaxIndex.get(entry.target as HTMLElement);
      if (parallax != undefined) {
        if (entry.isIntersecting) {
          this.visibleParallaxes.add(parallax);
        } else {
          this.visibleParallaxes.delete(parallax);
        }
      }
    }

    this.requestTick(true);
  };

  private readonly markDirty = (): void => {
    this.requestTick(true);
  };

  private readonly tick = (): void => {
    this.rafId = null;
    if (!this.dirty) return;
    this.dirty = false;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const bestPerTarget = new Map<Element, { tone: string; focus: number }>();

    for (const handle of this.visibleStages) {
      const state = this.reduceMotion
        ? FLAT_STATE
        : this.computeStageState(handle, viewportHeight);
      handle.onUpdate(state);

      if (handle.tone === null || handle.toneTarget === null) continue;
      const current = bestPerTarget.get(handle.toneTarget);
      if (current === undefined || state.focus > current.focus) {
        bestPerTarget.set(handle.toneTarget, {
          tone: handle.tone,
          focus: state.focus,
        });
      }
    }

    for (const [target, { tone, focus }] of bestPerTarget) {
      if (focus >= TONE_SET_FOCUS && this.activeTones.get(target) !== tone) {
        this.setActiveTone(target, tone);
      } else if (focus < TONE_CLEAR_FOCUS && this.activeTones.has(target)) {
        this.setActiveTone(target, null);
      }
    }

    for (const target of this.activeTones.keys()) {
      if (!bestPerTarget.has(target)) {
        this.setActiveTone(target, null);
      }
    }

    for (const handle of this.visibleParallaxes) {
      if (this.reduceMotion) {
        handle.target.style.transform = "";
        continue;
      }

      const rect = handle.element.getBoundingClientRect();
      const { speed, axis, scale } = handle.options;
      const centerOffset =
        axis === "y"
          ? rect.top + rect.height / 2 - viewportHeight / 2
          : rect.left + rect.width / 2 - viewportWidth / 2;
      const translate = centerOffset * speed * -0.18;
      const t =
        axis === "y"
          ? `translateY(${translate.toFixed(2)}px)`
          : `translateX(${translate.toFixed(2)}px)`;
      handle.target.style.transform = `${t} scale(${scale})`;
    }
  };

  private computeStageState(
    handle: ScrollStageHandle,
    viewportHeight: number,
  ): ScrollStageState {
    const rect = handle.element.getBoundingClientRect();
    const { focusBias, hold, threshold } = handle.options;
    const center = rect.top + rect.height / 2 - viewportHeight / 2;
    const rawOffset = center / viewportHeight - focusBias;
    const heldOffset =
      Math.abs(rawOffset) < hold
        ? 0
        : Math.sign(rawOffset) * ((Math.abs(rawOffset) - hold) / (1 - hold));
    const offset = Math.max(-1.15, Math.min(1.15, heldOffset));
    const focus =  Math.max(0, 1 - Math.abs(offset));

    return { focus, offset, active: focus > threshold };
  }

  private recomputeTones(): void {
    const bestPerTarget = new Map<Element, { tone: string; focus: number }>();
    for (const handle of this.visibleStages) {
      if (handle.tone === null || handle.toneTarget === null) continue;
      const state = this.computeStageState(handle, window.innerHeight);
      const current = bestPerTarget.get(handle.toneTarget);
      if (current === undefined || state.focus > current.focus) {
        bestPerTarget.set(handle.toneTarget, {
          tone: handle.tone,
          focus: state.focus,
        });
      }
    }

    for (const target of this.activeTones.keys()) {
      if (!bestPerTarget.has(target)) {
        this.setActiveTone(target, null);
      }
    }
    for (const [target, { tone, focus }] of bestPerTarget) {
      if (focus >= TONE_SET_FOCUS) {
        if (this.activeTones.get(target) !== tone) {
          this.setActiveTone(target, tone);
        }
      } else if (this.activeTones.has(target)) {
        this.setActiveTone(target, null);
      }
    }
  }

  private setActiveTone(target: Element, tone: string | null): void {
    if (tone === null) {
      if (!this.activeTones.has(target)) return;
      this.activeTones.delete(target);
      target.removeAttribute("data-cui-tone");
    } else {
      if (this.activeTones.get(target) === tone) return;
      this.activeTones.set(target, tone);
      target.setAttribute("data-cui-tone", tone);
    }
  }
}

let instance: ScrollCoordinator | null = null;

export function getScrollCoordinator(): ScrollCoordinator {
  if (instance === null) {
    instance = new ScrollCoordinator();
  }
  return instance;
}

export function attachCuiParallax(root: ParentNode): ParallaxRegistration {
  const coordinator = getScrollCoordinator();
  const handles: ParallaxHandle[] = [];
  const elements = root.querySelectorAll<HTMLElement>("[data-cui-parallax]");

  elements.forEach((element) => {
    const speedRaw = element.dataset["cuiParallax"];
    const speed = speedRaw === undefined || speedRaw === "" ? 0.12 : Number(speedRaw);
    if (Number.isNaN(speed)) return;

    const axis = element.dataset["cuiParallaxAxis"] === "x" ? "x" : "y";
    const scaleRaw = Number(element.dataset["cuiParallaxScale"]);
    const scale = scaleRaw === undefined || Number.isNaN(scaleRaw) ? 1.08 : scaleRaw;

    const handle: ParallaxHandle = {
      element,
      target: element,
      options: { speed, axis, scale },
    };
    handles.push(handle);
    coordinator.registerParallax(handle);
  });

  return {
    unregister() {
      handles.forEach((handle) => coordinator.unregisterParallax(handle));
    },
  }
}