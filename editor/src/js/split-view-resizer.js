const MIN_PANE_WIDTH = 180;
const ORDER = ["config", "data", "result"];

export class SplitViewResizer {
  constructor({ containerEl, panes, splitters }) {
    this.containerEl = containerEl;
    this.panes = panes;
    this.splitters = splitters;

    this.visible = { config: true, data: true, result: true };
    this.weights = { config: 31, data: 29, result: 40 };
    this.compressed = { config: false, data: false, result: false };
    this.savedWeights = { config: 31, data: 29, result: 40 };

    this.activeDrag = null;
    this.rafHandle = null;
    this.pendingClientX = null;
  }

  init() {
    if (!this.containerEl) return;
    this.bindEvents();
    this.applyLayout();
  }

  bindEvents() {
    this.boundMove = this.onPointerMove.bind(this);
    this.boundUp = this.onPointerUp.bind(this);
    this.boundResize = this.applyLayout.bind(this);

    const splitterEntries = Object.entries(this.splitters || {});
    for (const [key, splitterEl] of splitterEntries) {
      if (!splitterEl) continue;
      splitterEl.addEventListener("pointerdown", (event) => this.onPointerDown(key, event));
    }

    window.addEventListener("pointermove", this.boundMove);
    window.addEventListener("pointerup", this.boundUp);
    window.addEventListener("resize", this.boundResize);
  }

  isCompactLayout() {
    return window.matchMedia("(max-width: 1100px)").matches;
  }

  isPaneVisible(key) {
    return Boolean(this.visible[key]);
  }

  getVisiblePaneKeys() {
    return ORDER.filter((key) => this.visible[key]);
  }

  togglePane(key) {
    if (!ORDER.includes(key)) return false;
    const currentlyVisible = this.getVisiblePaneKeys();
    if (this.visible[key] && currentlyVisible.length <= 1) return false;
    this.visible[key] = !this.visible[key];
    if (!this.visible[key]) {
      this.compressed[key] = false;
    }
    this.applyLayout();
    return true;
  }

  toggleCompressPane(key) {
    if (!ORDER.includes(key) || !this.visible[key]) return false;
    const next = !this.compressed[key];
    this.setPaneCompressed(key, next);
    return true;
  }

  setPaneCompressed(key, compressed) {
    if (!ORDER.includes(key) || !this.visible[key]) return;

    if (compressed) {
      this.savedWeights[key] = this.weights[key];
      this.weights[key] = 1.4;
      this.compressed[key] = true;
    } else {
      this.weights[key] = Math.max(8, this.savedWeights[key] || 20);
      this.compressed[key] = false;
    }

    this.applyLayout();
  }

  isPaneCompressed(key) {
    return Boolean(this.compressed[key]);
  }

  applyLayout() {
    if (this.isCompactLayout()) {
      this.containerEl?.classList.remove("data-compressed");
      for (const key of ORDER) {
        const pane = this.panes[key];
        if (!pane) continue;
        pane.style.display = this.visible[key] ? "flex" : "none";
        pane.style.flex = "1 1 auto";
        pane.style.flexBasis = "auto";
      }
      this.refreshSplitterVisibility();
      return;
    }

    const visibleKeys = this.getVisiblePaneKeys();
    const totalWeight = visibleKeys.reduce((sum, key) => sum + Math.max(0.0001, this.weights[key]), 0);
    const availablePaneWidth = this.getAvailablePaneWidth();

    for (const key of ORDER) {
      const pane = this.panes[key];
      if (!pane) continue;

      if (!this.visible[key]) {
        pane.style.display = "none";
        pane.style.flex = "0 0 0%";
        pane.style.flexBasis = "0%";
        pane.classList.remove("is-compressed");
        continue;
      }

      const basis =
        visibleKeys.length === 1
          ? Math.max(0, availablePaneWidth)
          : (this.weights[key] / totalWeight) * availablePaneWidth;
      pane.style.display = "flex";
      pane.style.flex = `0 0 ${basis.toFixed(2)}px`;
      pane.style.flexBasis = `${basis.toFixed(2)}px`;
      pane.classList.toggle("is-compressed", Boolean(this.compressed[key]));
    }

    this.containerEl?.classList.toggle("data-compressed", Boolean(this.compressed.data));
    this.refreshSplitterVisibility();
  }

  refreshSplitterVisibility() {
    const configVisible = this.visible.config;
    const dataVisible = this.visible.data;
    const resultVisible = this.visible.result;

    const splitterConfigData = this.splitters.configData;
    const splitterDataResult = this.splitters.dataResult;

    if (splitterConfigData) {
      const show = configVisible && dataVisible;
      splitterConfigData.style.display = show ? "block" : "none";
    }
    if (splitterDataResult) {
      const show = dataVisible && resultVisible;
      splitterDataResult.style.display = show ? "block" : "none";
    }
  }

  getAvailablePaneWidth() {
    if (!this.containerEl) return 0;

    const containerWidth = this.containerEl.getBoundingClientRect().width;
    const gap = this.getContainerGap();
    const visiblePaneCount = this.getVisiblePaneKeys().length;
    const visibleSplitterCount =
      (this.visible.config && this.visible.data ? 1 : 0) +
      (this.visible.data && this.visible.result ? 1 : 0);
    const renderedItems = visiblePaneCount + visibleSplitterCount;
    const totalGaps = gap * Math.max(0, renderedItems - 1);
    const totalSplitterWidth = this.getTotalVisibleSplitterWidth();
    return Math.max(0, containerWidth - totalSplitterWidth - totalGaps);
  }

