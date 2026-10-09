import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  VectorElement,
  PathElement,
  Point,
  ToolType,
  ViewTransform,
  AnchorPoint,
  RectElement,
  EllipseElement,
  TextElement,
  Artboard,
} from '../types/vector';
import {
  snapTo45Degrees,
  getMirroredHandle,
  isNearFirstAnchor,
  distance,
} from '../engine/penTool';
import { renderCanvas } from '../engine/renderer';
import {
  getElementBoundingBox,
  hitTestBoundingBox,
  getTransformCursor,
  scaleElement,
  rotateElement,
  translateElement,
  hitTestGradientHandles,
  measureTextBounds,
  BoundingBox,
  HandleType,
} from '../engine/transform';

interface CanvasProps {
  currentTool: ToolType;
  elements: VectorElement[];
  selectedId: string | null;
  selectedIds?: string[];
  defaultFill: string;
  defaultStroke: string;
  defaultStrokeWidth: number;
  defaultOpacity: number;
  transform: ViewTransform;
  showGrid?: boolean;
  artboard?: Artboard | null;
  onTransformChange: (t: ViewTransform) => void;
  onElementsChange: (elements: VectorElement[]) => void;
  onSelectElement: (id: string | null, isShift?: boolean) => void;
  onImportAssets?: (files: FileList | File[], targetPos?: Point) => void;
}

export type ActiveTransform =
  | { type: 'translate'; startMouse: Point; origElement: VectorElement }
  | { type: 'scale'; handle: HandleType; originBox: BoundingBox; origElement: VectorElement }
  | { type: 'rotate'; center: Point; startAngle: number; origElement: VectorElement }
  | { type: 'gradient-start' | 'gradient-end'; origElement: VectorElement };

