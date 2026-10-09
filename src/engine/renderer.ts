import {
  VectorElement,
  PathElement,
  RectElement,
  EllipseElement,
  TextElement,
  ImageElement,
  Point,
  AnchorPoint,
  Artboard,
} from '../types/vector';
import { getElementBoundingBox, getHandlePositions, HandleType } from './transform';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  pan: Point;
  zoom: number;
  elements: VectorElement[];
  selectedId: string | null;
  activePenPath: PathElement | null;
  penMousePos: Point | null;
  isHoveringClosePoint: boolean;
  selectedAnchorIndex: number | null;
  showGrid?: boolean;
  artboard?: Artboard | null;
  isArtboardTool?: boolean;
}

/**
 * Main Canvas Render Function
 * Handles the complete visual pipeline:
 * 1. Background dot grid
 * 2. Vector shapes (paths, rects, ellipses) with fill/stroke/opacity
 * 3. Illustrator-style Bézier anchors and tangent control handles
 * 4. Pen tool rubber-band preview curve
 */
export function renderCanvas(rc: RenderContext) {
  const {
    ctx,
    width,
    height,
    pan,
    zoom,
    elements,
    selectedId,
    activePenPath,
    penMousePos,
    isHoveringClosePoint,
    selectedAnchorIndex,
    showGrid,
    artboard,
    isArtboardTool,
  } = rc;

  // Clear full canvas buffer
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  // 1. Draw subtle workspace grid (if enabled)
  if (showGrid !== false) {
    drawGrid(ctx, width, height, pan, zoom);
  }

  // Apply camera transform: Pan & Zoom
  ctx.save();
  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);

  // 1.5 Draw Artboard Surface & Dimension Label (if artboard is defined)
  if (artboard) {
    drawArtboard(ctx, artboard, zoom, isArtboardTool);
  }

  // 2. Draw committed elements
  for (const el of elements) {
    drawElement(ctx, el, el.id === selectedId);
  }

  // 3. Draw active pen path being drawn
  if (activePenPath) {
    drawPathElement(ctx, activePenPath);

    // Rubber-band preview to cursor
    if (penMousePos && activePenPath.points.length > 0) {
      drawRubberBand(ctx, activePenPath, penMousePos, isHoveringClosePoint);
    }

    // Draw active pen path's anchor points & handles
    drawPathGizmos(ctx, activePenPath, zoom, selectedAnchorIndex);
  }

  // 4. Draw selection overlays for the selected element
  if (selectedId && (!activePenPath || activePenPath.id !== selectedId)) {
    const selectedEl = elements.find((e) => e.id === selectedId);
    if (selectedEl) {
      drawInteractiveBoundingBox(ctx, selectedEl, zoom);
      if (selectedEl.type === 'path' && selectedAnchorIndex !== null) {
        drawPathGizmos(ctx, selectedEl, zoom, selectedAnchorIndex);
      }
      if (selectedEl.gradient) {
        drawGradientGizmos(ctx, selectedEl, zoom);
      }
    }
  }

  ctx.restore();
}

/**
 * Renders the elevated artboard canvas surface with drop shadow, border, and dimension label
 */
