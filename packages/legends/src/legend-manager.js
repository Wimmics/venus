import { createLegends, positionLegends } from './legend-factory'

export class LegendManager {
    constructor({ container }) {
        this._legends = [] // Rendered legends

        this.chartContainer = container // web component to which the legends are attached
        console.log("chartContainer = ", this.chartContainer)
    }

    // Public methods
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
            positionLegends(this.chartContainer, this._legends, {
                position: "bottom",
                spacing: 20,
                gap: 20,
                stackGap: 12,
                topInset
            });
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

    destroyLegends() {
        this._legends.forEach((legend) => legend.remove());
        this._legends = [];
    }

    // Private helpers    
    
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