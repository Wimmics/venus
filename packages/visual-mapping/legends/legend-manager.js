import { createLegends } from './legend-factory'

/**
 * Manages legend rendering and positioning for visualizations.
 * 
 * LegendManager handles creating, positioning, and destroying legends based on visual
 * artifact specifications. Legends are rendered as custom web components and positioned
 * relative to the visualization container (top, bottom, left, right).
 * 
 * @example
 * const legendMgr = new LegendManager({ container: chartElement });
 * 
 * // After visualization data is transformed and compiled
 * legendMgr.createLegends({
 *   data: rowData,
 *   visualArtifacts: artifacts
 * });
 * 
 * // Later, update legends
 * legendMgr.destroyLegends();
 * legendMgr.createLegends({ data: newData, visualArtifacts: newArtifacts });
 */
export class LegendManager {
    /**
     * Creates a new LegendManager.
     * 
     * @param {Object} options - Configuration object.
     * @param {HTMLElement} options.container - The container element where legends will be appended.
     *   Should be the root container of the visualization (web component or div).
     */
    constructor({ container }) {
        this._legends = [] // Rendered legends

        this.chartContainer = container // web component to which the legends are attached
    }

    /**
     * Creates and renders legends based on visual artifacts.
     * 
     * Generates legend DOM elements for each legend specified in visual artifacts,
     * positions them relative to the container, and applies styling. Legends listen
     * for toggle events to trigger re-layout.
     * 
     * @param {Object} options - Configuration for legend creation.
     * @param {Array} options.data - The visualization data (used for legend item values).
     * @param {Object} options.visualArtifacts - Visual artifacts with legend configurations.
     *   @param {Array} options.visualArtifacts.legends - List of legend configurations.
     *   @param {Map} options.visualArtifacts.scales - Map of scale functions indexed by ID.
     * 
     * @example
     * legendMgr.createLegends({
     *   data: transformedData,
     *   visualArtifacts: {
     *     legends: [
     *       { id: 'color-legend', field: 'type', scale: 'colorScale', position: 'bottom' }
     *     ],
     *     scales: new Map([['colorScale', scaleFunction]])
     *   }
     * });
     */
    createLegends({ data = [], visualArtifacts = {} }) {
        this.destroyLegends() // reset rendered legends

        const legendConfig = {
            legendItems: visualArtifacts?.legends || [],
            datasets: data,
            getScaleById: (scaleId) => visualArtifacts?.scales?.get(scaleId) || null
        };
        
        const newLegends = createLegends(legendConfig);
        
        const relayoutLegends = () => {
            const topInset = this._getLegendTopInset();
            this._positionLegends({ topInset })
            this._applyLegendSurfaceInsets();
        };
        
        newLegends.forEach((legend) => {
            legend.addEventListener("legendtoggle", () => {
                requestAnimationFrame(() => relayoutLegends());
            });
            this.chartContainer.appendChild(legend);
            
            legend.render()
            
            this._legends.push(legend);
        });
        
        relayoutLegends();
        // Custom elements can finalize internal layout one frame later.
        // Run a deferred pass so bottom legends are centered side by side at first paint.
        requestAnimationFrame(() => relayoutLegends());

    }

    /**
     * Destroys all rendered legends and removes them from the DOM.
     * 
     * Call this before creating new legends to ensure clean state, or when the
     * visualization is being destroyed.
     * 
     * @example
     * legendMgr.destroyLegends(); // All legend elements removed
     */
    destroyLegends() {
        this._legends.forEach((legend) => legend.remove());
        this._legends = [];
    }

    // Private helpers   
    
