export function computeAxisAwareMargins({
  xLabelAngle = 0,
  xLabelOffset = { x: 0, y: 0 },
  yLabelOffset = { x: 0, y: 0 },
  base = { top: 24, right: 20, bottom: 64, left: 64 }
} = {}) {
  const angle = Math.min(90, Math.max(-90, Number(xLabelAngle) || 0));
  const angledExtra = Math.abs(angle) > 0 ? 24 + Math.abs(angle) * 1.1 : 0;

  const bottom = Math.max(
    Number(base.bottom) || 64,
    44 + angledExtra + Math.abs(xLabelOffset?.y || 0) + Math.abs(xLabelOffset?.x || 0) * 0.3
  );
  const left = Math.max(
    Number(base.left) || 64,
    56 + Math.abs(yLabelOffset?.x || 0) + Math.abs(yLabelOffset?.y || 0) * 0.4
  );

  return {
    top: Number(base.top) || 24,
    right: Number(base.right) || 20,
    bottom,
    left
  };
}

export function measurePlotOverflow(svgNode, plotSelector, width, height) {
  if (!svgNode || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  const plot = svgNode.querySelector(plotSelector);
  if (!plot) return null;

  let bbox;
  try {
    bbox = plot.getBBox();
  } catch {
    return null;
  }
  if (!bbox || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) return null;

  return {
    left: Math.max(0, -bbox.x),
    top: Math.max(0, -bbox.y),
    right: Math.max(0, bbox.x + bbox.width - width),
    bottom: Math.max(0, bbox.y + bbox.height - height)
  };
}

export function shouldRefitLayout(overflow, tolerance = 1.5) {
  if (!overflow) return false;
  return (
    overflow.left > tolerance ||
    overflow.top > tolerance ||
    overflow.right > tolerance ||
    overflow.bottom > tolerance
  );
}

export function growMargins(margins, overflow, padding = 6) {
  const current = margins || { top: 24, right: 20, bottom: 64, left: 64 };
  return {
    top: Math.max(0, (current.top || 0) + Math.ceil((overflow?.top || 0) + padding)),
    right: Math.max(0, (current.right || 0) + Math.ceil((overflow?.right || 0) + padding)),
    bottom: Math.max(0, (current.bottom || 0) + Math.ceil((overflow?.bottom || 0) + padding)),
    left: Math.max(0, (current.left || 0) + Math.ceil((overflow?.left || 0) + padding))
  };
}
