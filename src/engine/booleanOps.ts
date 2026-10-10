import paper from 'paper';
import {
  VectorElement,
  PathElement,
  GroupElement,
  AnchorPoint,
  BaseVectorElement,
  PathfinderOp,
} from '../types/vector';

let isPaperInitialized = false;

/**
 * Initializes headless Paper.js project context
 */
function ensurePaper() {
  if (!isPaperInitialized) {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 2000;
      paper.setup(canvas);
    } else {
      paper.setup(new paper.Size(2000, 2000));
    }
    isPaperInitialized = true;
  }
}

/**
 * Converts a Forma VectorElement into a Paper.js Path or CompoundPath
 */
function elementToPaperPath(el: VectorElement): paper.PathItem {
  if (el.type === 'rectangle') {
    const rx = el.width < 0 ? el.x + el.width : el.x;
    const ry = el.height < 0 ? el.y + el.height : el.y;
    const rw = Math.max(1, Math.abs(el.width));
    const rh = Math.max(1, Math.abs(el.height));
    const p = new paper.Path.Rectangle(new paper.Rectangle(rx, ry, rw, rh));
    p.closed = true;
    return p;
  }

  if (el.type === 'ellipse') {
    const rx = Math.max(1, Math.abs(el.rx));
    const ry = Math.max(1, Math.abs(el.ry));
    const p = new paper.Path.Ellipse(
      new paper.Rectangle(el.cx - rx, el.cy - ry, rx * 2, ry * 2)
    );
    p.closed = true;
    return p;
  }

  if (el.type === 'path') {
    const p = new paper.Path();
    for (const pt of el.points) {
      const handleIn = pt.handleIn
        ? new paper.Point(pt.handleIn.x - pt.point.x, pt.handleIn.y - pt.point.y)
        : undefined;
      const handleOut = pt.handleOut
        ? new paper.Point(pt.handleOut.x - pt.point.x, pt.handleOut.y - pt.point.y)
        : undefined;
      p.add(new paper.Segment(new paper.Point(pt.point.x, pt.point.y), handleIn, handleOut));
    }
    p.closed = true; // Boolean operations require closed paths
    return p;
  }

  if (el.type === 'group') {
    const childrenItems = el.children.map(elementToPaperPath);
    if (childrenItems.length === 0) return new paper.Path();
    let combined = childrenItems[0];
    for (let i = 1; i < childrenItems.length; i++) {
      combined = combined.unite(childrenItems[i]);
    }
    return combined;
  }

  return new paper.Path();
}

/**
 * Converts a single Paper.js Path into a Forma PathElement
 */
