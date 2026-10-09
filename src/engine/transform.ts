import {
  VectorElement,
  PathElement,
  RectElement,
  EllipseElement,
  GroupElement,
  TextElement,
  ImageElement,
  Point,
  AnchorPoint,
} from '../types/vector';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

let measureCanvasCtx: CanvasRenderingContext2D | null = null;

/**
 * Accurately measures text dimensions using an offscreen canvas context
 */
export function measureTextBounds(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: string | number = 400,
  lineHeight = 1.2
): { width: number; height: number } {
  if (typeof document !== 'undefined') {
    if (!measureCanvasCtx) {
      const c = document.createElement('canvas');
      measureCanvasCtx = c.getContext('2d');
    }
    if (measureCanvasCtx) {
      measureCanvasCtx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
      const lines = (text || ' ').split('\n');
      let maxWidth = 0;
      for (const line of lines) {
        const m = measureCanvasCtx.measureText(line || ' ');
        maxWidth = Math.max(maxWidth, m.width);
      }
      const singleLineHeight = fontSize * lineHeight;
      const totalHeight = Math.max(fontSize, lines.length * singleLineHeight);
      return {
        width: Math.max(10, Math.ceil(maxWidth)),
        height: Math.max(10, Math.ceil(totalHeight)),
      };
    }
  }
  const lines = (text || ' ').split('\n');
  const maxLen = Math.max(...lines.map((l) => l.length), 1);
  return {
    width: Math.max(10, maxLen * fontSize * 0.6),
    height: Math.max(10, lines.length * fontSize * 1.2),
  };
}

/**
 * Calculates the bounding box of any vector element (including GroupElement, TextElement, ImageElement)
 */
export function getElementBoundingBox(el: VectorElement): BoundingBox {
  let minX = 0, minY = 0, maxX = 0, maxY = 0;

  if (el.type === 'rectangle') {
    minX = Math.min(el.x, el.x + el.width);
    maxX = Math.max(el.x, el.x + el.width);
    minY = Math.min(el.y, el.y + el.height);
    maxY = Math.max(el.y, el.y + el.height);
  } else if (el.type === 'ellipse') {
    minX = el.cx - Math.abs(el.rx);
    maxX = el.cx + Math.abs(el.rx);
    minY = el.cy - Math.abs(el.ry);
    maxY = el.cy + Math.abs(el.ry);
  } else if (el.type === 'path') {
    if (el.points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    }
    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;

    for (const pt of el.points) {
      minX = Math.min(minX, pt.point.x);
      minY = Math.min(minY, pt.point.y);
      maxX = Math.max(maxX, pt.point.x);
      maxY = Math.max(maxY, pt.point.y);

      if (pt.handleIn) {
        minX = Math.min(minX, pt.handleIn.x);
        minY = Math.min(minY, pt.handleIn.y);
        maxX = Math.max(maxX, pt.handleIn.x);
        maxY = Math.max(maxY, pt.handleIn.y);
      }
      if (pt.handleOut) {
        minX = Math.min(minX, pt.handleOut.x);
        minY = Math.min(minY, pt.handleOut.y);
        maxX = Math.max(maxX, pt.handleOut.x);
        maxY = Math.max(maxY, pt.handleOut.y);
      }
    }
  } else if (el.type === 'group') {
    if (!el.children || el.children.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    }
    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;

    for (const child of el.children) {
      if (child.visible === false) continue;
      const cb = getElementBoundingBox(child);
      minX = Math.min(minX, cb.minX);
      minY = Math.min(minY, cb.minY);
      maxX = Math.max(maxX, cb.maxX);
      maxY = Math.max(maxY, cb.maxY);
    }

    if (minX === Infinity) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    }
  } else if (el.type === 'text') {
    const metrics = measureTextBounds(
      el.text,
      el.fontFamily,
      el.fontSize,
      el.fontWeight,
      el.lineHeight
    );
    const w = el.width || metrics.width;
    const h = el.height || metrics.height;
    minX = el.x;
    minY = el.y;
    maxX = el.x + w;
    maxY = el.y + h;
  } else if (el.type === 'image') {
    minX = el.x;
    minY = el.y;
    maxX = el.x + Math.max(1, el.width);
    maxY = el.y + Math.max(1, el.height);
  }

  const width = Math.max(0.1, maxX - minX);
  const height = Math.max(0.1, maxY - minY);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Returns positions of the 8 bounding box handles in world space
 */
