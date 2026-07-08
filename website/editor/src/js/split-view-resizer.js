const MIN_PANE_WIDTH = 180;
const ORDER = ["config", "result"];

export class SplitViewResizer {
	constructor({ containerEl, panes, splitters }) {
		this.containerEl = containerEl;
		this.panes = panes;
		this.splitters = splitters;
		
		this.visible = { config: true, result: true };
		this.weights = { config: 50, result: 50 };
		
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
		this.applyLayout();
		return true;
	}
	
	applyLayout() {
		if (this.isCompactLayout()) {
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
				continue;
			}
			
			const basis =
			visibleKeys.length === 1
			? Math.max(0, availablePaneWidth)
			: (this.weights[key] / totalWeight) * availablePaneWidth;
			pane.style.display = "flex";
			pane.style.flex = `0 0 ${basis.toFixed(2)}px`;
			pane.style.flexBasis = `${basis.toFixed(2)}px`;
		}
		this.refreshSplitterVisibility();
	}
	
	refreshSplitterVisibility() {
		const configVisible = this.visible.config;
		const resultVisible = this.visible.result;
		
		const splitterDataResult = this.splitters.dataResult;
		
		if (splitterDataResult) {
			const show = configVisible && resultVisible;
			splitterDataResult.style.display = show ? "block" : "none";
		}
	}
	
	getAvailablePaneWidth() {
		if (!this.containerEl) return 0;
		
		const containerWidth = this.containerEl.getBoundingClientRect().width;
		const gap = this.getContainerGap();
		const visiblePaneCount = this.getVisiblePaneKeys().length;
		const visibleSplitterCount = this.visible.config && this.visible.result ? 1 : 0
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
		return this.visible.config && this.visible.result ? this.getSplitterWidth(this.splitters.dataResult) : 0;
	}
	
	getSplitterWidth(splitterEl) {
		if (!splitterEl) return 0;
		const computed = window.getComputedStyle(splitterEl);
		const parsed = parseFloat(computed.width || "");
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
		return splitterEl.getBoundingClientRect().width || 0;
	}
	
	resolveDragPair(splitterKey) {
		
		if (splitterKey === "dataResult") {
			if (this.visible.config && this.visible.result) {
				return { left: "config", right: "result" };
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
