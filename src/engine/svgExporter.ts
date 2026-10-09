import {
  VectorElement,
  PathElement,
  RectElement,
  EllipseElement,
  Artboard,
  ExportMode,
} from '../types/vector';
import { getElementBoundingBox } from './transform';
import { nativeSaveSvg, nativeSavePng } from './nativeIo';

export interface ExportOptions {
  artboard?: Artboard | null;
  mode?: ExportMode;
}

/**
 * Calculates the bounding box enclosing all elements for proper SVG viewBox
 */
export function calculateDocumentBounds(elements: VectorElement[]): { minX: number; minY: number; width: number; height: number } {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (el.type === 'path') {
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
    } else if (el.type === 'rectangle') {
      minX = Math.min(minX, el.x, el.x + el.width);
      maxX = Math.max(maxX, el.x, el.x + el.width);
      minY = Math.min(minY, el.y, el.y + el.height);
      maxY = Math.max(maxY, el.y, el.y + el.height);
    } else if (el.type === 'ellipse') {
      minX = Math.min(minX, el.cx - Math.abs(el.rx));
      maxX = Math.max(maxX, el.cx + Math.abs(el.rx));
      minY = Math.min(minY, el.cy - Math.abs(el.ry));
      maxY = Math.max(maxY, el.cy + Math.abs(el.ry));
    } else if (el.type === 'group') {
      const childBounds = calculateDocumentBounds(el.children);
      minX = Math.min(minX, childBounds.minX);
      minY = Math.min(minY, childBounds.minY);
      maxX = Math.max(maxX, childBounds.minX + childBounds.width);
      maxY = Math.max(maxY, childBounds.minY + childBounds.height);
    } else if (el.type === 'text' || el.type === 'image') {
      const b = getElementBoundingBox(el);
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    }
  }

  const padding = 40;
  const w = Math.max(100, maxX - minX + padding * 2);
  const h = Math.max(100, maxY - minY + padding * 2);

  return {
    minX: minX - padding,
    minY: minY - padding,
    width: w,
    height: h,
  };
}

function collectGradients(elements: VectorElement[], defs: string[] = []): string[] {
  for (const el of elements) {
    if (el.gradient) {
      const gradId = `grad-${el.id}`;
      const stops = el.gradient.stops
        .map((s) => `      <stop offset="${(s.offset * 100).toFixed(1)}%" stop-color="${s.color}" />`)
        .join('\n');

      if (el.gradient.type === 'radial') {
        defs.push(
          `    <radialGradient id="${gradId}" cx="${(el.gradient.startX * 100).toFixed(1)}%" cy="${(el.gradient.startY * 100).toFixed(1)}%" r="50%" fx="${(el.gradient.startX * 100).toFixed(1)}%" fy="${(el.gradient.startY * 100).toFixed(1)}%">\n${stops}\n    </radialGradient>`
        );
      } else {
        defs.push(
          `    <linearGradient id="${gradId}" x1="${(el.gradient.startX * 100).toFixed(1)}%" y1="${(el.gradient.startY * 100).toFixed(1)}%" x2="${(el.gradient.endX * 100).toFixed(1)}%" y2="${(el.gradient.endY * 100).toFixed(1)}%">\n${stops}\n    </linearGradient>`
        );
      }
    }
    if (el.type === 'group') {
      collectGradients(el.children, defs);
    }
  }
  return defs;
}

/**
 * Converts a single vector element into SVG markup
 */