export function drawArtboard(
  ctx: CanvasRenderingContext2D,
  artboard: Artboard,
  zoom: number,
  isArtboardTool = false
) {
  ctx.save();

  // 1. Elevation shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = Math.max(16, 24 / zoom);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(4, 6 / zoom);

  // 2. Fill artboard surface
  if (artboard.backgroundColor && artboard.backgroundColor !== 'transparent') {
    ctx.fillStyle = artboard.backgroundColor;
    ctx.fillRect(artboard.x, artboard.y, artboard.width, artboard.height);
  } else {
    // Transparent checkerboard pattern
    ctx.fillStyle = '#1c1c20';
    ctx.fillRect(artboard.x, artboard.y, artboard.width, artboard.height);
    drawCheckerboard(ctx, artboard.x, artboard.y, artboard.width, artboard.height, zoom);
  }

  // 3. Reset shadow for outline
  ctx.shadowColor = 'transparent';

  if (isArtboardTool) {
    // Active Artboard Mode: Sky-blue bounding outline
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = Math.max(2, 2.5 / zoom);
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    ctx.strokeRect(artboard.x, artboard.y, artboard.width, artboard.height);
    ctx.setLineDash([]);

    // 8 Resize Handles (Corner & Edge Midpoints)
    const handleSize = Math.max(7, 9 / zoom);
    const halfH = handleSize / 2;
    const handles = [
      { x: artboard.x, y: artboard.y }, // nw
      { x: artboard.x + artboard.width / 2, y: artboard.y }, // n
      { x: artboard.x + artboard.width, y: artboard.y }, // ne
      { x: artboard.x + artboard.width, y: artboard.y + artboard.height / 2 }, // e
      { x: artboard.x + artboard.width, y: artboard.y + artboard.height }, // se
      { x: artboard.x + artboard.width / 2, y: artboard.y + artboard.height }, // s
      { x: artboard.x, y: artboard.y + artboard.height }, // sw
      { x: artboard.x, y: artboard.y + artboard.height / 2 }, // w
    ];

    for (const h of handles) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = Math.max(1.5, 2 / zoom);
      ctx.beginPath();
      ctx.rect(h.x - halfH, h.y - halfH, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    }

    // Prominent floating dimension badge with pill
    const fontSize = Math.max(11, Math.min(14, 12 / zoom));
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const label = `${artboard.name} • ${Math.round(artboard.width)} × ${Math.round(artboard.height)} ${artboard.unit || 'px'}`;
    const badgeWidth = ctx.measureText(label).width + 16 / zoom;
    const badgeHeight = Math.max(20, 24 / zoom);
    const badgeY = artboard.y - badgeHeight - 6 / zoom;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = Math.max(1, 1.5 / zoom);
    ctx.beginPath();
    ctx.roundRect(artboard.x, badgeY, badgeWidth, badgeHeight, 4 / zoom);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(label, artboard.x + 8 / zoom, badgeY + badgeHeight - 7 / zoom);
  } else {
    // Standard subtle artboard border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = Math.max(1, 1.2 / zoom);
    ctx.strokeRect(artboard.x, artboard.y, artboard.width, artboard.height);

    // 4. Subtle artboard label above top-left corner
    const fontSize = Math.max(10, Math.min(13, 11 / zoom));
    ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    const label = `${artboard.name} — ${Math.round(artboard.width)} × ${Math.round(artboard.height)} px`;
    ctx.fillText(label, artboard.x, artboard.y - Math.max(6, 8 / zoom));
  }

  ctx.restore();
}

/**
 * Draws a subtle transparency checkerboard pattern
 */
function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom: number
) {
  const checkSize = Math.max(12, 16 / zoom);
  ctx.fillStyle = '#26262b';
  for (let px = x; px < x + w; px += checkSize) {
    for (let py = y; py < y + h; py += checkSize) {
      if ((Math.floor((px - x) / checkSize) + Math.floor((py - y) / checkSize)) % 2 === 0) {
        const cw = Math.min(checkSize, x + w - px);
        const ch = Math.min(checkSize, y + h - py);
        ctx.fillRect(px, py, cw, ch);
      }
    }
  }
}

/**
 * Draws a dark-theme dot grid that aligns seamlessly with pan and zoom
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pan: Point,
  zoom: number
) {
  const baseSpacing = 32;
  const spacing = baseSpacing * zoom;
  
  // Fade grid if zoomed too far out
  if (spacing < 8) return;

  const startX = pan.x % spacing;
  const startY = pan.y % spacing;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  const dotSize = Math.max(1, Math.min(2, 1.2 * (zoom >= 1 ? 1 : zoom)));

  for (let x = startX; x < width; x += spacing) {
    for (let y = startY; y < height; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Origin crosshair (0,0 world coordinates)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pan.x - 10, pan.y);
  ctx.lineTo(pan.x + 10, pan.y);
  ctx.moveTo(pan.x, pan.y - 10);
  ctx.lineTo(pan.x, pan.y + 10);
  ctx.stroke();
}

/**
 * Dispatches drawing to specific vector types
 */
