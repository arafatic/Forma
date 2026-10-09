import { Point, AnchorPoint, PathElement } from '../types/vector';

/**
 * Calculates Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Constrains a target point to 45-degree angle increments from an origin point
 * Used when the user holds Shift while dragging handles or placing points
 */
export function snapTo45Degrees(origin: Point, target: Point): Point {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { ...target };

  const angle = Math.atan2(dy, dx);
  // 45 degrees in radians is Math.PI / 4
  const step = Math.PI / 4;
  const snappedAngle = Math.round(angle / step) * step;

  return {
    x: origin.x + dist * Math.cos(snappedAngle),
    y: origin.y + dist * Math.sin(snappedAngle),
  };
}

/**
 * Calculates the symmetric opposite handle around an anchor point:
 * opposite = anchor - (handle - anchor) = 2 * anchor - handle
 */
export function getMirroredHandle(anchor: Point, handle: Point): Point {
  return {
    x: anchor.x - (handle.x - anchor.x),
    y: anchor.y - (handle.y - anchor.y),
  };
}

/**
 * State machine and operations for active Pen tool interaction
 */
export interface PenToolState {
  currentPath: PathElement | null;
  dragAnchorIndex: number | null;
  isDraggingHandle: boolean;
  mouseWorldPos: Point | null;
  isAltPressed: boolean;
  isShiftPressed: boolean;
  hoveringStartAnchor: boolean;
}

export function createInitialPenState(): PenToolState {
  return {
    currentPath: null,
    dragAnchorIndex: null,
    isDraggingHandle: false,
    mouseWorldPos: null,
    isAltPressed: false,
    isShiftPressed: false,
    hoveringStartAnchor: false,
  };
}

/**
 * Distance threshold in screen pixels to snap to the first anchor to close path
 */
export const CLOSE_SNAP_THRESHOLD = 12;

/**
 * Checks if mouse is hovering within closing proximity of the path's starting point
 */
export function isNearFirstAnchor(
  pos: Point,
  path: PathElement | null,
  zoom: number
): boolean {
  if (!path || path.points.length < 2) return false;
  const firstPoint = path.points[0].point;
  const d = distance(pos, firstPoint);
  // Screen distance = d * zoom
  return d * zoom <= CLOSE_SNAP_THRESHOLD;
}
