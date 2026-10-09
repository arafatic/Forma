import paper from 'paper';
import { readPsd, getCompositeCanvas } from 'ag-psd';
import {
  VectorElement,
  PathElement,
  GroupElement,
  ImageElement,
  TextElement,
  AnchorPoint,
  Point,
} from '../types/vector';
import { translateElement } from './transform';

let isPaperInitialized = false;

function ensurePaper() {
  if (!isPaperInitialized) {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 4000;
      canvas.height = 4000;
      paper.setup(canvas);
    } else {
      paper.setup(new paper.Size(4000, 4000));
    }
    isPaperInitialized = true;
  }
}

/**
 * Converts a Paper.js Path into a Forma PathElement
 */
function paperPathToFormaPath(p: paper.Path, fallbackName: string): PathElement {
  const points: AnchorPoint[] = [];

  for (const seg of p.segments) {
    const pt = {
      x: Math.round(seg.point.x * 100) / 100,
      y: Math.round(seg.point.y * 100) / 100,
    };
    const hIn =
      seg.handleIn && (Math.abs(seg.handleIn.x) > 0.01 || Math.abs(seg.handleIn.y) > 0.01)
        ? {
            x: Math.round((pt.x + seg.handleIn.x) * 100) / 100,
            y: Math.round((pt.y + seg.handleIn.y) * 100) / 100,
          }
        : null;
    const hOut =
      seg.handleOut && (Math.abs(seg.handleOut.x) > 0.01 || Math.abs(seg.handleOut.y) > 0.01)
        ? {
            x: Math.round((pt.x + seg.handleOut.x) * 100) / 100,
            y: Math.round((pt.y + seg.handleOut.y) * 100) / 100,
          }
        : null;

    points.push({
      point: pt,
      handleIn: hIn,
      handleOut: hOut,
    });
  }

  let fill = 'none';
  if (p.fillColor) {
    fill = p.fillColor.toCSS(true);
  }

  let stroke = 'none';
  if (p.strokeColor) {
    stroke = p.strokeColor.toCSS(true);
  }

  return {
    id: `path_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: p.name || fallbackName,
    type: 'path',
    points,
    closed: p.closed,
    fill,
    stroke,
    strokeWidth: p.strokeWidth ?? 1,
    opacity: p.opacity ?? 1,
    visible: p.visible !== false,
    locked: false,
  };
}

/**
 * Recursively converts a Paper.js Item hierarchy into Forma VectorElements
 */
function convertPaperItemToForma(item: paper.Item, index = 1): VectorElement | null {
  if (!item || !item.visible) return null;

  if (item instanceof paper.Path) {
    if (item.segments.length < 2) return null;
    return paperPathToFormaPath(item, `Path ${index}`);
  }

  if (item instanceof paper.CompoundPath) {
    const subPaths: PathElement[] = [];
    for (let i = 0; i < item.children.length; i++) {
      const child = item.children[i];
      if (child instanceof paper.Path && child.segments.length > 0) {
        subPaths.push(paperPathToFormaPath(child, `Path Part ${i + 1}`));
      }
    }
    if (subPaths.length === 1) return subPaths[0];
    if (subPaths.length > 1) {
      return {
        id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: item.name || `Compound Shape ${index}`,
        type: 'group',
        children: subPaths,
        opacity: item.opacity ?? 1,
        visible: true,
        locked: false,
        fill: item.fillColor ? item.fillColor.toCSS(true) : '#3b82f6',
        stroke: item.strokeColor ? item.strokeColor.toCSS(true) : 'none',
        strokeWidth: item.strokeWidth ?? 1,
      };
    }
  }

  if (item instanceof paper.Group) {
    const childrenElements: VectorElement[] = [];
    for (let i = 0; i < item.children.length; i++) {
      const el = convertPaperItemToForma(item.children[i], i + 1);
      if (el) childrenElements.push(el);
    }
    if (childrenElements.length === 0) return null;
    if (childrenElements.length === 1) return childrenElements[0];

    return {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: item.name || `Group ${index}`,
      type: 'group',
      children: childrenElements,
      opacity: item.opacity ?? 1,
      visible: true,
      locked: false,
      fill: 'none',
      stroke: 'none',
      strokeWidth: 0,
    };
  }

  return null;
}

/**
 * Parses SVG string into native editable Forma vector paths & shapes
 */
export async function parseSvgToElements(
  svgContent: string,
  targetPos?: Point
): Promise<VectorElement[]> {
  ensurePaper();

  const importedItem = paper.project.importSVG(svgContent);
  if (!importedItem) return [];

  const elements: VectorElement[] = [];

  if (importedItem instanceof paper.Group) {
    for (let i = 0; i < importedItem.children.length; i++) {
      const el = convertPaperItemToForma(importedItem.children[i], i + 1);
      if (el) elements.push(el);
    }
  } else {
    const el = convertPaperItemToForma(importedItem, 1);
    if (el) elements.push(el);
  }

  // Remove temporary item from paper project to free memory
  importedItem.remove();

  // If target position specified, translate elements to target position
  if (targetPos && elements.length > 0) {
    // calculate bounds of imported elements
    let minX = Infinity;
    let minY = Infinity;
    for (const el of elements) {
      if (el.type === 'path' && el.points.length > 0) {
        for (const pt of el.points) {
          minX = Math.min(minX, pt.point.x);
          minY = Math.min(minY, pt.point.y);
        }
      }
    }
    if (minX !== Infinity && minY !== Infinity) {
      const dx = targetPos.x - minX;
      const dy = targetPos.y - minY;
      return elements.map((el) => translateElement(el, dx, dy));
    }
  }

  return elements;
}

/**
 * Loads image from data URL and returns natural dimensions
 */
function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || 400, height: img.naturalHeight || 300 });
    };
    img.onerror = () => {
      resolve({ width: 400, height: 300 });
    };
    img.src = src;
  });
}

/**
 * Extracts embedded JPEG from an ArrayBuffer (standard in AI & EPS files)
 */
function extractEmbeddedJpeg(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;

  for (let i = 0; i < len - 4; i++) {
    // JPEG SOI marker: 0xFF, 0xD8, 0xFF
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      // Find EOI marker: 0xFF, 0xD9
      for (let j = i + 3; j < len - 1; j++) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          const jpegSlice = bytes.subarray(i, j + 2);
          if (jpegSlice.length > 1024) {
            // Found a valid JPEG thumbnail preview (> 1KB)
            const blob = new Blob([jpegSlice], { type: 'image/jpeg' });
            return URL.createObjectURL(blob);
          }
        }
      }
    }
  }
  return null;
}

/**
 * Master multi-format asset file importer.
 * Routes SVG, PNG, JPEG, WebP, GIF, PSD, AI, and EPS files into native Forma canvas elements.
 */
export async function importAssetFile(
  file: File,
  targetPosition?: Point
): Promise<VectorElement[]> {
  const fileName = file.name.toLowerCase();

  // 1. SVG Import -> Native editable Vector Paths
  if (fileName.endsWith('.svg') || file.type === 'image/svg+xml') {
    const text = await file.text();
    const elements = await parseSvgToElements(text, targetPosition);
    if (elements.length > 0) return elements;
  }

  // 2. Photoshop PSD Import -> High-fidelity composite raster preview with transparency
  if (fileName.endsWith('.psd') || file.type === 'image/vnd.adobe.photoshop') {
    try {
      const buffer = await file.arrayBuffer();
      const psd = readPsd(buffer);
      const canvas = psd.canvas || getCompositeCanvas(psd);
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const pos = targetPosition || { x: 100, y: 100 };
        const maxInitialDim = 1000;
        let w = canvas.width;
        let h = canvas.height;
        if (w > maxInitialDim || h > maxInitialDim) {
          const ratio = Math.min(maxInitialDim / w, maxInitialDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const imgEl: ImageElement = {
          id: `image_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'image',
          src: dataUrl,
          x: pos.x,
          y: pos.y,
          width: w,
          height: h,
          naturalWidth: canvas.width,
          naturalHeight: canvas.height,
          fill: 'none',
          stroke: 'none',
          strokeWidth: 0,
          opacity: 1,
          visible: true,
          locked: false,
        };
        return [imgEl];
      }
    } catch (err) {
      console.warn('PSD decoding failed:', err);
    }
  }

  // 3. Illustrator AI / EPS Import -> Composite preview or vector stream
  if (
    fileName.endsWith('.ai') ||
    fileName.endsWith('.eps') ||
    file.type === 'application/postscript' ||
    file.type === 'application/illustrator'
  ) {
    try {
      const buffer = await file.arrayBuffer();
      // Try extracting embedded thumbnail / preview JPEG
      const previewUrl = extractEmbeddedJpeg(buffer);
      if (previewUrl) {
        const dims = await loadImageDimensions(previewUrl);
        const pos = targetPosition || { x: 100, y: 100 };
        const imgEl: ImageElement = {
          id: `image_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'image',
          src: previewUrl,
          x: pos.x,
          y: pos.y,
          width: dims.width,
          height: dims.height,
          naturalWidth: dims.width,
          naturalHeight: dims.height,
          fill: 'none',
          stroke: 'none',
          strokeWidth: 0,
          opacity: 1,
          visible: true,
          locked: false,
        };
        return [imgEl];
      }
    } catch (err) {
      console.warn('AI/EPS preview extraction failed:', err);
    }
  }

  // 4. Standard Raster Images (PNG, JPEG, WebP, GIF, BMP)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve([]);
        return;
      }

      const dims = await loadImageDimensions(dataUrl);
      const pos = targetPosition || { x: 100, y: 100 };

      // Scale down overly large images for initial canvas placement
      const maxInitialDim = 1000;
      let w = dims.width;
      let h = dims.height;
      if (w > maxInitialDim || h > maxInitialDim) {
        const ratio = Math.min(maxInitialDim / w, maxInitialDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const imgEl: ImageElement = {
        id: `image_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: 'image',
        src: dataUrl,
        x: pos.x,
        y: pos.y,
        width: w,
        height: h,
        naturalWidth: dims.width,
        naturalHeight: dims.height,
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
        opacity: 1,
        visible: true,
        locked: false,
      };

      resolve([imgEl]);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
