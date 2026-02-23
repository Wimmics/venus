export class VisualizationView {
  constructor({ hostEl, metaPanelEl }) {
    this.hostEl = hostEl;
    this.metaPanelEl = metaPanelEl;
    this.activeComponentTag = null;
    this.activeComponentEl = null;
  }

  async exportAs(format, fileBaseName = "venus-visualization") {
    const normalizedFormat = String(format || "").toLowerCase();
    if (!["png", "jpg", "pdf", "svg"].includes(normalizedFormat)) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    if (normalizedFormat === "svg") {
      const svgText = this._buildSvgText();
      this._downloadBlob(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }), `${fileBaseName}.svg`);
      return;
    }

    const rasterMime = normalizedFormat === "jpg" ? "image/jpeg" : "image/png";
    const { blob, width, height, dataUrl } = await this._toRasterImage({
      mimeType: rasterMime,
      quality: normalizedFormat === "jpg" ? 0.92 : undefined
    });

    if (normalizedFormat === "pdf") {
      const jsPdfCtor = window?.jspdf?.jsPDF;
      if (!jsPdfCtor) {
        throw new Error("PDF export library not available.");
      }

      const orientation = width >= height ? "landscape" : "portrait";
      const pdf = new jsPdfCtor({
        orientation,
        unit: "pt",
        format: [width, height]
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save(`${fileBaseName}.pdf`);
      return;
    }

    const ext = normalizedFormat === "jpg" ? "jpg" : "png";
    this._downloadBlob(blob, `${fileBaseName}.${ext}`);
  }

  async render({ scenario, endpoint, queryText, encoding, dataSource = "query", sparqlResult = null }) {
    const tag = scenario?.component || "vis-graph";
    const component = await this._ensureComponent(tag);

    if (typeof component.launch !== "function") {
      const ctorName = component?.constructor?.name || "UnknownElement";
      throw new Error(
        `Component "${tag}" is not launchable (instance: ${ctorName}). Expected a VisBase descendant.`
      );
    }

    if (tag === "vis-graph" && this.metaPanelEl) {
      component.nodeDetailsPanel = this.metaPanelEl;
    }

    component.sparqlEndpoint = endpoint;
    component.sparqlQuery = dataSource === "query" ? queryText : null;
    component.sparqlResult = dataSource === "provided" ? sparqlResult : null;
    component.encoding = encoding;
    await component.launch();

    return { sparqlData: component.sparqlData || null };
  }

  refreshCurrent({ scenario }) {
    const tag = scenario?.component || "vis-graph";
    Promise.resolve(this._ensureComponent(tag)).then((component) => {
      component?.render?.();
    });
  }

  async _ensureComponent(tag) {
    await customElements.whenDefined(tag);
    const RegisteredCtor = customElements.get(tag);

    if (this.activeComponentEl && this.activeComponentTag === tag) {
      if (!RegisteredCtor || this.activeComponentEl instanceof RegisteredCtor) {
        return this.activeComponentEl;
      }
    }

    this.hostEl.innerHTML = "";
    const next = RegisteredCtor ? new RegisteredCtor() : document.createElement(tag);
    next.setAttribute("width", "100%");
    next.setAttribute("height", "100%");
    this.hostEl.appendChild(next);

    this.activeComponentEl = next;
    this.activeComponentTag = tag;
    return next;
  }

  _getGraphicSource() {
    if (!this.hostEl) return null;
    const fromActive = this._findGraphicInTree(this.activeComponentEl);
    if (fromActive) return fromActive;
    return this._findGraphicInTree(this.hostEl);
  }

  _findGraphicInTree(root) {
    if (!root) return null;

    const walk = (node) => {
      if (!node) return null;

      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName?.toLowerCase();
        if (tag === "svg" || tag === "canvas") return node;
      }

      if (node.shadowRoot) {
        const inShadow = walk(node.shadowRoot);
        if (inShadow) return inShadow;
      }

      const children = node.children || node.childNodes || [];
      for (const child of children) {
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };

    return walk(root);
  }

  _buildSvgText() {
    const source = this._getGraphicSource();
    if (!source) {
      throw new Error("No rendered visualization found to export.");
    }

    if (source.tagName?.toLowerCase() === "svg") {
      return this._serializeSvg(source);
    }

    if (source.tagName?.toLowerCase() === "canvas") {
      const dataUrl = source.toDataURL("image/png");
      const width = source.width || source.clientWidth || 1;
      const height = source.height || source.clientHeight || 1;
      return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<image href="${dataUrl}" width="${width}" height="${height}" />`,
        "</svg>"
      ].join("");
    }

    throw new Error("Unsupported visualization source.");
  }

  _serializeSvg(svgEl) {
    const clone = svgEl.cloneNode(true);
    if (!clone.getAttribute("xmlns")) {
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    if (!clone.getAttribute("xmlns:xlink")) {
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(clone);
  }

  _resolveSizeForSvg(svgEl) {
    const viewBox = svgEl.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(/\s+/).map(Number);
      if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
        return { width: Math.max(1, parts[2]), height: Math.max(1, parts[3]) };
      }
    }

    const widthAttr = parseFloat(svgEl.getAttribute("width") || "");
    const heightAttr = parseFloat(svgEl.getAttribute("height") || "");
    if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr)) {
      return { width: Math.max(1, widthAttr), height: Math.max(1, heightAttr) };
    }

    const rect = svgEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)) };
    }

    const hostRect = this.hostEl?.getBoundingClientRect();
    return {
      width: Math.max(1, Math.round(hostRect?.width || 1200)),
      height: Math.max(1, Math.round(hostRect?.height || 700))
    };
  }

  _loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to load exported SVG image."));
      img.src = url;
    });
  }

  _canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create image blob."));
      }, mimeType, quality);
    });
  }

  async _toRasterImage({ mimeType = "image/png", quality } = {}) {
    const source = this._getGraphicSource();
    if (!source) {
      throw new Error("No rendered visualization found to export.");
    }

    let canvas;
    if (source.tagName?.toLowerCase() === "canvas") {
      const width = source.width || source.clientWidth || 1;
      const height = source.height || source.clientHeight || 1;
      canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (mimeType === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    } else if (source.tagName?.toLowerCase() === "svg") {
      const svgText = this._serializeSvg(source);
      const size = this._resolveSizeForSvg(source);
      canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d");
      if (mimeType === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      try {
        const image = await this._loadImage(url);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      } finally {
        URL.revokeObjectURL(url);
      }
    } else {
      throw new Error("Unsupported visualization source.");
    }

    const blob = await this._canvasToBlob(canvas, mimeType, quality);
    const dataUrl = canvas.toDataURL(mimeType, quality);
    return { blob, width: canvas.width, height: canvas.height, dataUrl };
  }

  _downloadBlob(blob, filename) {
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  }
}
