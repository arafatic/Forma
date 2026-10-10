import { Point, VectorElement } from '../types/vector';
import { getElementBoundingBox, scaleElementWithPivot, rotateElement } from '../engine/transform';

export type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface TransformBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in radians
  centerX: number;
  centerY: number;
}

export type HandleHit = HandleType | 'rotate' | 'body' | null;

/**
 * Curved Adobe Illustrator-style double-arrow rotation cursor SVG data URI
 */
export const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%230d99ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67'/%3E%3C/svg%3E") 12 12, crosshair`;

/**
 * Rotates a 2D point around a center origin by angle (radians)
 */
export function rotatePoint(pt: Point, center: Point, angle: number): Point {
  if (Math.abs(angle) < 1e-6) return pt;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = pt.x - center.x;
  const dy = pt.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Calculates the collective bounding box (x, y, width, height, rotation) for active selectedIds
 */
export function calculateCollectiveBounds(
  elements: VectorElement[],
  selectedIds: string[]
): TransformBounds | null {
  if (!selectedIds || selectedIds.length === 0) return null;

  const selectedElements = elements.filter(
    (el) => selectedIds.includes(el.id) && el.visible !== false
  );

  if (selectedElements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of selectedElements) {
    const box = getElementBoundingBox(el);
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  }

  if (minX === Infinity) return null;

  const width = Math.max(0.1, maxX - minX);
  const height = Math.max(0.1, maxY - minY);
  const rotation =
    selectedElements.length === 1 && typeof selectedElements[0].rotation === 'number'
      ? selectedElements[0].rotation
      : 0;

  return {
    x: minX,
    y: minY,
    width,
    height,
    rotation,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

export const getCollectiveBoundingBox = calculateCollectiveBounds;

/**
 * Generates world positions for all 8 standard resize handles:
 * Top-Left (NW), Top-Center (N), Top-Right (NE), Right-Center (E),
 * Bottom-Right (SE), Bottom-Center (S), Bottom-Left (SW), Left-Center (W).
 */
export function getHandlePositions(bounds: TransformBounds): Record<HandleType, Point> {
  const { x, y, width, height, centerX, centerY, rotation } = bounds;

  const halfW = width / 2;
  const halfH = height / 2;

  // Unrotated handle positions relative to center
  const rawHandles: Record<HandleType, Point> = {
    nw: { x: centerX - halfW, y: centerY - halfH },
    n:  { x: centerX,         y: centerY - halfH },
    ne: { x: centerX + halfW, y: centerY - halfH },
    e:  { x: centerX + halfW, y: centerY },
    se: { x: centerX + halfW, y: centerY + halfH },
    s:  { x: centerX,         y: centerY + halfH },
    sw: { x: centerX - halfW, y: centerY + halfH },
    w:  { x: centerX - halfW, y: centerY },
  };

  if (Math.abs(rotation) < 1e-6) {
    return rawHandles;
  }

  const center: Point = { x: centerX, y: centerY };
  const rotatedHandles = {} as Record<HandleType, Point>;

  for (const key of Object.keys(rawHandles) as HandleType[]) {
    rotatedHandles[key] = rotatePoint(rawHandles[key], center, rotation);
  }

  return rotatedHandles;
}

/**
 * Hit-testing function: getHandleUnderCursor(mousePos, bounds, zoom, rotation)
 * - Returns handle type ('nw', 'se', 'n', etc.) when within 6px of a handle in screen pixels
 * - Returns 'rotate' when cursor is 8px–18px outside corner handles in screen pixels
 */
export function getHandleUnderCursor(
  mousePos: Point,
  bounds: TransformBounds,
  zoom: number,
  rotation: number = bounds.rotation
): HandleType | 'rotate' | null {
  const effectiveBounds = { ...bounds, rotation };
  const handles = getHandlePositions(effectiveBounds);

  // 1. Direct handle hit within 6px of handle center in screen pixels
  const handleHitThresholdWorld = 6 / zoom;
  const handleKeys: HandleType[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  for (const key of handleKeys) {
    const hp = handles[key];
    const dx = mousePos.x - hp.x;
    const dy = mousePos.y - hp.y;
    const distWorld = Math.hypot(dx, dy);
    if (distWorld <= handleHitThresholdWorld) {
      return key;
    }
  }

  // 2. Rotation zone: 8px to 18px outside the 4 corner handles in screen pixels
  const rotateMinRadiusWorld = 8 / zoom;
  const rotateMaxRadiusWorld = 18 / zoom;
  const cornerKeys: Array<'nw' | 'ne' | 'se' | 'sw'> = ['nw', 'ne', 'se', 'sw'];

  for (const ck of cornerKeys) {
    const cp = handles[ck];
    const dx = mousePos.x - cp.x;
    const dy = mousePos.y - cp.y;
    const distWorld = Math.hypot(dx, dy);

    if (distWorld >= rotateMinRadiusWorld && distWorld <= rotateMaxRadiusWorld) {
      return 'rotate';
    }
  }

  return null;
}

/**
 * Extended hit-test that also detects if cursor is inside the bounding box body
 */
export function hitTestBoundingBoxArea(
  mousePos: Point,
  bounds: TransformBounds,
  zoom: number
): HandleHit {
  const handleOrRotate = getHandleUnderCursor(mousePos, bounds, zoom, bounds.rotation);
  if (handleOrRotate) return handleOrRotate;

  // Unrotate mousePos relative to bounds center to test body intersection
  const unrotatedMouse = rotatePoint(
    mousePos,
    { x: bounds.centerX, y: bounds.centerY },
    -bounds.rotation
  );

  const pad = 4 / zoom;
  if (
    unrotatedMouse.x >= bounds.x - pad &&
    unrotatedMouse.x <= bounds.x + bounds.width + pad &&
    unrotatedMouse.y >= bounds.y - pad &&
    unrotatedMouse.y <= bounds.y + bounds.height + pad
  ) {
    return 'body';
  }

  return null;
}

/**
 * Returns appropriate CSS cursor string for handle, rotation, or body
 */
export function getCursorForHandle(
  hit: HandleType | 'rotate' | 'body' | null,
  rotation = 0
): string {
  if (!hit) return 'default';
  if (hit === 'rotate') return ROTATE_CURSOR;
  if (hit === 'body') return 'move';

  // If bounds has significant rotation, we could rotate cursor; for standard view, map cardinal directions
  switch (hit) {
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
 * Visual Rendering in Canvas:
 * Draws the bounding box and 8 handles in the overlay pass:
 * - 1px solid accent outline (#0d99ff)
 * - 8 square handles (white fill #ffffff, 1.5px #0d99ff stroke, 7x7px size, scale-invariant under zoom)
 */
export function drawTransformBoundingBox(
  ctx: CanvasRenderingContext2D,
  bounds: TransformBounds,
  zoom: number
): void {
  const { width, height, centerX, centerY, rotation } = bounds;

  const lineWidth = 1 / zoom;
  const handleSize = 7 / zoom;
  const strokeWidth = 1.5 / zoom;
  const halfHandle = handleSize / 2;

  ctx.save();

  // Apply rotation around center if present
  ctx.translate(centerX, centerY);
  if (Math.abs(rotation) > 1e-6) {
    ctx.rotate(rotation);
  }

  const halfW = width / 2;
  const halfH = height / 2;

  // 1. Solid accent outline (#0d99ff, 1px)
  ctx.strokeStyle = '#0d99ff';
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(-halfW, -halfH, width, height);

  // 2. 8 square handles in local coordinate space
  const localHandles: Array<[number, number]> = [
    [-halfW, -halfH], // nw
    [0,      -halfH], // n
    [halfW,  -halfH], // ne
    [halfW,  0],      // e
    [halfW,  halfH],  // se
    [0,      halfH],  // s
    [-halfW, halfH],  // sw
    [-halfW, 0],      // w
  ];

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0d99ff';
  ctx.lineWidth = strokeWidth;

  for (const [hx, hy] of localHandles) {
    ctx.fillRect(hx - halfHandle, hy - halfHandle, handleSize, handleSize);
    ctx.strokeRect(hx - halfHandle, hy - halfHandle, handleSize, handleSize);
  }

  ctx.restore();
}

/**
 * Returns the fixed opposite anchor point for a given resize handle:
 * - Dragging 'se' -> fixed anchor is top-left ('nw': initialBounds.x, initialBounds.y)
 * - Dragging 'nw' -> fixed anchor is bottom-right ('se': initialBounds.x + initialBounds.width, initialBounds.y + initialBounds.height)
 * - Dragging 'ne' -> fixed anchor is bottom-left ('sw': initialBounds.x, initialBounds.y + initialBounds.height)
 * - Dragging 'sw' -> fixed anchor is top-right ('ne': initialBounds.x + initialBounds.width, initialBounds.y)
 * - Dragging 'n'  -> fixed anchor is bottom-center ('s': initialBounds.centerX, initialBounds.y + initialBounds.height)
 * - Dragging 's'  -> fixed anchor is top-center ('n': initialBounds.centerX, initialBounds.y)
 * - Dragging 'e'  -> fixed anchor is left-center ('w': initialBounds.x, initialBounds.centerY)
 * - Dragging 'w'  -> fixed anchor is right-center ('e': initialBounds.x + initialBounds.width, initialBounds.centerY)
 */
export function getOppositeAnchor(bounds: TransformBounds, handle: HandleType): Point {
  const { x, y, width: w, height: h, centerX, centerY } = bounds;
  switch (handle) {
    case 'se': return { x: x, y: y };
    case 'nw': return { x: x + w, y: y + h };
    case 'ne': return { x: x, y: y + h };
    case 'sw': return { x: x + w, y: y };
    case 'n':  return { x: centerX, y: y + h };
    case 's':  return { x: centerX, y: y };
    case 'e':  return { x: x, y: centerY };
    case 'w':  return { x: x + w, y: centerY };
  }
}

/**
 * Resizing Mechanics:
 * Calculates new bounds and scale factors given initial bounds, initial mouse, current mouse, and modifiers.
 * - Delta is computed strictly from initialMouse, preventing instantaneous jump/snap on mousedown.
 * - Shift key: Constrain aspect ratio (initialBounds.width / initialBounds.height).
 * - Alt/Option key: Anchor point becomes geometric center, expanding/contracting equally in both directions.
 * - Shift + Alt combined: Symmetrically scale from center while strictly preserving aspect ratio.
 * - For edge handles ('n', 's', 'e', 'w'), perpendicular axis is locked strictly (unless Shift is active).
 */
export function calculateResizedBounds(
  initialBounds: TransformBounds,
  handle: HandleType,
  initialMouse: Point,
  currentMouse: Point,
  shiftKey: boolean,
  altKey: boolean
): {
  newBounds: TransformBounds;
  scaleX: number;
  scaleY: number;
  pivot: Point;
} {
  const { x: x0, y: y0, width: w0, height: h0, centerX, centerY, rotation } = initialBounds;

  // 1. Delta in canvas-space coordinates strictly from initialMouse position
  const rawDx = currentMouse.x - initialMouse.x;
  const rawDy = currentMouse.y - initialMouse.y;

  // Rotate delta into bounds' local coordinate space if rotation exists
  let deltaX = rawDx;
  let deltaY = rawDy;
  if (Math.abs(rotation) > 1e-6) {
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    deltaX = rawDx * cos - rawDy * sin;
    deltaY = rawDx * sin + rawDy * cos;
  }

  // 2. Compute delta changes for width and height based on handle and Alt (center scaling)
  let dw = 0;
  let dh = 0;
  const mult = altKey ? 2 : 1;

  switch (handle) {
    case 'se':
      dw = deltaX * mult;
      dh = deltaY * mult;
      break;
    case 'nw':
      dw = -deltaX * mult;
      dh = -deltaY * mult;
      break;
    case 'ne':
      dw = deltaX * mult;
      dh = -deltaY * mult;
      break;
    case 'sw':
      dw = -deltaX * mult;
      dh = deltaY * mult;
      break;
    case 'e':
      dw = deltaX * mult;
      dh = 0; // lock perpendicular axis strictly
      break;
    case 'w':
      dw = -deltaX * mult;
      dh = 0; // lock perpendicular axis strictly
      break;
    case 's':
      dw = 0; // lock perpendicular axis strictly
      dh = deltaY * mult;
      break;
    case 'n':
      dw = 0; // lock perpendicular axis strictly
      dh = -deltaY * mult;
      break;
  }

  let newW = Math.max(1, w0 + dw);
  let newH = Math.max(1, h0 + dh);

  // 3. Shift Key modifier: Constrain aspect ratio (initialBounds.w / initialBounds.h)
  const initialAspect = w0 / h0;
  if (shiftKey) {
    if (handle === 'e' || handle === 'w') {
      newH = newW / initialAspect;
    } else if (handle === 'n' || handle === 's') {
      newW = newH * initialAspect;
    } else {
      // Corner handles: preserve aspect ratio based on maximum proportional change
      const scale = Math.max(newW / w0, newH / h0);
      newW = w0 * scale;
      newH = h0 * scale;
    }
  }

  // 4. Compute new origin (newX, newY) and pivot anchor point
  let newX = x0;
  let newY = y0;
  let pivot: Point;

  if (altKey) {
    // Alt/Option Key: The anchor point becomes the geometric center (centerX, centerY).
    // Scaling expands or contracts equally in both directions from center.
    pivot = { x: centerX, y: centerY };
    newX = centerX - newW / 2;
    newY = centerY - newH / 2;
  } else {
    // Fixed opposite anchor point
    const fixedAnchor = getOppositeAnchor(initialBounds, handle);
    pivot = fixedAnchor;

    switch (handle) {
      case 'se':
        newX = fixedAnchor.x;
        newY = fixedAnchor.y;
        break;
      case 'nw':
        newX = fixedAnchor.x - newW;
        newY = fixedAnchor.y - newH;
        break;
      case 'ne':
        newX = fixedAnchor.x;
        newY = fixedAnchor.y - newH;
        break;
      case 'sw':
        newX = fixedAnchor.x - newW;
        newY = fixedAnchor.y;
        break;
      case 'e':
        newX = fixedAnchor.x;
        newY = shiftKey ? centerY - newH / 2 : y0;
        pivot = { x: fixedAnchor.x, y: shiftKey ? centerY : y0 };
        break;
      case 'w':
        newX = fixedAnchor.x - newW;
        newY = shiftKey ? centerY - newH / 2 : y0;
        pivot = { x: fixedAnchor.x, y: shiftKey ? centerY : y0 };
        break;
      case 's':
        newX = shiftKey ? centerX - newW / 2 : x0;
        newY = fixedAnchor.y;
        pivot = { x: shiftKey ? centerX : x0, y: fixedAnchor.y };
        break;
      case 'n':
        newX = shiftKey ? centerX - newW / 2 : x0;
        newY = fixedAnchor.y - newH;
        pivot = { x: shiftKey ? centerX : x0, y: fixedAnchor.y };
        break;
    }
  }

  const scaleX = newW / w0;
  const scaleY = newH / h0;

  const newBounds: TransformBounds = {
    x: newX,
    y: newY,
    width: newW,
    height: newH,
    rotation,
    centerX: newX + newW / 2,
    centerY: newY + newH / 2,
  };

  return { newBounds, scaleX, scaleY, pivot };
}

/**
 * Applies a scaling transformation to all selected elements relative to a pivot point
 */
export function applyScaleToElements(
  elements: VectorElement[],
  selectedIds: string[],
  pivot: Point,
  scaleX: number,
  scaleY: number
): VectorElement[] {
  return elements.map((el) => {
    if (!selectedIds.includes(el.id)) return el;
    return scaleElementWithPivot(el, pivot, scaleX, scaleY);
  });
}

/**
 * Applies a rotation transformation to all selected elements around a center point
 */
export function applyRotationToElements(
  elements: VectorElement[],
  selectedIds: string[],
  center: Point,
  deltaAngle: number,
  snap15Deg: boolean
): VectorElement[] {
  return elements.map((el) => {
    if (!selectedIds.includes(el.id)) return el;
    const rotated = rotateElement(el, center, deltaAngle, snap15Deg);
    const newRot = ((el.rotation || 0) + deltaAngle) % (Math.PI * 2);
    return { ...rotated, rotation: newRot };
  });
}
