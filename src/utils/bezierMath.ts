import { Point, AnchorPoint, PathElement, VectorElement, SelectedAnchorIndex, AnchorPointType } from '../types/vector';

/**
 * Gets coordinate point from an AnchorPoint safely
 */
export function getAnchorPos(pt: AnchorPoint): Point {
  return {
    x: pt.x ?? pt.point?.x ?? 0,
    y: pt.y ?? pt.point?.y ?? 0,
  };
}

/**
 * Hit test an anchor point or its exposed Bézier handles
 * Hit threshold is 6px in screen/canvas space
 */
export function getAnchorUnderCursor(
  mousePos: Point,
  shape: PathElement,
  zoom: number,
  selectedAnchorIndices?: SelectedAnchorIndex[]
): {
  pointIndex: number;
  handleType: 'anchor' | 'handleIn' | 'handleOut';
  point: Point;
} | null {
  const hitThreshold = 6 / zoom;

  // 1. First priority: Check Bézier control handles of currently selected anchors on this shape
  if (selectedAnchorIndices && selectedAnchorIndices.length > 0) {
    for (const sel of selectedAnchorIndices) {
      if (sel.shapeId !== shape.id) continue;
      const idx = sel.pointIndex;
      if (idx < 0 || idx >= shape.points.length) continue;
      const anchor = shape.points[idx];

      if (anchor.handleIn) {
        const d = Math.hypot(mousePos.x - anchor.handleIn.x, mousePos.y - anchor.handleIn.y);
        if (d <= hitThreshold) {
          return { pointIndex: idx, handleType: 'handleIn', point: anchor.handleIn };
        }
      }

      if (anchor.handleOut) {
        const d = Math.hypot(mousePos.x - anchor.handleOut.x, mousePos.y - anchor.handleOut.y);
        if (d <= hitThreshold) {
          return { pointIndex: idx, handleType: 'handleOut', point: anchor.handleOut };
        }
      }
    }
  }

  // 2. Second priority: Check anchor points on this shape
  for (let i = 0; i < shape.points.length; i++) {
    const anchor = shape.points[i];
    const pos = getAnchorPos(anchor);
    const d = Math.hypot(mousePos.x - pos.x, mousePos.y - pos.y);
    if (d <= hitThreshold) {
      return { pointIndex: i, handleType: 'anchor', point: pos };
    }
  }

  return null;
}

/**
 * Find hit anchor or handle across all elements on canvas
 * Searches in reverse z-order (topmost first)
 */
export function findHitAnchorAcrossElements(
  mousePos: Point,
  elements: VectorElement[],
  zoom: number,
  selectedAnchorIndices: SelectedAnchorIndex[]
): {
  element: PathElement;
  hit: { pointIndex: number; handleType: 'anchor' | 'handleIn' | 'handleOut'; point: Point };
} | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!el.visible || el.locked) continue;
    if (el.type === 'path') {
      const hit = getAnchorUnderCursor(mousePos, el, zoom, selectedAnchorIndices);
      if (hit) {
        return { element: el, hit };
      }
    }
  }
  return null;
}

/**
 * Calculates opposite handle when dragging handleIn or handleOut
 * - If isAlt is true: breaks symmetry (point becomes corner, opposite handle stays unchanged)
 * - If isAlt is false & point is smooth: aligns opposite handle collinear (180-deg mirror angle)
 */
export function calculateOppositeHandle(
  anchorPos: Point,
  draggedHandlePos: Point,
  origOppositeHandle: Point | null,
  isAlt: boolean,
  origPointType: AnchorPointType = 'smooth'
): {
  oppositeHandle: Point | null;
  pointType: AnchorPointType;
  isCorner: boolean;
} {
  if (isAlt) {
    // Alt/Option breaks handle symmetry (converts to corner with independent handles)
    return {
      oppositeHandle: origOppositeHandle,
      pointType: 'corner',
      isCorner: true,
    };
  }

  // If originally corner and not alt, keep opposite handle unless user wanted smooth
  if (origPointType === 'corner') {
    return {
      oppositeHandle: origOppositeHandle,
      pointType: 'corner',
      isCorner: true,
    };
  }

  // Smooth mode: align opposite handle symmetrically opposite (mirror angle)
  const dx = draggedHandlePos.x - anchorPos.x;
  const dy = draggedHandlePos.y - anchorPos.y;
  const dragDist = Math.hypot(dx, dy);

  if (dragDist === 0) {
    return {
      oppositeHandle: origOppositeHandle,
      pointType: 'smooth',
      isCorner: false,
    };
  }

  const ux = dx / dragDist;
  const uy = dy / dragDist;

  // Preserve existing opposite handle length if it existed, otherwise use dragged distance
  let oppDist = dragDist;
  if (origOppositeHandle) {
    const exDist = Math.hypot(origOppositeHandle.x - anchorPos.x, origOppositeHandle.y - anchorPos.y);
    if (exDist > 0.5) oppDist = exDist;
  }

  const oppHandle: Point = {
    x: anchorPos.x - ux * oppDist,
    y: anchorPos.y - uy * oppDist,
  };

  return {
    oppositeHandle: oppHandle,
    pointType: 'smooth',
    isCorner: false,
  };
}