function drawElement(ctx: CanvasRenderingContext2D, el: VectorElement, isSelected: boolean) {
  // Skip invisible elements
  if (el.visible === false) return;

  ctx.save();
  ctx.globalAlpha = el.opacity;

  if (el.type === 'path') {
    drawPathElement(ctx, el);
  } else if (el.type === 'rectangle') {
    drawRectElement(ctx, el);
  } else if (el.type === 'ellipse') {
    drawEllipseElement(ctx, el);
  } else if (el.type === 'text') {
    drawTextElement(ctx, el);
  } else if (el.type === 'image') {
    drawImageElement(ctx, el);
  } else if (el.type === 'group') {
    for (const child of el.children) {
      drawElement(ctx, child, false);
    }
  }

  ctx.restore();
}

/**
 * Resolves the fill style (solid color, linear gradient, or radial gradient)
 */
export function getFillStyle(ctx: CanvasRenderingContext2D, el: VectorElement): string | CanvasGradient | null {
  if (el.fill === 'none') return null;

  if (el.gradient && (el.fillType === 'linear' || (!el.fillType && el.gradient.type === 'linear'))) {
    const box = getElementBoundingBox(el);
    const w = Math.max(1, box.width);
    const h = Math.max(1, box.height);
    const x1 = box.minX + el.gradient.startX * w;
    const y1 = box.minY + el.gradient.startY * h;
    const x2 = box.minX + el.gradient.endX * w;
    const y2 = box.minY + el.gradient.endY * h;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    for (const stop of el.gradient.stops) {
      grad.addColorStop(Math.max(0, Math.min(1, stop.offset)), stop.color);
    }
    return grad;
  }

  if (el.gradient && (el.fillType === 'radial' || (!el.fillType && el.gradient.type === 'radial'))) {
    const box = getElementBoundingBox(el);
    const w = Math.max(1, box.width);
    const h = Math.max(1, box.height);
    const x1 = box.minX + el.gradient.startX * w;
    const y1 = box.minY + el.gradient.startY * h;
    const x2 = box.minX + el.gradient.endX * w;
    const y2 = box.minY + el.gradient.endY * h;
    const radius = Math.max(5, Math.hypot(x2 - x1, y2 - y1));

    const grad = ctx.createRadialGradient(x1, y1, 0, x1, y1, radius);
    for (const stop of el.gradient.stops) {
      grad.addColorStop(Math.max(0, Math.min(1, stop.offset)), stop.color);
    }
    return grad;
  }

  return el.fill;
}

/**
 * Applies stroke styling including caps, joins, and dash arrays
 */
export function applyStrokeStyle(ctx: CanvasRenderingContext2D, el: VectorElement): boolean {
  if (!el.stroke || el.stroke === 'none' || el.strokeWidth <= 0) return false;

  ctx.strokeStyle = el.stroke;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = el.strokeCap || 'round';
  ctx.lineJoin = el.strokeJoin || 'round';

  if (el.strokeDashArray && el.strokeDashArray.length > 0) {
    ctx.setLineDash(el.strokeDashArray);
  } else {
    ctx.setLineDash([]);
  }

  return true;
}

/**
 * Constructs and renders a Bézier vector path
 */
