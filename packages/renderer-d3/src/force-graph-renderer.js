import * as d3 from "d3";

export default class ForceGraphRenderer {
  constructor(opts = {}) {
    this.container = opts.container || null; // DOM element containing an <svg>
    this.encodingManager = opts.encodingManager || null;
    this.width = opts.width || 800;
    this.height = opts.height || 600;
    this.logger = opts.logger || console;

    this.callbacks = opts.callbacks || {};

    this.svg = null;
    this.simulation = null;
    this.nodeGroup = null;
    this.linkSel = null;

    this.nodes = [];
    this.links = [];
    this.encoding = null;
  }

  render(graph = { nodes: [], links: [] }, encoding = null) {
    this.nodes = graph.nodes || [];
    this.links = graph.links || [];
    this.encoding = encoding || this.encoding;

    if (!this.container) throw new Error("ForceGraphRenderer requires a container element");
   
    this.svg = d3.select(this.container.querySelector("svg"));
    const width = this.width;
    const height = this.height;

    this.svg.selectAll("*").remove();

    // Arrow head
    const defs = this.svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    if (!this.nodes?.length) {
      this.svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("No data to visualize");
      return;
    }

    // Validate nodes/links
    this.nodes = this.nodes.filter((n) => n && n.id != null);
    this.links = (this.links || []).filter((l) => l && l.source != null && l.target != null);

    const mapping = this.encoding || {};

    // Node color scales
    const nodeColorConfigs = Array.isArray(mapping.nodes?.color)
      ? mapping.nodes.color
      : [mapping.nodes?.color].filter(Boolean);
    const nodeColorEntries = nodeColorConfigs.map((config, index) => ({
      config,
      scale: config?.scale
        ? this.encodingManager.getOrCreateD3Scale(
            `nodeColor-${index}-${config.field}`,
            config.scale,
            this.nodes,
            config.field,
            true,
            (scaleConfig, data, field, isColor) => this.encodingManager.createD3Scale(scaleConfig, data, field, isColor)
          )
        : null
    }));

    const getNodeColor = (d) => {
      for (const entry of nodeColorEntries) {
        const field = entry.config?.field;
        if (!field || d[field] === undefined) continue;

        if (entry.scale) {
          const dom = entry.scale.domain?.() || [];
          if (!dom.length || dom.includes(d[field])) {
            const color = entry.scale(d[field]);
            if (color) return color;
          }
        }

        if (entry.config?.value) return entry.config.value;
      }
      return "#cccccc";
    };

    // Node size scale
    const nodeSizeConfig = mapping.nodes?.size || {};
    const nodeSizeScale = nodeSizeConfig.scale
      ? this.encodingManager.getOrCreateD3Scale(
          `nodeSize-${nodeSizeConfig.field}`,
          nodeSizeConfig.scale,
          this.nodes,
          nodeSizeConfig.field,
          false,
          (config, data, field, isColor) => this.encodingManager.createD3Scale(config, data, field, isColor)
        )
      : null;

    const getNodeRadius = (d) => {
      if (nodeSizeScale && nodeSizeConfig.field && d[nodeSizeConfig.field] !== undefined) {
        const r = nodeSizeScale(d[nodeSizeConfig.field]);
        if (typeof r === "number" && !Number.isNaN(r) && r > 0) return r;
      }
      const fallback = nodeSizeConfig.value || 10;
      return typeof fallback === "number" && !Number.isNaN(fallback) && fallback > 0 ? fallback : 10;
    };

    // Link color scales
    const linkColorConfigs = Array.isArray(mapping.links?.color)
      ? mapping.links.color
      : [mapping.links?.color].filter(Boolean);
    const linkColorEntries = linkColorConfigs.map((config, index) => ({
      config,
      scale: config?.scale
        ? this.encodingManager.getOrCreateD3Scale(
            `linkColor-${index}-${config.field}`,
            config.scale,
            this.links,
            config.field,
            true,
            (scaleConfig, data, field, isColor) => this.encodingManager.createD3Scale(scaleConfig, data, field, isColor)
          )
        : null
    }));

    const getLinkColor = (d) => {
      for (const entry of linkColorEntries) {
        const field = entry.config?.field;
        if (!field || d[field] === undefined) continue;

        if (entry.scale) {
          const dom = entry.scale.domain?.() || [];
          if (!dom.length || dom.includes(d[field])) {
            const color = entry.scale(d[field]);
            if (color) return color;
          }
        }

        if (entry.config?.value) return entry.config.value;
      }
      return "#999";
    };

    const linkWidthConfig = mapping.links?.width || mapping.links?.Width || {};
    const getLinkWidth = () => linkWidthConfig.value || 1.5;

    const linkDistance = mapping.links?.distance || 100;

    this.simulation = d3
      .forceSimulation(this.nodes)
      .force("link", d3.forceLink(this.links).id((d) => d.id).distance(linkDistance))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => getNodeRadius(d) + 5))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    const constrainNode = (d) => {
      const r = getNodeRadius(d);
      d.x = Math.max(r, Math.min(width - r, d.x));
      d.y = Math.max(r, Math.min(height - r, d.y));
    };

    this.linkSel = this.svg
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(this.links)
      .enter()
      .append("line")
      .attr("class", (d) => d.type || "directional")
      .attr("stroke", getLinkColor)
      .attr("stroke-width", getLinkWidth())
      .on("mouseover", (event, d) => this.callbacks.onLinkHover?.(d, event.offsetX, event.offsetY))
      .on("mouseout", () => this.callbacks.onLinkOut?.());

    this.nodeGroup = this.svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(this.nodes)
      .enter()
      .append("g")
      .call(
        d3
          .drag()
          .on("start", (event, d) => dragstarted(event, d, this.simulation))
          .on("drag", (event, d) => dragged(event, d))
          .on("end", (event, d) => dragended(event, d, this.simulation))
      )
      .on("mouseover", (event, d) => this.callbacks.onNodeHover?.(d, event, this.linkSel, this.nodeGroup))
      .on("mouseout", () => this.callbacks.onNodeOut?.(this.linkSel, this.nodeGroup))
      .on("contextmenu", (event, d) => {
        event.preventDefault();
        this.callbacks.onNodeContextMenu?.(d, event.offsetX, event.offsetY);
      })
      .on("click", (event, d) => this.callbacks.onNodeClick?.(d, event));

    this.nodeGroup.append("circle").attr("r", getNodeRadius).attr("fill", getNodeColor);
    this.nodeGroup.append("text").attr("class", "node-label").text((d) => d.label || d.id);

    const calculateLinkPosition = (lnk) => {
      const source = lnk.source;
      const target = lnk.target;
      if (Number.isNaN(source.x) || Number.isNaN(source.y) || Number.isNaN(target.x) || Number.isNaN(target.y)) {
        return { x1: 0, y1: 0, x2: 0, y2: 0 };
      }

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return { x1: source.x, y1: source.y, x2: target.x, y2: target.y };

      const sr = getNodeRadius(source);
      const tr = getNodeRadius(target);

      const ux = dx / dist;
      const uy = dy / dist;

      return {
        x1: source.x + ux * sr,
        y1: source.y + uy * sr,
        x2: target.x - ux * tr,
        y2: target.y - uy * tr
      };
    };

    this.simulation.on("tick", () => {
      this.nodeGroup.each(constrainNode);

      this.linkSel.each(function (d) {
        const p = calculateLinkPosition(d);
        d3.select(this).attr("x1", p.x1).attr("y1", p.y1).attr("x2", p.x2).attr("y2", p.y2);
      });

      this.nodeGroup.attr("transform", (d) => {
        const x = Number.isNaN(d.x) ? width / 2 : d.x;
        const y = Number.isNaN(d.y) ? height / 2 : d.y;
        return `translate(${x},${y})`;
      });
    });

    function dragstarted(event, d, sim) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d, sim) {
      if (!event.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  updateData(graph = { nodes: [], links: [] }) {
    // stop previous simulation and re-render fully for simplicity
    this.destroy();
    this.render(graph, this.encoding);
  }

  updateEncoding(encoding) {
    this.encoding = encoding;
    if (this.encodingManager) this.encodingManager.clearScaleCache();
    // re-render to apply new scales/styles
    this.updateData({ nodes: this.nodes, links: this.links });
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    if (this.simulation) {
      this.simulation.force("center", d3.forceCenter(this.width / 2, this.height / 2));
      this.simulation.alpha(0.3).restart();
    }
  }

  destroy() {
    try {
      if (this.simulation) {
        this.simulation.stop();
        this.simulation = null;
      }
    } catch (e) {
      /* ignore */
    }

    if (this.svg) {
      this.svg.selectAll("*").remove();
      this.svg = null;
    }

    this.nodeGroup = null;
    this.linkSel = null;
  }
}
