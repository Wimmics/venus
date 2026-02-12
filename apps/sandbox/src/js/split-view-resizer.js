const DEFAULT_RATIO = 0.35;
const MIN_PANE_WIDTH = 280;

export class SplitViewResizer {
  constructor({ containerEl, leftPaneEl, rightPaneEl, splitterEl }) {
    this.containerEl = containerEl;
    this.leftPaneEl = leftPaneEl;
    this.rightPaneEl = rightPaneEl;
    this.splitterEl = splitterEl;

    this.ratio = DEFAULT_RATIO;
    this.dragging = false;
    this.rafHandle = null;
    this.pendingClientX = null;
  }

  init() {
    if (!this.containerEl || !this.leftPaneEl || !this.rightPaneEl || !this.splitterEl) return;
    this.applyRatio(this.ratio);
    this.bindEvents();
  }

  bindEvents() {
    this.handlePointerDown = this.onPointerDown.bind(this);
    this.handlePointerMove = this.onPointerMove.bind(this);
    this.handlePointerUp = this.onPointerUp.bind(this);
    this.handleResize = this.onWindowResize.bind(this);
    this.handleKeydown = this.onKeydown.bind(this);

    this.splitterEl.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("resize", this.handleResize);
    this.splitterEl.addEventListener("keydown", this.handleKeydown);
  }

  onPointerDown(event) {
    if (this.isCompactLayout()) return;
    event.preventDefault();
    this.dragging = true;
    this.splitterEl.classList.add("is-dragging");
    this.splitterEl.setPointerCapture(event.pointerId);
  }

  onPointerMove(event) {
    if (!this.dragging) return;
    this.pendingClientX = event.clientX;
    if (this.rafHandle) return;

    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      if (this.pendingClientX == null) return;
      this.updateFromClientX(this.pendingClientX);
    });
  }

  onPointerUp(event) {
    if (!this.dragging) return;
    this.dragging = false;
    this.splitterEl.classList.remove("is-dragging");
    if (this.splitterEl.hasPointerCapture(event.pointerId)) {
      this.splitterEl.releasePointerCapture(event.pointerId);
    }
  }

  onWindowResize() {
    if (this.isCompactLayout()) {
      this.leftPaneEl.style.flexBasis = "auto";
      return;
    }
    this.applyRatio(this.ratio);
  }

  onKeydown(event) {
    if (this.isCompactLayout()) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -0.02 : 0.02;
    this.applyRatio(this.ratio + delta);
  }

  updateFromClientX(clientX) {
    const rect = this.containerEl.getBoundingClientRect();
    if (!rect.width) return;
    const relativeX = clientX - rect.left;
    const splitterWidth = this.splitterEl.getBoundingClientRect().width;

    const minRatio = MIN_PANE_WIDTH / rect.width;
    const maxRatio = (rect.width - MIN_PANE_WIDTH - splitterWidth) / rect.width;
    const nextRatio = relativeX / rect.width;
    const clamped = Math.max(minRatio, Math.min(maxRatio, nextRatio));
    this.applyRatio(clamped);
  }

  applyRatio(nextRatio) {
    if (this.isCompactLayout()) {
      this.leftPaneEl.style.flexBasis = "auto";
      return;
    }

    const rect = this.containerEl.getBoundingClientRect();
    const splitterWidth = this.splitterEl.getBoundingClientRect().width || 10;
    if (!rect.width) return;

    const minRatio = MIN_PANE_WIDTH / rect.width;
    const maxRatio = (rect.width - MIN_PANE_WIDTH - splitterWidth) / rect.width;
    this.ratio = Math.max(minRatio, Math.min(maxRatio, nextRatio));

    this.leftPaneEl.style.flexBasis = `${(this.ratio * 100).toFixed(2)}%`;
  }

  isCompactLayout() {
    return window.matchMedia("(max-width: 1100px)").matches;
  }
}