function elementToSvg(el: VectorElement): string {
  if (el.visible === false) return '';

  const opacityAttr = el.opacity < 1 ? ` opacity="${el.opacity.toFixed(2)}"` : '';
  const fillAttr = el.gradient
    ? `fill="url(#grad-${el.id})"`
    : `fill="${el.fill || 'none'}"`;

  const capAttr = el.strokeCap ? ` stroke-linecap="${el.strokeCap}"` : ' stroke-linecap="round"';
  const joinAttr = el.strokeJoin ? ` stroke-linejoin="${el.strokeJoin}"` : ' stroke-linejoin="round"';
  const dashAttr =
    el.strokeDashArray && el.strokeDashArray.length > 0
      ? ` stroke-dasharray="${el.strokeDashArray.join(' ')}"`
      : '';

  const strokeAttr =
    el.stroke && el.stroke !== 'none' && el.strokeWidth > 0
      ? `stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${capAttr}${joinAttr}${dashAttr}`
      : `stroke="none"`;

  if (el.type === 'path') {
    const d = pathDataFromElement(el);
    return `  <path d="${d}" ${fillAttr} ${strokeAttr}${opacityAttr} />`;
  } else if (el.type === 'rectangle') {
    const rx = el.width < 0 ? el.x + el.width : el.x;
    const ry = el.height < 0 ? el.y + el.height : el.y;
    const rw = Math.abs(el.width);
    const rh = Math.abs(el.height);
    return `  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" ${fillAttr} ${strokeAttr}${opacityAttr} />`;
  } else if (el.type === 'ellipse') {
    return `  <ellipse cx="${el.cx}" cy="${el.cy}" rx="${Math.abs(el.rx)}" ry="${Math.abs(el.ry)}" ${fillAttr} ${strokeAttr}${opacityAttr} />`;
  } else if (el.type === 'group') {
    const childrenSvg = el.children.map(elementToSvg).filter(Boolean).join('\n');
    return `  <g id="${el.id}"${opacityAttr}>\n${childrenSvg}\n  </g>`;
  } else if (el.type === 'text') {
    const lines = (el.text || '').split('\n');
    const lineHeight = (el.fontSize || 24) * (el.lineHeight || 1.2);
    let textAnchor = 'start';
    let textX = el.x;
    if (el.textAlign === 'center') {
      textAnchor = 'middle';
      textX = el.x + (el.width || 0) / 2;
    } else if (el.textAlign === 'right') {
      textAnchor = 'end';
      textX = el.x + (el.width || 0);
    }
    const letterSpacingAttr = el.letterSpacing ? ` letter-spacing="${el.letterSpacing}px"` : '';
    const fontStyleAttr = el.fontStyle && el.fontStyle !== 'normal' ? ` font-style="${el.fontStyle}"` : '';

    if (lines.length <= 1) {
      return `  <text x="${textX}" y="${el.y + el.fontSize * 0.85}" font-family="${el.fontFamily}" font-size="${el.fontSize}" font-weight="${el.fontWeight}" text-anchor="${textAnchor}"${fontStyleAttr}${letterSpacingAttr} ${fillAttr} ${strokeAttr}${opacityAttr}>${escapeXml(el.text)}</text>`;
    } else {
      const tspans = lines
        .map((line, idx) => {
          const dy = idx === 0 ? el.fontSize * 0.85 : lineHeight;
          return `    <tspan x="${textX}" dy="${dy}">${escapeXml(line)}</tspan>`;
        })
        .join('\n');
      return `  <text x="${textX}" y="${el.y}" font-family="${el.fontFamily}" font-size="${el.fontSize}" font-weight="${el.fontWeight}" text-anchor="${textAnchor}"${fontStyleAttr}${letterSpacingAttr} ${fillAttr} ${strokeAttr}${opacityAttr}>\n${tspans}\n  </text>`;
    }
  } else if (el.type === 'image') {
    return `  <image href="${el.src}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" preserveAspectRatio="none"${opacityAttr} />`;
  }
  return '';
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts vector elements into standards-compliant SVG XML
 */
export function exportToSvgString(elements: VectorElement[], options?: ExportOptions): string {
  const mode = options?.mode || (options?.artboard ? 'artboard' : 'design');
  const artboard = options?.artboard;

  let bounds: { minX: number; minY: number; width: number; height: number };
  let backgroundRect = '';

  if (mode === 'artboard' && artboard) {
    bounds = {
      minX: artboard.x,
      minY: artboard.y,
      width: artboard.width,
      height: artboard.height,
    };
    if (artboard.backgroundColor && artboard.backgroundColor !== 'transparent') {
      backgroundRect = `  <rect x="${artboard.x}" y="${artboard.y}" width="${artboard.width}" height="${artboard.height}" fill="${artboard.backgroundColor}" />\n`;
    }
  } else {
    bounds = calculateDocumentBounds(elements);
  }

  const defs = collectGradients(elements);
  const defsSvg = defs.length > 0 ? `  <defs>\n${defs.join('\n')}\n  </defs>\n` : '';
  const elementsSvg = elements.map(elementToSvg).filter(Boolean).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX.toFixed(2)} ${bounds.minY.toFixed(2)} ${bounds.width.toFixed(2)} ${bounds.height.toFixed(2)}" width="${bounds.width.toFixed(2)}" height="${bounds.height.toFixed(2)}">
${defsSvg}${backgroundRect}${elementsSvg}
</svg>`;
}

/**
 * Builds SVG 'd' path string from PathElement
 */
function pathDataFromElement(path: PathElement): string {
  const pts = path.points;
  if (pts.length === 0) return '';

  let d = `M ${pts[0].point.x.toFixed(2)} ${pts[0].point.y.toFixed(2)}`;

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cp1 = prev.handleOut || prev.point;
    const cp2 = curr.handleIn || curr.point;

    if (!prev.handleOut && !curr.handleIn) {
      d += ` L ${curr.point.x.toFixed(2)} ${curr.point.y.toFixed(2)}`;
    } else {
      d += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)}, ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)}, ${curr.point.x.toFixed(2)} ${curr.point.y.toFixed(2)}`;
    }
  }

  if (path.closed && pts.length > 1) {
    const last = pts[pts.length - 1];
    const first = pts[0];
    const cp1 = last.handleOut || last.point;
    const cp2 = first.handleIn || first.point;

    if (!last.handleOut && !first.handleIn) {
      d += ` Z`;
    } else {
      d += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)}, ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)}, ${first.point.x.toFixed(2)} ${first.point.y.toFixed(2)} Z`;
    }
  }

  return d;
}

/**
 * Prompts user download of the SVG file in the browser or desktop app
 */
export async function downloadSvgFile(
  elements: VectorElement[],
  filename = 'forma-vector-design.svg',
  options?: ExportOptions
): Promise<{ success: boolean; filePath?: string }> {
  const svgData = exportToSvgString(elements, options);
  return nativeSaveSvg(svgData, filename);
}

/**
 * Renders the vector document to a raster PNG and triggers native save / download
 */
export async function downloadPngFile(
  elements: VectorElement[],
  filename = 'forma-export.png',
  options?: ExportOptions
): Promise<{ success: boolean; filePath?: string }> {
  const mode = options?.mode || (options?.artboard ? 'artboard' : 'design');
  const artboard = options?.artboard;
  const bounds =
    mode === 'artboard' && artboard
      ? { minX: artboard.x, minY: artboard.y, width: artboard.width, height: artboard.height }
      : calculateDocumentBounds(elements);

  const svgData = exportToSvgString(elements, options);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const URLObj = window.URL || window.webkitURL || window;
  const blobUrl = URLObj.createObjectURL(svgBlob);

  return new Promise<{ success: boolean; filePath?: string }>((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const offscreen = document.createElement('canvas');
      const scale = 2; // High-resolution export (2x)
      offscreen.width = Math.max(100, bounds.width * scale);
      offscreen.height = Math.max(100, bounds.height * scale);
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        if (mode === 'artboard' && artboard?.backgroundColor && artboard.backgroundColor !== 'transparent') {
          ctx.fillStyle = artboard.backgroundColor;
          ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        }
        ctx.drawImage(img, 0, 0, offscreen.width, offscreen.height);
        offscreen.toBlob(async (pngBlob) => {
          URLObj.revokeObjectURL(blobUrl);
          if (pngBlob) {
            const res = await nativeSavePng(pngBlob, filename);
            resolve(res);
          } else {
            resolve({ success: false });
          }
        }, 'image/png');
      } else {
        URLObj.revokeObjectURL(blobUrl);
        resolve({ success: false });
      }
    };
    img.onerror = () => {
      URLObj.revokeObjectURL(blobUrl);
      resolve({ success: false });
    };
    img.src = blobUrl;
  });
}