export const Canvas: React.FC<CanvasProps> = ({
  currentTool,
  elements,
  selectedId,
  defaultFill,
  defaultStroke,
  defaultStrokeWidth,
  defaultOpacity,
  transform,
  showGrid = true,
  artboard,
  onTransformChange,
  onElementsChange,
  onSelectElement,
  onImportAssets,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Text Tool Inline Editing State
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Asset Drag & Drop State
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Active Pen Tool State
  const [activePenPath, setActivePenPath] = useState<PathElement | null>(null);
  const [penMousePos, setPenMousePos] = useState<Point | null>(null);
  const [isHoveringClosePoint, setIsHoveringClosePoint] = useState<boolean>(false);
  const [isDraggingPenHandle, setIsDraggingPenHandle] = useState<boolean>(false);

  // Shape creation state (Rect, Ellipse)
  const [shapeStartPos, setShapeStartPos] = useState<Point | null>(null);
  const [activeShape, setActiveShape] = useState<RectElement | EllipseElement | null>(null);

  // Active Transformation State (Translate, Scale, Rotate)
  const [activeTransform, setActiveTransform] = useState<ActiveTransform | null>(null);
  const [hoverCursor, setHoverCursor] = useState<string | null>(null);

  // Pan state (Space+Drag or Middle Click)
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Coordinate conversion helpers
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      return {
        x: (screenX - transform.pan.x) / transform.zoom,
        y: (screenY - transform.pan.y) / transform.zoom,
      };
    },
    [transform.pan, transform.zoom]
  );

  // Commit current pen path
  const commitPenPath = useCallback(() => {
    if (activePenPath && activePenPath.points.length > 0) {
      onElementsChange([...elements, activePenPath]);
      onSelectElement(activePenPath.id);
    }
    setActivePenPath(null);
    setIsDraggingPenHandle(false);
  }, [activePenPath, elements, onElementsChange, onSelectElement]);

  // Handle keyboard shortcuts (Escape, Enter to commit path, Space for panning)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
      if (e.key === 'Escape' || e.key === 'Enter') {
        if (activePenPath) {
          commitPenPath();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activePenPath, commitPenPath]);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Merge active shape being drawn with elements for rendering
    const allElements = activeShape ? [...elements, activeShape] : elements;

    renderCanvas({
      ctx,
      width,
      height,
      pan: transform.pan,
      zoom: transform.zoom,
      elements: allElements,
      selectedId,
      activePenPath,
      penMousePos,
      isHoveringClosePoint,
      selectedAnchorIndex: null,
      showGrid,
      artboard,
    });

    ctx.restore();
  }, [
    elements,
    transform,
    selectedId,
    activePenPath,
    penMousePos,
    isHoveringClosePoint,
    activeShape,
    showGrid,
    artboard,
  ]);

  // Resize observer to ensure crisp canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // -------------------------------------------------------------
  // Mouse Event Handlers
  // -------------------------------------------------------------

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom factor: smooth exponential scaling
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.909;
    const newZoom = Math.min(Math.max(transform.zoom * zoomFactor, 0.05), 32);

    // Keep mouse pointer invariant in world coordinates
    const newPan = {
      x: mouseX - (mouseX - transform.pan.x) * (newZoom / transform.zoom),
      y: mouseY - (mouseY - transform.pan.y) * (newZoom / transform.zoom),
    };

    onTransformChange({ pan: newPan, zoom: newZoom });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    // 1. Pan Canvas (Middle mouse button OR Space + Left click)
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.pan.x, y: e.clientY - transform.pan.y });
      return;
    }

    if (e.button !== 0) return; // Only process left click below

    // -----------------------------------------------------------
    // TOOL: PEN TOOL (Core Illustrator-style Bézier engine)
    // -----------------------------------------------------------
    if (currentTool === 'pen') {
      // Check if clicking near the starting anchor point to close the path
      if (activePenPath && isNearFirstAnchor(worldPos, activePenPath, transform.zoom)) {
        const closedPath: PathElement = {
          ...activePenPath,
          closed: true,
        };
        onElementsChange([...elements, closedPath]);
        onSelectElement(closedPath.id);
        setActivePenPath(null);
        setIsDraggingPenHandle(false);
        setIsHoveringClosePoint(false);
        return;
      }

      // Check modifier keys: Shift for 45 deg snap
      let anchorPos = worldPos;
      if (e.shiftKey && activePenPath && activePenPath.points.length > 0) {
        const lastAnchor = activePenPath.points[activePenPath.points.length - 1].point;
        anchorPos = snapTo45Degrees(lastAnchor, worldPos);
      }

      const newAnchor: AnchorPoint = {
        point: anchorPos,
        handleIn: null,
        handleOut: null,
        isCorner: e.altKey,
      };

      if (!activePenPath) {
        // Start brand new path
        const newPath: PathElement = {
          id: `path_${Date.now()}`,
          type: 'path',
          points: [newAnchor],
          closed: false,
          fill: defaultFill,
          stroke: defaultStroke,
          strokeWidth: defaultStrokeWidth,
          opacity: defaultOpacity,
        };
        setActivePenPath(newPath);
      } else {
        // Append anchor to current active path
        const updatedPoints = [...activePenPath.points, newAnchor];
        setActivePenPath({
          ...activePenPath,
          points: updatedPoints,
        });
      }

      setIsDraggingPenHandle(true);
      return;
    }

    // -----------------------------------------------------------
    // TOOL: RECTANGLE & ELLIPSE TOOLS
    // -----------------------------------------------------------
    if (currentTool === 'rectangle' || currentTool === 'ellipse') {
      setShapeStartPos(worldPos);
      if (currentTool === 'rectangle') {
        setActiveShape({
          id: `rect_${Date.now()}`,
          type: 'rectangle',
          x: worldPos.x,
          y: worldPos.y,
          width: 0,
          height: 0,
          fill: defaultFill,
          stroke: defaultStroke,
          strokeWidth: defaultStrokeWidth,
          opacity: defaultOpacity,
        });
      } else {
        setActiveShape({
          id: `ellipse_${Date.now()}`,
          type: 'ellipse',
          cx: worldPos.x,
          cy: worldPos.y,
          rx: 0,
          ry: 0,
          fill: defaultFill,
          stroke: defaultStroke,
          strokeWidth: defaultStrokeWidth,
          opacity: defaultOpacity,
        });
      }
      return;
    }

    // -----------------------------------------------------------
    // TOOL: TEXT TOOL (T)
    // -----------------------------------------------------------
    if (currentTool === 'text') {
      const defaultText = 'Heading';
      const initialMetrics = measureTextBounds(defaultText, 'Inter, sans-serif', 28, 400, 1.2);
      const newText: TextElement = {
        id: `text_${Date.now()}`,
        name: 'Text',
        type: 'text',
        text: defaultText,
        x: Math.round(worldPos.x),
        y: Math.round(worldPos.y),
        width: initialMetrics.width,
        height: initialMetrics.height,
        fontFamily: 'Inter, sans-serif',
        fontSize: 28,
        fontWeight: 400,
        textAlign: 'left',
        lineHeight: 1.2,
        fill: defaultFill === 'none' ? '#ffffff' : defaultFill,
        stroke: 'none',
        strokeWidth: 0,
        opacity: defaultOpacity,
        visible: true,
        locked: false,
      };

      onElementsChange([...elements, newText]);
      onSelectElement(newText.id);
      setEditingTextId(newText.id);
      return;
    }

    // -----------------------------------------------------------
    // TOOL: SELECT TOOL (8-Point Bounding Box, Scaling, Rotating, Translating)
    // -----------------------------------------------------------
    if (currentTool === 'select') {
      // 0. If selected element has gradient, test gradient handle hit
      const selectedEl = elements.find((el) => el.id === selectedId);
      if (selectedEl) {
        if (selectedEl.gradient) {
          const gradHit = hitTestGradientHandles(worldPos, selectedEl, transform.zoom);
          if (gradHit) {
            setActiveTransform({
              type: gradHit,
              origElement: { ...selectedEl },
            });
            return;
          }
        }

        // 1. If an element is already selected, test its bounding box handles & rotation
        const box = getElementBoundingBox(selectedEl);
        const hit = hitTestBoundingBox(worldPos, box, transform.zoom);

        if (hit) {
          if (hit.type === 'handle') {
            setActiveTransform({
              type: 'scale',
              handle: hit.handle,
              originBox: box,
              origElement: { ...selectedEl },
            });
            return;
          }

          if (hit.type === 'rotate') {
            const startAngle = Math.atan2(worldPos.y - box.centerY, worldPos.x - box.centerX);
            setActiveTransform({
              type: 'rotate',
              center: { x: box.centerX, y: box.centerY },
              startAngle,
              origElement: { ...selectedEl },
            });
            return;
          }

          if (hit.type === 'body') {
            setActiveTransform({
              type: 'translate',
              startMouse: worldPos,
              origElement: { ...selectedEl },
            });
            return;
          }
        }
      }

      // 2. Element hit test across all elements (reverse order for topmost)
      let foundId: string | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (isPointInsideElement(worldPos, el, transform.zoom)) {
          foundId = el.id;
          break;
        }
      }

      // Select element or deselect if clicked on empty canvas (with Shift for multi-select)
      onSelectElement(foundId, e.shiftKey);

      if (foundId) {
        const hitEl = elements.find((el) => el.id === foundId)!;
        setActiveTransform({
          type: 'translate',
          startMouse: worldPos,
          origElement: { ...hitEl },
        });
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    // Double click on a Text element enters inline editing mode
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === 'text' && isPointInsideElement(worldPos, el, transform.zoom)) {
        onSelectElement(el.id, false);
        setEditingTextId(el.id);
        return;
      }
    }

    // Group isolation mode: double clicking inside a group drills down to select child item
    const selectedEl = elements.find((el) => el.id === selectedId);
    if (selectedEl && selectedEl.type === 'group') {
      for (let i = selectedEl.children.length - 1; i >= 0; i--) {
        const child = selectedEl.children[i];
        if (isPointInsideElement(worldPos, child, transform.zoom)) {
          onSelectElement(child.id, false);
          return;
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    // 1. Panning canvas
    if (isPanning) {
      onTransformChange({
        pan: { x: e.clientX - panStart.x, y: e.clientY - panStart.y },
        zoom: transform.zoom,
      });
      return;
    }

    // 2. Pen Tool: Pulling out Bézier handles while dragging
    if (currentTool === 'pen') {
      setPenMousePos(worldPos);

      // Check start anchor closing hover indicator
      if (activePenPath) {
        const nearFirst = isNearFirstAnchor(worldPos, activePenPath, transform.zoom);
        setIsHoveringClosePoint(nearFirst);
      }

      if (isDraggingPenHandle && activePenPath && activePenPath.points.length > 0) {
        const lastIdx = activePenPath.points.length - 1;
        const currentAnchor = activePenPath.points[lastIdx];

        let handlePos = worldPos;
        // Shift modifier: snap handle to 45 degree angle
        if (e.shiftKey) {
          handlePos = snapTo45Degrees(currentAnchor.point, worldPos);
        }

        const isAlt = e.altKey; // Alt/Option breaks symmetry
        const handleOut = handlePos;
        const handleIn = isAlt
          ? currentAnchor.handleIn // Leave opposite handle untouched if Alt held
          : getMirroredHandle(currentAnchor.point, handleOut); // Symmetrical opposite

        const updatedPoints = [...activePenPath.points];
        updatedPoints[lastIdx] = {
          ...currentAnchor,
          handleOut,
          handleIn,
          isCorner: isAlt,
        };

        setActivePenPath({
          ...activePenPath,
          points: updatedPoints,
        });
      }
      return;
    }

    // 3. Shape Dragging (Rectangle / Ellipse)
    if (shapeStartPos && activeShape) {
      let dx = worldPos.x - shapeStartPos.x;
      let dy = worldPos.y - shapeStartPos.y;

      // Shift key constrains aspect ratio to 1:1
      if (e.shiftKey) {
        const maxDist = Math.max(Math.abs(dx), Math.abs(dy));
        dx = Math.sign(dx) * maxDist;
        dy = Math.sign(dy) * maxDist;
      }

      if (activeShape.type === 'rectangle') {
        setActiveShape({
          ...activeShape,
          x: dx >= 0 ? shapeStartPos.x : shapeStartPos.x + dx,
          y: dy >= 0 ? shapeStartPos.y : shapeStartPos.y + dy,
          width: Math.abs(dx),
          height: Math.abs(dy),
        });
      } else if (activeShape.type === 'ellipse') {
        setActiveShape({
          ...activeShape,
          cx: shapeStartPos.x + dx / 2,
          cy: shapeStartPos.y + dy / 2,
          rx: Math.abs(dx / 2),
          ry: Math.abs(dy / 2),
        });
      }
      return;
    }

    // 4. Select Tool Transformations (Translating, Scaling, Rotating)
    if (currentTool === 'select') {
      if (activeTransform) {
        if (activeTransform.type === 'translate') {
          const dx = worldPos.x - activeTransform.startMouse.x;
          const dy = worldPos.y - activeTransform.startMouse.y;
          const orig = activeTransform.origElement;
          const translated = translateElement(orig, dx, dy);
          const updated = elements.map((el) => (el.id === orig.id ? translated : el));
          onElementsChange(updated);
        } else if (activeTransform.type === 'scale') {
          const scaled = scaleElement(
            activeTransform.origElement,
            activeTransform.handle,
            activeTransform.originBox,
            worldPos,
            e.shiftKey
          );
          const updated = elements.map((el) => (el.id === scaled.id ? scaled : el));
          onElementsChange(updated);
        } else if (activeTransform.type === 'rotate') {
          const currentAngle = Math.atan2(
            worldPos.y - activeTransform.center.y,
            worldPos.x - activeTransform.center.x
          );
          const deltaAngle = currentAngle - activeTransform.startAngle;
          const rotated = rotateElement(
            activeTransform.origElement,
            activeTransform.center,
            deltaAngle,
            e.shiftKey
          );
          const updated = elements.map((el) => (el.id === rotated.id ? rotated : el));
          onElementsChange(updated);
        } else if (activeTransform.type === 'gradient-start' || activeTransform.type === 'gradient-end') {
          const orig = activeTransform.origElement;
          if (orig.gradient) {
            const box = getElementBoundingBox(orig);
            const w = Math.max(1, box.width);
            const h = Math.max(1, box.height);
            const normX = Math.round(((worldPos.x - box.minX) / w) * 100) / 100;
            const normY = Math.round(((worldPos.y - box.minY) / h) * 100) / 100;

            const updatedGrad = {
              ...orig.gradient,
              ...(activeTransform.type === 'gradient-start'
                ? { startX: normX, startY: normY }
                : { endX: normX, endY: normY }),
            };
            const updated = elements.map((el) =>
              el.id === orig.id ? { ...el, gradient: updatedGrad } : el
            );
            onElementsChange(updated);
          }
        }
        return;
      }

      // Hover cursor feedback when not actively dragging
      const selectedEl = elements.find((el) => el.id === selectedId);
      if (selectedEl) {
        if (selectedEl.gradient) {
          const gradHit = hitTestGradientHandles(worldPos, selectedEl, transform.zoom);
          if (gradHit) {
            setHoverCursor('crosshair');
            return;
          }
        }
        const box = getElementBoundingBox(selectedEl);
        const hit = hitTestBoundingBox(worldPos, box, transform.zoom);
        setHoverCursor(getTransformCursor(hit));
      } else {
        setHoverCursor(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);

    if (currentTool === 'pen') {
      setIsDraggingPenHandle(false);
    }

    if (shapeStartPos && activeShape) {
      if (
        (activeShape.type === 'rectangle' && (activeShape.width > 2 || activeShape.height > 2)) ||
        (activeShape.type === 'ellipse' && (activeShape.rx > 1 || activeShape.ry > 1))
      ) {
        onElementsChange([...elements, activeShape]);
        onSelectElement(activeShape.id);
      }
      setShapeStartPos(null);
      setActiveShape(null);
    }

    if (activeTransform) {
      setActiveTransform(null);
    }
  };

  // Cursor style based on active tool, transformation, and hover zone
  const getCursorStyle = (): React.CSSProperties => {
    if (isPanning || isSpacePressed) return { cursor: 'grab' };
    if (activeTransform?.type === 'rotate') {
      return {
        cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/%3E%3Cpolyline points='21 3 21 8 16 8'/%3E%3C/svg%3E") 12 12, crosshair`,
      };
    }
    if (activeTransform?.type === 'translate') return { cursor: 'move' };
    if (hoverCursor) return { cursor: hoverCursor };

    if (currentTool === 'pen') return { cursor: isHoveringClosePoint ? 'cell' : 'crosshair' };
    if (currentTool === 'rectangle' || currentTool === 'ellipse') return { cursor: 'crosshair' };
    if (currentTool === 'text') return { cursor: 'text' };
    return { cursor: 'default' };
  };

  const editingTextEl = editingTextId
    ? (elements.find((e) => e.id === editingTextId && e.type === 'text') as TextElement | undefined)
    : undefined;

  return (
    <main
      className="relative flex-1 h-full w-full overflow-hidden bg-[#121214]"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onImportAssets) {
          const rect = canvasRef.current?.getBoundingClientRect();
          const worldPos = rect
            ? screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
            : undefined;
          onImportAssets(e.dataTransfer.files, worldPos);
        }
      }}
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={getCursorStyle()}
        className="w-full h-full block"
      />

      {/* Inline Textarea Overlay when editing TextElement */}
      {editingTextEl && (
        <textarea
          autoFocus
          value={editingTextEl.text}
          onChange={(e) => {
            const newText = e.target.value;
            const metrics = measureTextBounds(
              newText,
              editingTextEl.fontFamily,
              editingTextEl.fontSize,
              editingTextEl.fontWeight,
              editingTextEl.lineHeight
            );
            const updated = elements.map((el) =>
              el.id === editingTextEl.id
                ? {
                    ...el,
                    text: newText,
                    width: metrics.width,
                    height: metrics.height,
                  }
                : el
            );
            onElementsChange(updated);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditingTextId(null);
            }
          }}
          onBlur={() => {
            setEditingTextId(null);
          }}
          style={{
            position: 'absolute',
            left: `${transform.pan.x + editingTextEl.x * transform.zoom - 4}px`,
            top: `${transform.pan.y + editingTextEl.y * transform.zoom - 2}px`,
            fontSize: `${editingTextEl.fontSize * transform.zoom}px`,
            fontFamily: editingTextEl.fontFamily,
            fontWeight: editingTextEl.fontWeight,
            lineHeight: editingTextEl.lineHeight || 1.2,
            letterSpacing: `${(editingTextEl.letterSpacing || 0) * transform.zoom}px`,
            color: editingTextEl.fill === 'none' ? '#ffffff' : editingTextEl.fill,
            textAlign: editingTextEl.textAlign === 'justify' ? 'left' : editingTextEl.textAlign,
            background: 'rgba(18, 18, 20, 0.92)',
            border: '1.5px solid #38bdf8',
            borderRadius: '4px',
            padding: '2px 6px',
            outline: 'none',
            minWidth: `${Math.max(60, (editingTextEl.width || 60) * transform.zoom + 20)}px`,
            minHeight: `${Math.max(30, (editingTextEl.height || 30) * transform.zoom + 8)}px`,
            zIndex: 40,
            boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)',
            overflow: 'hidden',
          }}
        />
      )}

      {/* Drag & Drop Visual Drop Zone Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 pointer-events-none bg-sky-950/25 backdrop-blur-[2px] border-2 border-dashed border-sky-400 flex flex-col items-center justify-center gap-2 text-sky-200">
          <div className="p-3 rounded-full bg-sky-500/20 border border-sky-400/40 animate-pulse">
            <svg className="w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide">Drop vector or image files to place on canvas</span>
          <span className="text-xs text-zinc-400">Supported: SVG, PNG, JPG, WebP, PSD, AI, EPS</span>
        </div>
      )}
    </main>
  );
};

/**
 * Basic hit testing helper for selecting elements
 */
function isPointInsideElement(point: Point, el: VectorElement, zoom: number): boolean {
  // Locked or hidden elements cannot be selected on canvas
  if (el.visible === false || el.locked === true) return false;

  const pad = 8 / zoom;

  if (el.type === 'rectangle') {
    const minX = Math.min(el.x, el.x + el.width) - pad;
    const maxX = Math.max(el.x, el.x + el.width) + pad;
    const minY = Math.min(el.y, el.y + el.height) - pad;
    const maxY = Math.max(el.y, el.y + el.height) + pad;
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }

  if (el.type === 'ellipse') {
    const dx = point.x - el.cx;
    const dy = point.y - el.cy;
    const rx = Math.abs(el.rx) + pad;
    const ry = Math.abs(el.ry) + pad;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  if (el.type === 'path') {
    for (const pt of el.points) {
      if (distance(point, pt.point) <= pad) return true;
    }
    // Bounding box test
    const box = getElementBoundingBox(el);
    return (
      point.x >= box.minX - pad &&
      point.x <= box.maxX + pad &&
      point.y >= box.minY - pad &&
      point.y <= box.maxY + pad
    );
  }

  if (el.type === 'text' || el.type === 'image') {
    const box = getElementBoundingBox(el);
    return (
      point.x >= box.minX - pad &&
      point.x <= box.maxX + pad &&
      point.y >= box.minY - pad &&
      point.y <= box.maxY + pad
    );
  }

  if (el.type === 'group') {
    for (const child of el.children) {
      if (isPointInsideElement(point, child, zoom)) return true;
    }
    return false;
  }

  return false;
}