    _positionLegends(options = {}) {
        const {
            position = 'bottom',
            spacing = 20,
            gap = 20,
            stackGap = 12,
            topInset = 0
        } = options;
        
        const groups = new Map();
        this._legends.forEach((legend) => {
            const legendPosition = legend?._encoding?.legend?.position || position;
            if (!groups.has(legendPosition)) groups.set(legendPosition, []);
            groups.get(legendPosition).push(legend);
        });
        
        const getLegendSize = (legend) => {
            const rect = legend.getBoundingClientRect();
            return {
                width: rect.width || 220,
                height: rect.height || 120
            };
        };
        
        const applyStyle = (legend, cssText) => {
            legend.style.cssText = `
                position: absolute;
                width: max-content;
                z-index: 10;
                ${cssText}
            `;
        };
        
        groups.forEach((groupLegends, legendPosition) => {
            if (legendPosition === 'top' || legendPosition === 'bottom') {
                // Top/bottom are centered and laid out horizontally.
                const widths = groupLegends.map((legend) => getLegendSize(legend).width);
                const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, groupLegends.length - 1) * gap;
                const containerWidth = this.chartContainer?.getBoundingClientRect?.().width || 0;
                const availableWidth = Math.max(0, containerWidth - spacing * 2);
                const useEvenLayout = availableWidth > 0 && totalWidth > availableWidth && groupLegends.length > 1;
                let cursor = useEvenLayout ? -availableWidth / 2 : -totalWidth / 2;
                
                groupLegends.forEach((legend, index) => {
                    const centerOffset = useEvenLayout
                    ? (-availableWidth / 2 + (index + 0.5) * (availableWidth / groupLegends.length))
                    : (cursor + widths[index] / 2);
                    if (legendPosition === 'top') {
                        applyStyle(
                            legend,
                            `top: ${spacing + topInset}px; left: calc(50% + ${centerOffset}px); transform: translateX(-50%);`
                        );
                    } else {
                        applyStyle(legend, `bottom: ${spacing}px; left: calc(50% + ${centerOffset}px); transform: translateX(-50%);`);
                    }
                    if (!useEvenLayout) {
                        cursor += widths[index] + gap;
                    }
                });
                return;
            }
            
            const heights = groupLegends.map((legend) => getLegendSize(legend).height);
            
            if (legendPosition === 'left' || legendPosition === 'right') {
                // Left/right are centered vertically and stacked.
                const totalHeight = heights.reduce((sum, height) => sum + height, 0) + Math.max(0, groupLegends.length - 1) * stackGap;
                let cursor = -totalHeight / 2;
                
                groupLegends.forEach((legend, index) => {
                    const centerOffset = cursor + heights[index] / 2;
                    if (legendPosition === 'left') {
                        applyStyle(legend, `left: ${spacing}px; top: calc(50% + ${centerOffset}px); transform: translateY(-50%);`);
                    } else {
                        applyStyle(legend, `right: ${spacing}px; top: calc(50% + ${centerOffset}px); transform: translateY(-50%);`);
                    }
                    cursor += heights[index] + stackGap;
                });
                return;
            }
            
            // Corners are stacked vertically.
            let offset = 0;
            groupLegends.forEach((legend, index) => {
                const height = heights[index];
                switch (legendPosition) {
                    case 'top-left':
                    applyStyle(legend, `top: ${spacing + topInset + offset}px; left: ${spacing}px;`);
                    break;
                    case 'top-right':
                    applyStyle(legend, `top: ${spacing + topInset + offset}px; right: ${spacing}px;`);
                    break;
                    case 'bottom-left':
                    applyStyle(legend, `bottom: ${spacing + offset}px; left: ${spacing}px;`);
                    break;
                    case 'bottom-right':
                    applyStyle(legend, `bottom: ${spacing + offset}px; right: ${spacing}px;`);
                    break;
                    default:
                    applyStyle(legend, `bottom: ${spacing + offset}px; left: ${spacing}px;`);
                    break;
                }
                offset += height + stackGap;
            });
        });
    }
    
    _getLegendTopInset() {
        const titleElement = this.chartContainer?.querySelector(".vis-title");
        if (!titleElement || titleElement.style.display === "none") return 0;
        return Math.max(0, Math.round(titleElement.getBoundingClientRect().height));
    }
    
    _applyLegendSurfaceInsets() {
        const surface = this.chartContainer?.querySelector(".vis-surface");
        if (!surface) return;
        
        const reservingLegends = this._legends.filter((legend) => legend?._legendCompact === false);
        if (!reservingLegends.length) {
            surface.style.paddingTop = "0px";
            surface.style.paddingRight = "0px";
            surface.style.paddingBottom = "0px";
            surface.style.paddingLeft = "0px";
            return;
        }
        
        const surfaceRect = surface.getBoundingClientRect();
        const inset = { top: 0, right: 0, bottom: 0, left: 0 };
        const reserveGap = 8;
        
        reservingLegends.forEach((legend) => {
            const rect = legend.getBoundingClientRect();
            const position = legend?._legendPosition || "bottom";
            
            if (position === "top" || position === "top-left" || position === "top-right") {
                inset.top = Math.max(inset.top, Math.round(rect.bottom - surfaceRect.top + reserveGap));
            }
            if (position === "bottom" || position === "bottom-left" || position === "bottom-right") {
                inset.bottom = Math.max(inset.bottom, Math.round(surfaceRect.bottom - rect.top + reserveGap));
            }
            if (position === "left" || position === "top-left" || position === "bottom-left") {
                inset.left = Math.max(inset.left, Math.round(rect.right - surfaceRect.left + reserveGap));
            }
            if (position === "right" || position === "top-right" || position === "bottom-right") {
                inset.right = Math.max(inset.right, Math.round(surfaceRect.right - rect.left + reserveGap));
            }
        });
        
        const maxHorizontal = Math.max(0, Math.floor(surfaceRect.width / 2) - 1);
        const maxVertical = Math.max(0, Math.floor(surfaceRect.height / 2) - 1);
        surface.style.paddingTop = `${Math.max(0, Math.min(inset.top, maxVertical))}px`;
        surface.style.paddingRight = `${Math.max(0, Math.min(inset.right, maxHorizontal))}px`;
        surface.style.paddingBottom = `${Math.max(0, Math.min(inset.bottom, maxVertical))}px`;
        surface.style.paddingLeft = `${Math.max(0, Math.min(inset.left, maxHorizontal))}px`;
    }
}