  getContainerGap() {
    if (!this.containerEl) return 0;
    const computed = window.getComputedStyle(this.containerEl);
    const gapValue = computed.columnGap || computed.gap || "0";
    const parsed = parseFloat(gapValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  getTotalVisibleSplitterWidth() {
    const configDataWidth = this.visible.config && this.visible.data
      ? this.getSplitterWidth(this.splitters.configData)
      : 0;
    const dataResultWidth = this.visible.data && this.visible.result
      ? this.getSplitterWidth(this.splitters.dataResult)
      : 0;
    return configDataWidth + dataResultWidth;
  }

  getSplitterWidth(splitterEl) {
    if (!splitterEl) return 0;
    const computed = window.getComputedStyle(splitterEl);
    const parsed = parseFloat(computed.width || "");
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return splitterEl.getBoundingClientRect().width || 0;
  }

  resolveDragPair(splitterKey) {
    if (splitterKey === "configData") {
      if (!this.visible.config) return null;
      if (this.visible.data) return { left: "config", right: "data" };
      return null;
    }

    if (splitterKey === "dataResult") {
      if (this.visible.data && this.visible.result) {
        return { left: "data", right: "result" };
      }
      return null;
    }

    return null;
  }

  onPointerDown(splitterKey, event) {
    if (this.isCompactLayout()) return;

    const pair = this.resolveDragPair(splitterKey);
    if (!pair) return;

    const leftPane = this.panes[pair.left];
    const rightPane = this.panes[pair.right];
    if (!leftPane || !rightPane) return;

    event.preventDefault();
    const splitterEl = this.splitters[splitterKey];
    splitterEl.classList.add("is-dragging");
    splitterEl.setPointerCapture(event.pointerId);

    this.activeDrag = {
      splitterKey,
      pointerId: event.pointerId,
      leftKey: pair.left,
      rightKey: pair.right,
      startX: event.clientX,
      startLeftWidth: leftPane.getBoundingClientRect().width,
      startRightWidth: rightPane.getBoundingClientRect().width,
      startWidths: this.captureVisiblePaneWidths()
    };
    this.normalizeWeightsToWidths(this.activeDrag.startWidths);
  }

  onPointerMove(event) {
    if (!this.activeDrag) return;
    this.pendingClientX = event.clientX;
    if (this.rafHandle) return;

    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null;
      if (!this.activeDrag || this.pendingClientX == null) return;
      this.applyDrag(this.pendingClientX);
    });
  }

  onPointerUp(event) {
    if (!this.activeDrag) return;

    const splitterEl = this.splitters[this.activeDrag.splitterKey];
    splitterEl?.classList.remove("is-dragging");
    if (splitterEl?.hasPointerCapture(event.pointerId)) {
      splitterEl.releasePointerCapture(event.pointerId);
    }

    this.activeDrag = null;
    this.pendingClientX = null;
  }

  applyDrag(clientX) {
    const drag = this.activeDrag;
    if (!drag) return;

    const delta = clientX - drag.startX;
    const combined = drag.startLeftWidth + drag.startRightWidth;
    const leftCompressed = this.compressed[drag.leftKey];
    const rightCompressed = this.compressed[drag.rightKey];

    if (leftCompressed && rightCompressed) return;

    if (leftCompressed || rightCompressed) {
      const fixedKey = leftCompressed ? drag.leftKey : drag.rightKey;
      const variableKey = leftCompressed ? drag.rightKey : drag.leftKey;
      const variableIsLeft = variableKey === drag.leftKey;
      const direction = variableIsLeft ? 1 : -1;
      const otherKey = this.getVisiblePaneKeys().find(
        (key) => key !== drag.leftKey && key !== drag.rightKey
      );

      const startVariable = drag.startWidths[variableKey] || this.weights[variableKey];
      const startOther = otherKey ? drag.startWidths[otherKey] || this.weights[otherKey] : 0;
      const totalVariableAndOther = startVariable + startOther;

      const minVariable = this.getPaneMinWidth(variableKey);
      const minOther = otherKey ? this.getPaneMinWidth(otherKey) : 0;
      const maxVariable = Math.max(minVariable, totalVariableAndOther - minOther);
      const requestedVariable = startVariable + delta * direction;
      const nextVariable = Math.max(minVariable, Math.min(maxVariable, requestedVariable));

      this.weights[fixedKey] = drag.startWidths[fixedKey] || this.weights[fixedKey];
      this.weights[variableKey] = nextVariable;
      if (otherKey) {
        this.weights[otherKey] = Math.max(minOther, totalVariableAndOther - nextVariable);
      }

      this.applyLayout();
      return;
    }

    const minLeft = this.getPaneMinWidth(drag.leftKey);
    const minRight = this.getPaneMinWidth(drag.rightKey);
    const nextLeft = Math.max(minLeft, Math.min(combined - minRight, drag.startLeftWidth + delta));
    const nextRight = Math.max(minRight, combined - nextLeft);

    this.weights[drag.leftKey] = nextLeft;
    this.weights[drag.rightKey] = nextRight;
    this.applyLayout();
  }

  captureVisiblePaneWidths() {
    const out = {};
    for (const key of this.getVisiblePaneKeys()) {
      const pane = this.panes[key];
      if (!pane) continue;
      out[key] = pane.getBoundingClientRect().width;
    }
    return out;
  }

  normalizeWeightsToWidths(widths = {}) {
    for (const key of this.getVisiblePaneKeys()) {
      const width = widths[key];
      if (Number.isFinite(width) && width > 0) {
        this.weights[key] = width;
      }
    }
  }

  getPaneMinWidth(key) {
    const pane = this.panes[key];
    if (!pane) return MIN_PANE_WIDTH;
    const computed = window.getComputedStyle(pane);
    const parsed = parseFloat(computed.minWidth || "");
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return MIN_PANE_WIDTH;
  }
}