function singlePaperPathToPathElement(
  p: paper.Path,
  baseStyle: Partial<BaseVectorElement>,
  name: string
): PathElement {
  const points: AnchorPoint[] = [];

  for (const seg of p.segments) {
    const pt = { x: Math.round(seg.point.x * 100) / 100, y: Math.round(seg.point.y * 100) / 100 };
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
      x: pt.x,
      y: pt.y,
      point: pt,
      handleIn: hIn,
      handleOut: hOut,
      pointType: hIn || hOut ? 'smooth' : 'corner',
      isCorner: !(hIn || hOut),
    });
  }

  return {
    id: `path_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    type: 'path',
    points,
    closed: true,
    fill: baseStyle.fill || '#3b82f6',
    fillType: baseStyle.fillType,
    gradient: baseStyle.gradient ? JSON.parse(JSON.stringify(baseStyle.gradient)) : undefined,
    stroke: baseStyle.stroke || '#ffffff',
    strokeWidth: baseStyle.strokeWidth ?? 2,
    strokeCap: baseStyle.strokeCap,
    strokeJoin: baseStyle.strokeJoin,
    strokeDashArray: baseStyle.strokeDashArray,
    opacity: baseStyle.opacity ?? 1,
    visible: true,
    locked: false,
  };
}

/**
 * Converts a Paper.js result (Path or CompoundPath) into a Forma VectorElement
 */
function paperItemToFormaElement(
  item: paper.PathItem,
  baseStyle: Partial<BaseVectorElement>,
  name: string
): VectorElement {
  if (item instanceof paper.CompoundPath) {
    const subPaths: PathElement[] = [];
    for (const child of item.children) {
      if (child instanceof paper.Path && child.segments.length > 0) {
        subPaths.push(singlePaperPathToPathElement(child, baseStyle, `${name} Part`));
      }
    }

    if (subPaths.length === 1) {
      return subPaths[0];
    }

    if (subPaths.length > 1) {
      return {
        id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        type: 'group',
        children: subPaths,
        fill: baseStyle.fill || '#3b82f6',
        fillType: baseStyle.fillType,
        gradient: baseStyle.gradient ? JSON.parse(JSON.stringify(baseStyle.gradient)) : undefined,
        stroke: baseStyle.stroke || '#ffffff',
        strokeWidth: baseStyle.strokeWidth ?? 2,
        strokeCap: baseStyle.strokeCap,
        strokeJoin: baseStyle.strokeJoin,
        strokeDashArray: baseStyle.strokeDashArray,
        opacity: baseStyle.opacity ?? 1,
        visible: true,
        locked: false,
      } as GroupElement;
    }
  } else if (item instanceof paper.Path) {
    return singlePaperPathToPathElement(item, baseStyle, name);
  }

  // Fallback empty path if nothing generated
  return {
    id: `path_${Date.now()}`,
    name,
    type: 'path',
    points: [],
    closed: true,
    fill: baseStyle.fill || '#3b82f6',
    stroke: baseStyle.stroke || '#ffffff',
    strokeWidth: baseStyle.strokeWidth ?? 2,
    opacity: baseStyle.opacity ?? 1,
    visible: true,
    locked: false,
  };
}

/**
 * Executes a 2D Boolean Pathfinder operation across selected elements
 */
export function applyBooleanOperation(
  elements: VectorElement[],
  selectedIds: string[],
  op: PathfinderOp
): { newElements: VectorElement[]; resultingId: string } | null {
  if (selectedIds.length < 2) return null;

  ensurePaper();

  // Find all selected elements in document order (z-index from bottom to top)
  const selectedElements: VectorElement[] = [];
  const selectedIndices: number[] = [];

  elements.forEach((el, index) => {
    if (selectedIds.includes(el.id)) {
      selectedElements.push(el);
      selectedIndices.push(index);
    }
  });

  if (selectedElements.length < 2) return null;

  try {
    // Convert elements to Paper.js PathItems
    const paperItems = selectedElements.map(elementToPaperPath);

    let resultItem: paper.PathItem;

    if (op === 'unite') {
      resultItem = paperItems[0];
      for (let i = 1; i < paperItems.length; i++) {
        const next = resultItem.unite(paperItems[i]);
        resultItem = next;
      }
    } else if (op === 'subtract') {
      // In Illustrator Minus Front: Bottom shape minus each front shape in order
      resultItem = paperItems[0];
      for (let i = 1; i < paperItems.length; i++) {
        const next = resultItem.subtract(paperItems[i]);
        resultItem = next;
      }
    } else if (op === 'intersect') {
      resultItem = paperItems[0];
      for (let i = 1; i < paperItems.length; i++) {
        const next = resultItem.intersect(paperItems[i]);
        resultItem = next;
      }
    } else if (op === 'exclude') {
      resultItem = paperItems[0];
      for (let i = 1; i < paperItems.length; i++) {
        const next = resultItem.exclude(paperItems[i]);
        resultItem = next;
      }
    } else {
      return null;
    }

    // Determine style inheritance:
    // Subtract inherits bottom shape styling; Unite/Intersect/Exclude inherit top shape styling
    const styleSource = op === 'subtract' ? selectedElements[0] : selectedElements[selectedElements.length - 1];

    const opNames: Record<PathfinderOp, string> = {
      unite: 'United Path',
      subtract: 'Subtracted Path',
      intersect: 'Intersected Path',
      exclude: 'Excluded Path',
    };

    const newElement = paperItemToFormaElement(
      resultItem,
      {
        fill: styleSource.fill,
        fillType: styleSource.fillType,
        gradient: styleSource.gradient,
        stroke: styleSource.stroke,
        strokeWidth: styleSource.strokeWidth,
        strokeCap: styleSource.strokeCap,
        strokeJoin: styleSource.strokeJoin,
        strokeDashArray: styleSource.strokeDashArray,
        opacity: styleSource.opacity,
      },
      opNames[op]
    );

    // Replace the selected elements in the document:
    // Place new element at the index of the first selected element
    const insertIndex = selectedIndices[0];
    const newElements: VectorElement[] = [];

    elements.forEach((el, idx) => {
      if (idx === insertIndex) {
        newElements.push(newElement);
      } else if (!selectedIds.includes(el.id)) {
        newElements.push(el);
      }
    });

    return {
      newElements,
      resultingId: newElement.id,
    };
  } catch (err) {
    console.error('Error applying boolean operation:', err);
    return null;
  } finally {
    // Clean up Paper.js internal project to prevent memory buildup
    paper.project?.clear();
  }
}