export function getHandlePositions(box: BoundingBox): Record<HandleType, Point> {
  return {
    nw: { x: box.minX, y: box.minY },
    n:  { x: box.centerX, y: box.minY },
    ne: { x: box.maxX, y: box.minY },
    e:  { x: box.maxX, y: box.centerY },
    se: { x: box.maxX, y: box.maxY },
    s:  { x: box.centerX, y: box.maxY },
    sw: { x: box.minX, y: box.maxY },
    w:  { x: box.minX, y: box.centerY },
  };
}

export type HitZone =
  | { type: 'handle'; handle: HandleType }
  | { type: 'rotate'; corner: 'nw' | 'ne' | 'se' | 'sw' }
  | { type: 'body' }
  | null;

/**
 * Hit tests cursor against bounding box handles, rotation rings, and body
 */
export function hitTestBoundingBox(pos: Point, box: BoundingBox, zoom: number): HitZone {
  const handles = getHandlePositions(box);
  const handleThreshold = 8 / zoom;
  const rotateMinRadius = 8 / zoom;
  const rotateMaxRadius = 22 / zoom;

  // 1. Check direct handle hits (scaling)
  const handleKeys: HandleType[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  for (const key of handleKeys) {
    const hp = handles[key];
    const dx = pos.x - hp.x;
    const dy = pos.y - hp.y;
    if (Math.sqrt(dx * dx + dy * dy) <= handleThreshold) {
      return { type: 'handle', handle: key };
    }
  }

  // 2. Check rotation zone (slightly outside 4 corners)
  const corners: Array<{ key: 'nw' | 'ne' | 'se' | 'sw'; pt: Point }> = [
    { key: 'nw', pt: handles.nw },
    { key: 'ne', pt: handles.ne },
    { key: 'se', pt: handles.se },
    { key: 'sw', pt: handles.sw },
  ];

  for (const c of corners) {
    const dist = Math.sqrt((pos.x - c.pt.x) ** 2 + (pos.y - c.pt.y) ** 2);
    if (dist >= rotateMinRadius && dist <= rotateMaxRadius) {
      return { type: 'rotate', corner: c.key };
    }
  }

  // 3. Check inside bounding box body
  const pad = 4 / zoom;
  if (
    pos.x >= box.minX - pad &&
    pos.x <= box.maxX + pad &&
    pos.y >= box.minY - pad &&
    pos.y <= box.maxY + pad
  ) {
    return { type: 'body' };
  }

  return null;
}

/**
 * Returns the CSS cursor string appropriate for a handle or rotation zone
 */
export function getTransformCursor(hit: HitZone): string {
  if (!hit) return 'default';
  if (hit.type === 'rotate') {
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/%3E%3Cpolyline points='21 3 21 8 16 8'/%3E%3C/svg%3E") 12 12, crosshair`;
  }
  if (hit.type === 'body') return 'move';

  switch (hit.handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
  }
}

/**
 * Translates any vector element (including groups) by (dx, dy)
 */
export function translateElement(el: VectorElement, dx: number, dy: number): VectorElement {
  if (el.type === 'rectangle') {
    return { ...el, x: el.x + dx, y: el.y + dy };
  }
  if (el.type === 'ellipse') {
    return { ...el, cx: el.cx + dx, cy: el.cy + dy };
  }
  if (el.type === 'path') {
    return {
      ...el,
      points: el.points.map((pt) => ({
        ...pt,
        point: { x: pt.point.x + dx, y: pt.point.y + dy },
        handleIn: pt.handleIn ? { x: pt.handleIn.x + dx, y: pt.handleIn.y + dy } : null,
        handleOut: pt.handleOut ? { x: pt.handleOut.x + dx, y: pt.handleOut.y + dy } : null,
      })),
    };
  }
  if (el.type === 'text') {
    return { ...el, x: el.x + dx, y: el.y + dy };
  }
  if (el.type === 'image') {
    return { ...el, x: el.x + dx, y: el.y + dy };
  }
  if (el.type === 'group') {
    return {
      ...el,
      children: el.children.map((child) => translateElement(child, dx, dy)),
    };
  }
  return el;
}

/**
 * Helper to scale a single element relative to a fixed pivot point
 */
function scaleElementWithPivot(
  el: VectorElement,
  pivot: Point,
  sx: number,
  sy: number
): VectorElement {
  if (el.type === 'rectangle') {
    const p1 = { x: pivot.x + (el.x - pivot.x) * sx, y: pivot.y + (el.y - pivot.y) * sy };
    const p2 = {
      x: pivot.x + (el.x + el.width - pivot.x) * sx,
      y: pivot.y + (el.y + el.height - pivot.y) * sy,
    };
    return {
      ...el,
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      width: Math.abs(p2.x - p1.x),
      height: Math.abs(p2.y - p1.y),
    };
  }

  if (el.type === 'ellipse') {
    const center = {
      x: pivot.x + (el.cx - pivot.x) * sx,
      y: pivot.y + (el.cy - pivot.y) * sy,
    };
    return {
      ...el,
      cx: center.x,
      cy: center.y,
      rx: Math.abs(el.rx * sx),
      ry: Math.abs(el.ry * sy),
    };
  }

  if (el.type === 'path') {
    const transformedPoints = el.points.map((pt) => ({
      ...pt,
      point: {
        x: pivot.x + (pt.point.x - pivot.x) * sx,
        y: pivot.y + (pt.point.y - pivot.y) * sy,
      },
      handleIn: pt.handleIn
        ? {
            x: pivot.x + (pt.handleIn.x - pivot.x) * sx,
            y: pivot.y + (pt.handleIn.y - pivot.y) * sy,
          }
        : null,
      handleOut: pt.handleOut
        ? {
            x: pivot.x + (pt.handleOut.x - pivot.x) * sx,
            y: pivot.y + (pt.handleOut.y - pivot.y) * sy,
          }
        : null,
    }));

    return {
      ...el,
      points: transformedPoints,
    };
  }

  if (el.type === 'text') {
    const curW = el.width || measureTextBounds(el.text, el.fontFamily, el.fontSize, el.fontWeight, el.lineHeight).width;
    const curH = el.height || measureTextBounds(el.text, el.fontFamily, el.fontSize, el.fontWeight, el.lineHeight).height;
    const p1 = { x: pivot.x + (el.x - pivot.x) * sx, y: pivot.y + (el.y - pivot.y) * sy };
    const p2 = {
      x: pivot.x + (el.x + curW - pivot.x) * sx,
      y: pivot.y + (el.y + curH - pivot.y) * sy,
    };
    const scaleFactor = Math.max(Math.abs(sx), Math.abs(sy));
    return {
      ...el,
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      width: Math.max(10, Math.abs(p2.x - p1.x)),
      height: Math.max(10, Math.abs(p2.y - p1.y)),
      fontSize: Math.max(6, Math.round(el.fontSize * scaleFactor)),
    };
  }

  if (el.type === 'image') {
    const p1 = { x: pivot.x + (el.x - pivot.x) * sx, y: pivot.y + (el.y - pivot.y) * sy };
    const p2 = {
      x: pivot.x + (el.x + el.width - pivot.x) * sx,
      y: pivot.y + (el.y + el.height - pivot.y) * sy,
    };
    return {
      ...el,
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      width: Math.max(1, Math.abs(p2.x - p1.x)),
      height: Math.max(1, Math.abs(p2.y - p1.y)),
    };
  }

  if (el.type === 'group') {
    return {
      ...el,
      children: el.children.map((child) => scaleElementWithPivot(child, pivot, sx, sy)),
    };
  }

  return el;
}

/**
 * Scale an element using its original geometry and bounding box
 */
export function scaleElement(
  original: VectorElement,
  handle: HandleType,
  box: BoundingBox,
  currentMouse: Point,
  lockAspectRatio: boolean
): VectorElement {
  let pivot: Point;
  let allowsX = true;
  let allowsY = true;

  switch (handle) {
    case 'nw': pivot = { x: box.maxX, y: box.maxY }; break;
    case 'n':  pivot = { x: box.centerX, y: box.maxY }; allowsX = false; break;
    case 'ne': pivot = { x: box.minX, y: box.maxY }; break;
    case 'e':  pivot = { x: box.minX, y: box.centerY }; allowsY = false; break;
    case 'se': pivot = { x: box.minX, y: box.minY }; break;
    case 's':  pivot = { x: box.centerX, y: box.minY }; allowsX = false; break;
    case 'sw': pivot = { x: box.maxX, y: box.minY }; break;
    case 'w':  pivot = { x: box.maxX, y: box.centerY }; allowsX = false; break;
  }

  const initialDistX = handle.includes('w') ? box.maxX - box.minX : box.minX - box.maxX;
  const initialDistY = handle.includes('n') ? box.maxY - box.minY : box.minY - box.maxY;

  let sx = allowsX ? (currentMouse.x - pivot.x) / initialDistX : 1;
  let sy = allowsY ? (currentMouse.y - pivot.y) / initialDistY : 1;

  if (Math.abs(sx) < 0.001) sx = 0.001;
  if (Math.abs(sy) < 0.001) sy = 0.001;

  if (lockAspectRatio) {
    if (allowsX && allowsY) {
      const s = Math.max(Math.abs(sx), Math.abs(sy));
      sx = s * Math.sign(sx || 1);
      sy = s * Math.sign(sy || 1);
    } else if (allowsX) {
      sy = sx;
    } else if (allowsY) {
      sx = sy;
    }
  }

  return scaleElementWithPivot(original, pivot, sx, sy);
}

/**
 * Converts a Rectangle or Ellipse into a standard 4-point Bézier Path
 */
export function convertToPath(el: VectorElement): PathElement {
  if (el.type === 'path') return el;

  if (el.type === 'rectangle') {
    const pts: AnchorPoint[] = [
      { point: { x: el.x, y: el.y }, handleIn: null, handleOut: null },
      { point: { x: el.x + el.width, y: el.y }, handleIn: null, handleOut: null },
      { point: { x: el.x + el.width, y: el.y + el.height }, handleIn: null, handleOut: null },
      { point: { x: el.x, y: el.y + el.height }, handleIn: null, handleOut: null },
    ];
    return {
      id: el.id,
      name: el.name,
      type: 'path',
      points: pts,
      closed: true,
      fill: el.fill,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth,
      opacity: el.opacity,
      visible: el.visible,
      locked: el.locked,
    };
  }

  if (el.type === 'ellipse') {
    const kappa = 0.5522847498;
    const ox = el.rx * kappa;
    const oy = el.ry * kappa;

    const pts: AnchorPoint[] = [
      {
        point: { x: el.cx, y: el.cy - el.ry },
        handleIn: { x: el.cx - ox, y: el.cy - el.ry },
        handleOut: { x: el.cx + ox, y: el.cy - el.ry },
      },
      {
        point: { x: el.cx + el.rx, y: el.cy },
        handleIn: { x: el.cx + el.rx, y: el.cy - oy },
        handleOut: { x: el.cx + el.rx, y: el.cy + oy },
      },
      {
        point: { x: el.cx, y: el.cy + el.ry },
        handleIn: { x: el.cx + ox, y: el.cy + el.ry },
        handleOut: { x: el.cx - ox, y: el.cy + el.ry },
      },
      {
        point: { x: el.cx - el.rx, y: el.cy },
        handleIn: { x: el.cx - el.rx, y: el.cy + oy },
        handleOut: { x: el.cx - el.rx, y: el.cy - oy },
      },
    ];

    return {
      id: el.id,
      name: el.name,
      type: 'path',
      points: pts,
      closed: true,
      fill: el.fill,
      fillType: el.fillType,
      gradient: el.gradient ? JSON.parse(JSON.stringify(el.gradient)) : undefined,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth,
      strokeCap: el.strokeCap,
      strokeJoin: el.strokeJoin,
      strokeDashArray: el.strokeDashArray,
      opacity: el.opacity,
      visible: el.visible,
      locked: el.locked,
    };
  }

  if (el.type === 'text' || el.type === 'image') {
    const box = getElementBoundingBox(el);
    const pts: AnchorPoint[] = [
      { point: { x: box.minX, y: box.minY }, handleIn: null, handleOut: null },
      { point: { x: box.maxX, y: box.minY }, handleIn: null, handleOut: null },
      { point: { x: box.maxX, y: box.maxY }, handleIn: null, handleOut: null },
      { point: { x: box.minX, y: box.maxY }, handleIn: null, handleOut: null },
    ];
    return {
      id: el.id,
      name: el.name,
      type: 'path',
      points: pts,
      closed: true,
      fill: el.type === 'text' ? el.fill : 'none',
      stroke: el.stroke || 'none',
      strokeWidth: el.strokeWidth || 1,
      opacity: el.opacity,
      visible: el.visible,
      locked: el.locked,
    };
  }

  // Fallback for group (should not be directly called on group)
  return {
    id: el.id,
    type: 'path',
    points: [],
    closed: true,
    fill: 'none',
    stroke: 'none',
    strokeWidth: 1,
    opacity: 1,
  };
}

/**
 * Rotates an element around a center point
 * If snap15Deg is true, snaps rotation angle to 15-degree steps (PI / 12)
 */
export function rotateElement(
  original: VectorElement,
  center: Point,
  angleRad: number,
  snap15Deg: boolean
): VectorElement {
  let finalAngle = angleRad;
  if (snap15Deg) {
    const step = Math.PI / 12; // 15 degrees
    finalAngle = Math.round(angleRad / step) * step;
  }

  // For groups: rotate each child recursively around the group's center
  if (original.type === 'group') {
    return {
      ...original,
      children: original.children.map((child) =>
        rotateElement(child, center, finalAngle, false)
      ),
    };
  }

  const cos = Math.cos(finalAngle);
  const sin = Math.sin(finalAngle);

  const rotatePoint = (p: Point): Point => ({
    x: center.x + (p.x - center.x) * cos - (p.y - center.y) * sin,
    y: center.y + (p.x - center.x) * sin + (p.y - center.y) * cos,
  });

  const path = convertToPath(original);

  const rotatedPoints = path.points.map((pt) => ({
    ...pt,
    point: rotatePoint(pt.point),
    handleIn: pt.handleIn ? rotatePoint(pt.handleIn) : null,
    handleOut: pt.handleOut ? rotatePoint(pt.handleOut) : null,
  }));

  return {
    ...path,
    points: rotatedPoints,
  };
}

/**
 * Hit tests cursor against interactive gradient handles (start and end points)
 */
export function hitTestGradientHandles(
  worldPos: Point,
  el: VectorElement,
  zoom: number
): 'gradient-start' | 'gradient-end' | null {
  if (!el.gradient) return null;
  const box = getElementBoundingBox(el);
  const w = Math.max(1, box.width);
  const h = Math.max(1, box.height);
  const p1 = {
    x: box.minX + el.gradient.startX * w,
    y: box.minY + el.gradient.startY * h,
  };
  const p2 = {
    x: box.minX + el.gradient.endX * w,
    y: box.minY + el.gradient.endY * h,
  };

  const hitRadius = Math.max(8, 10 / zoom);
  if (Math.hypot(worldPos.x - p1.x, worldPos.y - p1.y) <= hitRadius) {
    return 'gradient-start';
  }
  if (Math.hypot(worldPos.x - p2.x, worldPos.y - p2.y) <= hitRadius) {
    return 'gradient-end';
  }
  return null;
}