/**
 * Returns all anchor points falling inside a marquee selection rectangle
 */
export function getAnchorsInRect(
  rect: { minX: number; minY: number; maxX: number; maxY: number },
  elements: VectorElement[]
): SelectedAnchorIndex[] {
  const result: SelectedAnchorIndex[] = [];

  for (const el of elements) {
    if (!el.visible || el.locked) continue;
    if (el.type === 'path') {
      for (let i = 0; i < el.points.length; i++) {
        const pt = getAnchorPos(el.points[i]);
        if (
          pt.x >= rect.minX &&
          pt.x <= rect.maxX &&
          pt.y >= rect.minY &&
          pt.y <= rect.maxY
        ) {
          result.push({
            shapeId: el.id,
            pointIndex: i,
            handleType: 'anchor',
          });
        }
      }
    }
  }

  return result;
}

/**
 * Illustrator-style Direct Selection Gizmo Rendering:
 * - Hollow square points (4x4px white fill, 1.5px #0d99ff border) for all path anchors
 * - Solid square points (#0d99ff filled) for currently selected anchor points
 * - Direction lines connecting selected anchors to their handleIn & handleOut circular control points (round dots, 4px diameter)
 */
export function drawDirectSelectionGizmos(
  ctx: CanvasRenderingContext2D,
  path: PathElement,
  zoom: number,
  selectedAnchors: SelectedAnchorIndex[]
) {
  const pts = path.points;
  if (!pts || pts.length === 0) return;

  const anchorSize = Math.max(4, 5 / zoom);
  const halfSize = anchorSize / 2;
  const lineWidth = Math.max(1, 1.5 / zoom);
  const handleDotRadius = Math.max(2, 2.5 / zoom); // 4px - 5px diameter

  ctx.save();

  // 1. Draw Bézier direction lines and circular control points for selected anchors
  for (let i = 0; i < pts.length; i++) {
    const anchor = pts[i];
    const isSelected = selectedAnchors.some(
      (s) => s.shapeId === path.id && s.pointIndex === i
    );
    if (!isSelected) continue;

    const pos = getAnchorPos(anchor);

    // Incoming handle
    if (anchor.handleIn) {
      ctx.beginPath();
      ctx.strokeStyle = '#0d99ff';
      ctx.lineWidth = Math.max(1, 1.2 / zoom);
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(anchor.handleIn.x, anchor.handleIn.y);
      ctx.stroke();

      // Circular control point
      ctx.beginPath();
      ctx.arc(anchor.handleIn.x, anchor.handleIn.y, handleDotRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0d99ff';
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    // Outgoing handle
    if (anchor.handleOut) {
      ctx.beginPath();
      ctx.strokeStyle = '#0d99ff';
      ctx.lineWidth = Math.max(1, 1.2 / zoom);
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(anchor.handleOut.x, anchor.handleOut.y);
      ctx.stroke();

      // Circular control point
      ctx.beginPath();
      ctx.arc(anchor.handleOut.x, anchor.handleOut.y, handleDotRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0d99ff';
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  // 2. Draw square anchor points (hollow for unselected, solid #0d99ff for selected)
  for (let i = 0; i < pts.length; i++) {
    const anchor = pts[i];
    const pos = getAnchorPos(anchor);
    const isSelected = selectedAnchors.some(
      (s) => s.shapeId === path.id && s.pointIndex === i
    );

    const x = pos.x - halfSize;
    const y = pos.y - halfSize;

    if (isSelected) {
      // Solid square points (#0d99ff filled)
      ctx.fillStyle = '#0d99ff';
      ctx.fillRect(x, y, anchorSize, anchorSize);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(0.75, 1 / zoom);
      ctx.strokeRect(x, y, anchorSize, anchorSize);
    } else {
      // Hollow square points (4x4px white fill, 1.5px #0d99ff border)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, anchorSize, anchorSize);
      ctx.strokeStyle = '#0d99ff';
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(x, y, anchorSize, anchorSize);
    }
  }

  ctx.restore();
}

/**
 * Draws the Direct Selection marquee rectangle
 */
export function drawDirectSelectionMarquee(
  ctx: CanvasRenderingContext2D,
  rect: { minX: number; minY: number; maxX: number; maxY: number },
  zoom: number
) {
  const width = rect.maxX - rect.minX;
  const height = rect.maxY - rect.minY;
  if (width <= 0 || height <= 0) return;

  ctx.save();
  ctx.strokeStyle = '#0d99ff';
  ctx.lineWidth = Math.max(1, 1 / zoom);
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.fillStyle = 'rgba(13, 153, 255, 0.12)';

  ctx.fillRect(rect.minX, rect.minY, width, height);
  ctx.strokeRect(rect.minX, rect.minY, width, height);
  ctx.restore();
}