export function drawPathElement(ctx: CanvasRenderingContext2D, path: PathElement) {
  if (path.points.length === 0) return;

  ctx.save();
  ctx.beginPath();

  const pts = path.points;
  ctx.moveTo(pts[0].point.x, pts[0].point.y);

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];

    const cp1 = prev.handleOut || prev.point;
    const cp2 = curr.handleIn || curr.point;

    if (!prev.handleOut && !curr.handleIn) {
      ctx.lineTo(curr.point.x, curr.point.y);
    } else {
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.point.x, curr.point.y);
    }
  }

  if (path.closed && pts.length > 1) {
    const last = pts[pts.length - 1];
    const first = pts[0];
    const cp1 = last.handleOut || last.point;
    const cp2 = first.handleIn || first.point;

    if (!last.handleOut && !first.handleIn) {
      ctx.closePath();
    } else {
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, first.point.x, first.point.y);
      ctx.closePath();
    }
  }

  // Fill
  const fillStyle = getFillStyle(ctx, path);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  // Stroke
  if (applyStrokeStyle(ctx, path)) {
    ctx.stroke();
  }

  ctx.restore();
}

function drawRectElement(ctx: CanvasRenderingContext2D, rect: RectElement) {
  ctx.save();
  ctx.beginPath();
  const radius = Math.min(
    Math.max(0, rect.cornerRadius || rect.rx || 0),
    Math.abs(rect.width) / 2,
    Math.abs(rect.height) / 2
  );
  if (radius > 0 && typeof ctx.roundRect === 'function') {
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
  } else {
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
  }

  const fillStyle = getFillStyle(ctx, rect);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  if (applyStrokeStyle(ctx, rect)) {
    ctx.stroke();
  }

  ctx.restore();
}

function drawEllipseElement(ctx: CanvasRenderingContext2D, ellipse: EllipseElement) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ellipse.cx, ellipse.cy, Math.abs(ellipse.rx), Math.abs(ellipse.ry), 0, 0, Math.PI * 2);

  const fillStyle = getFillStyle(ctx, ellipse);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  if (applyStrokeStyle(ctx, ellipse)) {
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Image Cache for raster/PSD/imported assets
 */
const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(src: string): HTMLImageElement | null {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return cached;
  }
  if (!cached) {
    const img = new Image();
    img.src = src;
    imageCache.set(src, img);
  }
  return null;
}

/**
 * Renders a crisp vector text element with typography properties
 */
function drawTextElement(ctx: CanvasRenderingContext2D, textEl: TextElement) {
  if (!textEl.text) return;

  ctx.save();
  const fontStyle = textEl.fontStyle || 'normal';
  const fontWeight = textEl.fontWeight || 400;
  const fontSize = textEl.fontSize || 24;
  const fontFamily = textEl.fontFamily || 'Inter, -apple-system, sans-serif';

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top';

  if (typeof (ctx as any).letterSpacing !== 'undefined' && textEl.letterSpacing) {
    (ctx as any).letterSpacing = `${textEl.letterSpacing}px`;
  }

  const lines = textEl.text.split('\n');
  const lineHeight = fontSize * (textEl.lineHeight || 1.2);
  const align = textEl.textAlign || 'left';
  const totalWidth = textEl.width || 0;

  ctx.textAlign = align === 'justify' ? 'left' : align;

  const fillStyle = getFillStyle(ctx, textEl);
  const hasStroke = applyStrokeStyle(ctx, textEl);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let lineX = textEl.x;
    if (align === 'center') {
      lineX = textEl.x + totalWidth / 2;
    } else if (align === 'right') {
      lineX = textEl.x + totalWidth;
    }
    const lineY = textEl.y + i * lineHeight;

    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fillText(line, lineX, lineY);
    }
    if (hasStroke) {
      ctx.strokeText(line, lineX, lineY);
    }
  }

  ctx.restore();
}

/**
 * Renders an Image element (from PNG, JPEG, SVG dataUrl, or PSD preview)
 */
function drawImageElement(ctx: CanvasRenderingContext2D, imgEl: ImageElement) {
  ctx.save();
  const img = getCachedImage(imgEl.src);
  if (img) {
    ctx.drawImage(img, imgEl.x, imgEl.y, imgEl.width, imgEl.height);
  } else {
    // Placeholder while image is decoding or loading
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(imgEl.x, imgEl.y, imgEl.width, imgEl.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(imgEl.x, imgEl.y, imgEl.width, imgEl.height);
  }

  if (applyStrokeStyle(ctx, imgEl)) {
    ctx.strokeRect(imgEl.x, imgEl.y, imgEl.width, imgEl.height);
  }
  ctx.restore();
}

/**
 * Draws the dynamic rubber-band preview segment connecting the last placed anchor to the mouse pointer
 */
function drawRubberBand(
  ctx: CanvasRenderingContext2D,
  path: PathElement,
  mousePos: Point,
  isClosing: boolean
) {
  const lastPoint = path.points[path.points.length - 1];
  const targetPoint = isClosing ? path.points[0].point : mousePos;

  ctx.save();
  ctx.strokeStyle = isClosing ? '#10b981' : '#38bdf8'; // emerald when closing, sky blue otherwise
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(lastPoint.point.x, lastPoint.point.y);

  if (lastPoint.handleOut) {
    // Render cubic Bézier preview curve using last anchor's outgoing handle
    ctx.bezierCurveTo(
      lastPoint.handleOut.x,
      lastPoint.handleOut.y,
      targetPoint.x,
      targetPoint.y,
      targetPoint.x,
      targetPoint.y
    );
  } else {
    // Straight preview line
    ctx.lineTo(targetPoint.x, targetPoint.y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Illustrator-style Bézier Gizmos:
 * - Square Anchor Points (hollow/solid)
 * - Round Tangent Handles
 * - Handle Connector Lines
 */
export function drawPathGizmos(
  ctx: CanvasRenderingContext2D,
  path: PathElement,
  zoom: number,
  selectedAnchorIndex: number | null
) {
  const pts = path.points;
  const anchorSize = Math.max(6, 8 / zoom);
  const handleDotRadius = Math.max(3.5, 4.5 / zoom);
  const lineWidth = Math.max(1, 1.2 / zoom);

  ctx.save();

  // 1. Draw Handle Lines and Handle Tips
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];

    // Out handle
    if (pt.handleOut) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)'; // cyan/sky
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(pt.point.x, pt.point.y);
      ctx.lineTo(pt.handleOut.x, pt.handleOut.y);
      ctx.stroke();

      // Handle tip dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(pt.handleOut.x, pt.handleOut.y, handleDotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    }

    // In handle
    if (pt.handleIn) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(pt.point.x, pt.point.y);
      ctx.lineTo(pt.handleIn.x, pt.handleIn.y);
      ctx.stroke();

      // Handle tip dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(pt.handleIn.x, pt.handleIn.y, handleDotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    }
  }

  // 2. Draw Anchor Point Squares
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    const isFirst = i === 0;
    const isSelected = selectedAnchorIndex === i;

    const x = pt.point.x - anchorSize / 2;
    const y = pt.point.y - anchorSize / 2;

    // Anchor border
    ctx.lineWidth = lineWidth * 1.5;
    ctx.strokeStyle = isFirst ? '#10b981' : isSelected ? '#f59e0b' : '#38bdf8';
    ctx.fillStyle = isSelected ? '#f59e0b' : '#18181b';

    ctx.fillRect(x, y, anchorSize, anchorSize);
    ctx.strokeRect(x, y, anchorSize, anchorSize);

    // Indicator ring for start point (to show closure target)
    if (isFirst && pts.length > 1 && !path.closed) {
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pt.point.x, pt.point.y, anchorSize * 1.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws the interactive 8-point bounding box with handles and rotation indicators
 */
export function drawInteractiveBoundingBox(
  ctx: CanvasRenderingContext2D,
  el: VectorElement,
  zoom: number
) {
  const box = getElementBoundingBox(el);
  const handles = getHandlePositions(box);
  const lineWidth = Math.max(1, 1.2 / zoom);
  const handleSize = Math.max(6, 7 / zoom);

  ctx.save();

  // 1. Bounding box border
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(box.minX, box.minY, box.width, box.height);

  // 2. Center Pivot Indicator
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(box.centerX, box.centerY, Math.max(2.5, 3 / zoom), 0, Math.PI * 2);
  ctx.fill();

  // Center crosshair
  const crossSize = Math.max(4, 5 / zoom);
  ctx.beginPath();
  ctx.moveTo(box.centerX - crossSize, box.centerY);
  ctx.lineTo(box.centerX + crossSize, box.centerY);
  ctx.moveTo(box.centerX, box.centerY - crossSize);
  ctx.lineTo(box.centerX, box.centerY + crossSize);
  ctx.stroke();

  // 3. Subtle corner rotation hints (small arcs outside corners)
  const rotOffset = Math.max(12, 14 / zoom);
  const cornerKeys: Array<'nw' | 'ne' | 'se' | 'sw'> = ['nw', 'ne', 'se', 'sw'];
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = Math.max(0.75, 1 / zoom);

  for (const ck of cornerKeys) {
    const pt = handles[ck];
    const dx = ck.includes('w') ? -rotOffset : rotOffset;
    const dy = ck.includes('n') ? -rotOffset : rotOffset;
    ctx.beginPath();
    ctx.arc(pt.x + dx * 0.4, pt.y + dy * 0.4, Math.max(3, 4 / zoom), 0, Math.PI * 2);
    ctx.stroke();
  }

  // 4. Render all 8 square handles (corners + edge centers)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = lineWidth * 1.3;

  const handleKeys: HandleType[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  for (const hk of handleKeys) {
    const pt = handles[hk];
    ctx.fillRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
  }

  ctx.restore();
}

/**
 * Renders an interactive gradient control vector on top of the selected element
 */
export function drawGradientGizmos(ctx: CanvasRenderingContext2D, el: VectorElement, zoom: number) {
  if (!el.gradient) return;

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

  const handleSize = Math.max(4.5, 6 / zoom);
  const stopSize = Math.max(3, 4.5 / zoom);

  ctx.save();

  // 1. Drop shadow / dark outline line
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.lineWidth = Math.max(2.5, 3.5 / zoom);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // 2. Cyan dashed gradient vector line
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = Math.max(1.2, 1.6 / zoom);
  ctx.setLineDash([Math.max(3, 4 / zoom), Math.max(2.5, 3 / zoom)]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // Radial outer radius ring
  if (el.gradient.type === 'radial') {
    const radius = Math.max(5, Math.hypot(p2.x - p1.x, p2.y - p1.y));
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = Math.max(1, 1.2 / zoom);
    ctx.setLineDash([Math.max(3, 4 / zoom), Math.max(3, 4 / zoom)]);
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // 3. Intermediate color stops along the line
  for (const stop of el.gradient.stops) {
    const px = p1.x + (p2.x - p1.x) * stop.offset;
    const py = p1.y + (p2.y - p1.y) * stop.offset;

    ctx.fillStyle = stop.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, 1.5 / zoom);
    ctx.beginPath();
    ctx.arc(px, py, stopSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 4. Start Handle P1 (Circular swatch with white ring & shadow)
  const firstColor = el.gradient.stops[0]?.color || '#ffffff';
  ctx.fillStyle = firstColor;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, 2 / zoom);
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, handleSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 5. End Handle P2 (Square swatch with white ring)
  const lastColor = el.gradient.stops[el.gradient.stops.length - 1]?.color || '#ffffff';
  ctx.fillStyle = lastColor;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, 2 / zoom);
  ctx.beginPath();
  ctx.rect(p2.x - handleSize, p2.y - handleSize, handleSize * 2, handleSize * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
