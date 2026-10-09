import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { RightSidebar, RightDockTab } from './components/RightSidebar';
import { NewDocumentModal } from './components/NewDocumentModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  VectorElement,
  RectElement,
  ToolType,
  ViewTransform,
  PathElement,
  PathfinderOp,
  FillType,
  GradientFill,
  StrokeCap,
  StrokeJoin,
  Artboard,
  ExportMode,
  Point,
  TextAlign,
  DrawingMode,
} from './types/vector';
import { downloadSvgFile, downloadPngFile } from './engine/svgExporter';
import { applyBooleanOperation } from './engine/booleanOps';
import { importAssetFile } from './engine/assetImporter';
import { isTauriApp, nativeOpenAssets } from './engine/nativeIo';
import { measureTextBounds, translateElement, getElementBoundingBox, rotateElement } from './engine/transform';

// Default artboard setup (1200x800 white canvas)
const DEFAULT_ARTBOARD: Artboard = {
  id: 'artboard-default',
  name: 'Artboard 1',
  x: -600,
  y: -400,
  width: 1200,
  height: 800,
  backgroundColor: '#ffffff',
  unit: 'px',
};
import {
  groupElements,
  ungroupElement,
  bringForward,
  bringToFront,
  sendBackward,
  sendToBack,
  reorderLayers,
  toggleLayerVisibility,
  toggleLayerLock,
  renameLayer,
} from './engine/layers';

// Initial demo illustration showcasing Bézier math capabilities right out of the box
const INITIAL_ELEMENTS: VectorElement[] = [
  {
    id: 'demo-curve',
    name: 'S-Curve Demo',
    type: 'path',
    points: [
      {
        point: { x: -140, y: 50 },
        handleIn: null,
        handleOut: { x: -90, y: -70 },
      },
      {
        point: { x: 0, y: -30 },
        handleIn: { x: -60, y: -70 },
        handleOut: { x: 60, y: 10 },
      },
      {
        point: { x: 140, y: 50 },
        handleIn: { x: 90, y: 100 },
        handleOut: null,
      },
    ],
    closed: false,
    fill: 'none',
    stroke: '#38bdf8',
    strokeWidth: 3,
    opacity: 1,
    visible: true,
    locked: false,
  },
];

export const App: React.FC = () => {
  const [elements, setElements] = useState<VectorElement[]>(INITIAL_ELEMENTS);
  const [selectedIds, setSelectedIds] = useState<string[]>(['demo-curve']);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');

  // History stack for Undo/Redo
  const [history, setHistory] = useState<VectorElement[][]>([INITIAL_ELEMENTS]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // UI Panels state
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [rightDockTab, setRightDockTab] = useState<RightDockTab>('properties');
  const [isRightDockOpen, setIsRightDockOpen] = useState<boolean>(true);
  const showLayers = isRightDockOpen && rightDockTab === 'layers';

  // Toast notification for user actions (group/ungroup, etc.)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hidden SVG file input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hidden Asset Place file input
  const placeInputRef = useRef<HTMLInputElement | null>(null);

  // Default drawing properties
  const [defaultFill, setDefaultFill] = useState<string>('none');
  const [defaultStroke, setDefaultStroke] = useState<string>('#38bdf8');
  const [defaultStrokeWidth, setDefaultStrokeWidth] = useState<number>(2.5);
  const [defaultOpacity, setDefaultOpacity] = useState<number>(1);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('normal');
  const [clipboard, setClipboard] = useState<VectorElement[]>([]);
  const [showRulers, setShowRulers] = useState<boolean>(false);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [outlineMode, setOutlineMode] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  const [canvasRevision, setCanvasRevision] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showNewDocModal, setShowNewDocModal] = useState<boolean>(false);
  const [artboard, setArtboard] = useState<Artboard>(DEFAULT_ARTBOARD);

  // The primary active selected element
  const selectedId = selectedIds[0] || null;
  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  // Calculates exact viewport center for (0,0) in world space at 100% zoom
  const getCenteredTransform = useCallback((): ViewTransform => {
    const rightOffset = isRightDockOpen ? 360 : 40;
    const availableWidth = typeof window !== 'undefined' ? window.innerWidth - rightOffset : 800;
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 44 : 600;
    return {
      pan: {
        x: availableWidth / 2,
        y: availableHeight / 2,
      },
      zoom: 1,
    };
  }, [isRightDockOpen]);

  // Centers view and fits artboard comfortably within canvas viewport
  const fitArtboardInView = useCallback((ab: Artboard) => {
    const rightOffset = isRightDockOpen ? 360 : 40;
    const availableWidth = typeof window !== 'undefined' ? window.innerWidth - rightOffset : 800;
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 44 : 600;
    const targetZoom = Math.max(0.05, Math.min((availableWidth * 0.75) / ab.width, (availableHeight * 0.75) / ab.height, 1));
    const panX = (availableWidth - ab.width * targetZoom) / 2 - ab.x * targetZoom;
    const panY = (availableHeight - ab.height * targetZoom) / 2 - ab.y * targetZoom;

    setTransform({
      zoom: Math.round(targetZoom * 100) / 100,
      pan: { x: Math.round(panX), y: Math.round(panY) },
    });
  }, [isRightDockOpen]);

  // Canvas View Transform (Pan & Zoom)
  const [transform, setTransform] = useState<ViewTransform>(() => {
    const availableWidth = typeof window !== 'undefined' ? window.innerWidth - 360 : 800;
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 44 : 600;
    return {
      pan: { x: availableWidth / 2, y: availableHeight / 2 },
      zoom: 1,
    };
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Push new elements state to history
  const updateElementsWithHistory = useCallback(
    (newElements: VectorElement[]) => {
      setElements(newElements);
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(newElements);
        if (next.length > 40) next.shift();
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 39));
    },
    [historyIndex]
  );

  // Undo / Redo actions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setElements(history[nextIdx]);
      setSelectedIds([]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setElements(history[nextIdx]);
      setSelectedIds([]);
    }
  }, [history, historyIndex]);

  // Selection dispatchers
  const handleSelectCanvas = useCallback((id: string | null, isShift = false) => {
    if (!id) {
      setSelectedIds([]);
      return;
    }
    if (isShift) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }, []);

  const handleSelectLayer = useCallback((id: string, isShift: boolean) => {
    if (isShift) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }, []);

  // Change properties of selected elements or update defaults
  const handleChangeProperties = useCallback(
    (props: {
    fill?: string;
    fillType?: FillType;
    gradient?: GradientFill;
    stroke?: string;
    strokeWidth?: number;
    strokeCap?: StrokeCap;
    strokeJoin?: StrokeJoin;
    strokeDashArray?: number[];
    opacity?: number;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number | string;
    fontStyle?: 'normal' | 'italic';
    textAlign?: TextAlign;
    letterSpacing?: number;
    lineHeight?: number;
    text?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    cornerRadius?: number;
    rx?: number;
    ry?: number;
    src?: string;
  }) => {
    if (props.fill !== undefined) setDefaultFill(props.fill);
    if (props.stroke !== undefined) setDefaultStroke(props.stroke);
    if (props.strokeWidth !== undefined) setDefaultStrokeWidth(props.strokeWidth);
    if (props.opacity !== undefined) setDefaultOpacity(props.opacity);

    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds);
      const updated = elements.map((el) => {
        if (!selectedSet.has(el.id)) return el;

        const base = {
          ...el,
          ...(props.fill !== undefined ? { fill: props.fill } : {}),
          ...(props.fillType !== undefined ? { fillType: props.fillType } : {}),
          ...(props.gradient !== undefined ? { gradient: props.gradient } : {}),
          ...(props.stroke !== undefined ? { stroke: props.stroke } : {}),
          ...(props.strokeWidth !== undefined ? { strokeWidth: props.strokeWidth } : {}),
          ...(props.strokeCap !== undefined ? { strokeCap: props.strokeCap } : {}),
          ...(props.strokeJoin !== undefined ? { strokeJoin: props.strokeJoin } : {}),
          ...(props.strokeDashArray !== undefined ? { strokeDashArray: props.strokeDashArray } : {}),
          ...(props.opacity !== undefined ? { opacity: props.opacity } : {}),
        };

        if (el.type === 'rectangle') {
          return {
            ...base,
            ...(props.x !== undefined ? { x: props.x } : {}),
            ...(props.y !== undefined ? { y: props.y } : {}),
            ...(props.width !== undefined ? { width: props.width } : {}),
            ...(props.height !== undefined ? { height: props.height } : {}),
            ...(props.cornerRadius !== undefined
              ? { cornerRadius: props.cornerRadius, rx: props.cornerRadius, ry: props.cornerRadius }
              : {}),
            ...(props.rx !== undefined ? { rx: props.rx, cornerRadius: props.rx } : {}),
            ...(props.ry !== undefined ? { ry: props.ry } : {}),
          };
        }

        if (el.type === 'ellipse') {
          return {
            ...base,
            ...(props.x !== undefined ? { cx: props.x + (props.width !== undefined ? props.width / 2 : el.rx) } : {}),
            ...(props.y !== undefined ? { cy: props.y + (props.height !== undefined ? props.height / 2 : el.ry) } : {}),
            ...(props.width !== undefined ? { rx: props.width / 2 } : {}),
            ...(props.height !== undefined ? { ry: props.height / 2 } : {}),
          };
        }

        if (el.type === 'image') {
          return {
            ...base,
            ...(props.x !== undefined ? { x: props.x } : {}),
            ...(props.y !== undefined ? { y: props.y } : {}),
            ...(props.width !== undefined ? { width: props.width } : {}),
            ...(props.height !== undefined ? { height: props.height } : {}),
            ...(props.src !== undefined ? { src: props.src } : {}),
          };
        }

        if (el.type === 'text') {
          const newFontFamily = props.fontFamily !== undefined ? props.fontFamily : el.fontFamily;
          const newFontSize = props.fontSize !== undefined ? props.fontSize : el.fontSize;
          const newFontWeight = props.fontWeight !== undefined ? props.fontWeight : el.fontWeight;
          const newLineHeight = props.lineHeight !== undefined ? props.lineHeight : el.lineHeight;
          const newText = props.text !== undefined ? props.text : el.text;
          const metrics = measureTextBounds(newText, newFontFamily, newFontSize, newFontWeight, newLineHeight);

          return {
            ...base,
            fontFamily: newFontFamily,
            fontSize: newFontSize,
            fontWeight: newFontWeight,
            fontStyle: props.fontStyle !== undefined ? props.fontStyle : el.fontStyle,
            textAlign: props.textAlign !== undefined ? props.textAlign : el.textAlign,
            letterSpacing: props.letterSpacing !== undefined ? props.letterSpacing : el.letterSpacing,
            lineHeight: newLineHeight,
            text: newText,
            ...(props.x !== undefined ? { x: props.x } : {}),
            ...(props.y !== undefined ? { y: props.y } : {}),
            width: props.width !== undefined ? props.width : metrics.width,
            height: props.height !== undefined ? props.height : metrics.height,
          };
        }

        if (el.type === 'path') {
          if (props.x !== undefined || props.y !== undefined) {
            const b = getElementBoundingBox(el);
            const moveX = props.x !== undefined ? props.x - b.minX : 0;
            const moveY = props.y !== undefined ? props.y - b.minY : 0;
            return translateElement(base, moveX, moveY);
          }
          return base;
        }

        return base;
      });
      updateElementsWithHistory(updated);
    }
  }, [elements, selectedIds, updateElementsWithHistory]);

  // Swaps Fill and Stroke colors
  const handleSwapFillStroke = useCallback(() => {
    const curFill = selectedElement ? selectedElement.fill : defaultFill;
    const curStroke = selectedElement ? selectedElement.stroke : defaultStroke;
    handleChangeProperties({
      fill: curStroke,
      stroke: curFill,
    });
    showToast('Swapped Fill and Stroke');
  }, [selectedElement, defaultFill, defaultStroke, handleChangeProperties, showToast]);

  // Resets Fill and Stroke to Default (Black / White)
  const handleDefaultColors = useCallback(() => {
    handleChangeProperties({
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2,
    });
    showToast('Default Fill & Stroke');
  }, [handleChangeProperties, showToast]);

  // Boolean Pathfinder Operations (Unite, Minus Front, Intersect, Exclude)
  const handleApplyPathfinder = useCallback(
    (op: PathfinderOp) => {
      if (selectedIds.length < 2) {
        showToast('Select 2 or more shapes for Pathfinder');
        return;
      }
      const res = applyBooleanOperation(elements, selectedIds, op);
      if (res) {
        updateElementsWithHistory(res.newElements);
        setSelectedIds([res.resultingId]);
        const labels: Record<PathfinderOp, string> = {
          unite: 'Unite',
          subtract: 'Minus Front',
          intersect: 'Intersect',
          exclude: 'Exclude',
        };
        showToast(`Pathfinder ${labels[op]} applied`);
      } else {
        showToast('Pathfinder operation could not be applied');
      }
    },
    [elements, selectedIds, showToast, updateElementsWithHistory]
  );

  // Close open path action
  const handleCloseSelectedPath = () => {
    if (!selectedId) return;
    const updated = elements.map((el) => {
      if (el.id === selectedId && el.type === 'path') {
        return { ...el, closed: !el.closed } as PathElement;
      }
      return el;
    });
    updateElementsWithHistory(updated);
  };

  // Delete selected elements
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const toDelete = new Set(selectedIds);
    const updated = elements.filter((el) => !toDelete.has(el.id));
    updateElementsWithHistory(updated);
    setSelectedIds([]);
  }, [elements, selectedIds, updateElementsWithHistory]);

  // Duplicate selected shape with +20px offset
  const handleDuplicate = useCallback(() => {
    if (!selectedId) return;
    const target = elements.find((el) => el.id === selectedId);
    if (!target) return;

    const offset = 20;
    const newId = `${target.type}_${Date.now()}`;
    let duplicated: VectorElement;

    if (target.type === 'rectangle') {
      duplicated = {
        ...target,
        id: newId,
        name: `${target.name || 'Rectangle'} copy`,
        x: target.x + offset,
        y: target.y + offset,
      };
    } else if (target.type === 'ellipse') {
      duplicated = {
        ...target,
        id: newId,
        name: `${target.name || 'Ellipse'} copy`,
        cx: target.cx + offset,
        cy: target.cy + offset,
      };
    } else if (target.type === 'path') {
      duplicated = {
        ...target,
        id: newId,
        name: `${target.name || 'Path'} copy`,
        points: target.points.map((pt) => ({
          ...pt,
          point: { x: pt.point.x + offset, y: pt.point.y + offset },
          handleIn: pt.handleIn ? { x: pt.handleIn.x + offset, y: pt.handleIn.y + offset } : null,
          handleOut: pt.handleOut ? { x: pt.handleOut.x + offset, y: pt.handleOut.y + offset } : null,
        })),
      };
    } else {
      // Group copy
      duplicated = {
        ...target,
        id: newId,
        name: `${target.name || 'Group'} copy`,
      };
    }

    updateElementsWithHistory([...elements, duplicated]);
    setSelectedIds([newId]);
    showToast('Duplicated selection');
  }, [elements, selectedId, showToast, updateElementsWithHistory]);

  // Nudge selected shape via Arrow Keys (1px normal, 10px with Shift)
  const handleNudge = useCallback(
    (dx: number, dy: number) => {
      if (!selectedId) return;
      const updated = elements.map((el) => {
        if (el.id !== selectedId) return el;
        if (el.type === 'rectangle') {
          return { ...el, x: el.x + dx, y: el.y + dy };
        } else if (el.type === 'ellipse') {
          return { ...el, cx: el.cx + dx, cy: el.cy + dy };
        } else if (el.type === 'path') {
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
        return el;
      });
      updateElementsWithHistory(updated);
    },
    [elements, selectedId, updateElementsWithHistory]
  );

  // Group / Ungroup Engine
  const handleGroup = useCallback(() => {
    if (selectedIds.length === 0) return;
    const { newElements, newGroupId } = groupElements(elements, selectedIds);
    if (newGroupId) {
      updateElementsWithHistory(newElements);
      setSelectedIds([newGroupId]);
      showToast(`Grouped ${selectedIds.length} elements`);
    }
  }, [elements, selectedIds, showToast, updateElementsWithHistory]);

  const handleUngroup = useCallback(() => {
    if (selectedIds.length === 0) return;
    // Find if any selected element is a group
    const targetGroupId = selectedIds.find((id) =>
      elements.some((el) => el.id === id && el.type === 'group')
    );
    if (targetGroupId) {
      const { newElements, ungroundIds } = ungroupElement(elements, targetGroupId);
      updateElementsWithHistory(newElements);
      setSelectedIds(ungroundIds);
      showToast('Ungrouped selection');
    }
  }, [elements, selectedIds, showToast, updateElementsWithHistory]);

  // Object Reordering: Bring Forward, Bring to Front, Send Backward, Send to Back
  const handleBringForward = useCallback(() => {
    if (!selectedId) return;
    const next = bringForward(elements, selectedId);
    updateElementsWithHistory(next);
  }, [elements, selectedId, updateElementsWithHistory]);

  const handleBringToFront = useCallback(() => {
    if (!selectedId) return;
    const next = bringToFront(elements, selectedId);
    updateElementsWithHistory(next);
    showToast('Brought to front');
  }, [elements, selectedId, showToast, updateElementsWithHistory]);

  const handleSendBackward = useCallback(() => {
    if (!selectedId) return;
    const next = sendBackward(elements, selectedId);
    updateElementsWithHistory(next);
  }, [elements, selectedId, updateElementsWithHistory]);

  const handleSendToBack = useCallback(() => {
    if (!selectedId) return;
    const next = sendToBack(elements, selectedId);
    updateElementsWithHistory(next);
    showToast('Sent to back');
  }, [elements, selectedId, showToast, updateElementsWithHistory]);

  const handleReorderLayers = useCallback(
    (fromIndex: number, toIndex: number) => {
      const next = reorderLayers(elements, fromIndex, toIndex);
      updateElementsWithHistory(next);
    },
    [elements, updateElementsWithHistory]
  );

  // Layer Toggles
  const handleToggleVisibility = useCallback(
    (id: string) => {
      const next = toggleLayerVisibility(elements, id);
      updateElementsWithHistory(next);
    },
    [elements, updateElementsWithHistory]
  );

  const handleToggleLock = useCallback(
    (id: string) => {
      const next = toggleLayerLock(elements, id);
      updateElementsWithHistory(next);
    },
    [elements, updateElementsWithHistory]
  );

  const handleRenameLayer = useCallback(
    (id: string, newName: string) => {
      const next = renameLayer(elements, id, newName);
      updateElementsWithHistory(next);
    },
    [elements, updateElementsWithHistory]
  );

  // Select All
  const handleSelectAll = useCallback(() => {
    if (elements.length > 0) {
      setSelectedIds(elements.map((el) => el.id));
      showToast(`Selected all (${elements.length} elements)`);
    }
  }, [elements, showToast]);

  // Zoom helpers
  const handleZoomIn = useCallback(() => {
    setTransform((t) => ({ ...t, zoom: Math.min(t.zoom * 1.2, 32) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform((t) => ({ ...t, zoom: Math.max(t.zoom / 1.2, 0.05) }));
  }, []);

  const handleResetZoom = useCallback(() => {
    setTransform(getCenteredTransform());
  }, [getCenteredTransform]);

  const handleToggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev);
  }, []);

  const handleToggleLayers = useCallback(() => {
    if (!isRightDockOpen) {
      setIsRightDockOpen(true);
      setRightDockTab('layers');
      showToast('Opened Layers Panel');
    } else if (rightDockTab === 'layers') {
      setIsRightDockOpen(false);
      showToast('Collapsed Sidebar');
    } else {
      setRightDockTab('layers');
      showToast('Switched to Layers Panel');
    }
  }, [isRightDockOpen, rightDockTab, showToast]);

  const handleNewLayer = useCallback(() => {
    const newRect: RectElement = {
      id: `rect_${Date.now()}`,
      name: `Rectangle ${elements.length + 1}`,
      type: 'rectangle',
      x: (artboard?.x || 0) + (artboard?.width || 800) / 2 - 100,
      y: (artboard?.y || 0) + (artboard?.height || 600) / 2 - 75,
      width: 200,
      height: 150,
      fill: defaultFill === 'none' ? '#38bdf8' : defaultFill,
      fillType: 'solid',
      stroke: defaultStroke,
      strokeWidth: defaultStrokeWidth,
      opacity: defaultOpacity,
      visible: true,
      locked: false,
    };
    updateElementsWithHistory([...elements, newRect]);
    setSelectedIds([newRect.id]);
    showToast(`Created New Layer (${newRect.name})`);
  }, [
    artboard,
    defaultFill,
    defaultStroke,
    defaultStrokeWidth,
    defaultOpacity,
    elements,
    updateElementsWithHistory,
    showToast,
  ]);

  // Clipboard Engine
  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0) return;
    const toCopy = elements.filter((el) => selectedIds.includes(el.id));
    setClipboard(toCopy);
    showToast(`Copied ${toCopy.length} element${toCopy.length > 1 ? 's' : ''}`);
  }, [elements, selectedIds, showToast]);

  const handleCut = useCallback(() => {
    if (selectedIds.length === 0) return;
    const toCopy = elements.filter((el) => selectedIds.includes(el.id));
    setClipboard(toCopy);
    const updated = elements.filter((el) => !selectedIds.includes(el.id));
    updateElementsWithHistory(updated);
    setSelectedIds([]);
    showToast(`Cut ${toCopy.length} element${toCopy.length > 1 ? 's' : ''}`);
  }, [elements, selectedIds, updateElementsWithHistory, showToast]);

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return;
    const offset = 20;
    const newElements: VectorElement[] = clipboard.map((el, idx) => {
      const newId = `${el.type}_${Date.now()}_${idx}`;
      return translateElement({ ...el, id: newId }, offset, offset);
    });
    updateElementsWithHistory([...elements, ...newElements]);
    setSelectedIds(newElements.map((el) => el.id));
    showToast(`Pasted ${newElements.length} element${newElements.length > 1 ? 's' : ''}`);
  }, [clipboard, elements, updateElementsWithHistory, showToast]);

  const handlePasteInFront = useCallback(() => {
    if (clipboard.length === 0) return;
    const newElements: VectorElement[] = clipboard.map((el, idx) => ({
      ...el,
      id: `${el.type}_${Date.now()}_${idx}`,
    }));
    updateElementsWithHistory([...elements, ...newElements]);
    setSelectedIds(newElements.map((el) => el.id));
    showToast('Pasted in Front');
  }, [clipboard, elements, updateElementsWithHistory, showToast]);

  const handlePasteInBack = useCallback(() => {
    if (clipboard.length === 0) return;
    const newElements: VectorElement[] = clipboard.map((el, idx) => ({
      ...el,
      id: `${el.type}_${Date.now()}_${idx}`,
    }));
    updateElementsWithHistory([...newElements, ...elements]);
    setSelectedIds(newElements.map((el) => el.id));
    showToast('Pasted in Back');
  }, [clipboard, elements, updateElementsWithHistory, showToast]);

  const handlePasteInPlace = useCallback(() => {
    if (clipboard.length === 0) return;
    const newElements: VectorElement[] = clipboard.map((el, idx) => ({
      ...el,
      id: `${el.type}_${Date.now()}_${idx}`,
    }));
    updateElementsWithHistory([...elements, ...newElements]);
    setSelectedIds(newElements.map((el) => el.id));
    showToast('Pasted in Place');
  }, [clipboard, elements, updateElementsWithHistory, showToast]);

  // Lock / Unlock Selection
  const handleLockSelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    const targetSet = new Set(selectedIds);
    const updated = elements.map((el) => (targetSet.has(el.id) ? { ...el, locked: true } : el));
    updateElementsWithHistory(updated);
    setSelectedIds([]);
    showToast('Locked selection (⌘2)');
  }, [elements, selectedIds, updateElementsWithHistory, showToast]);

  const handleUnlockAll = useCallback(() => {
    const updated = elements.map((el) => ({ ...el, locked: false }));
    updateElementsWithHistory(updated);
    showToast('Unlocked all elements (⌥⌘2)');
  }, [elements, updateElementsWithHistory, showToast]);

  // Hide / Show Selection
  const handleHideSelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    const targetSet = new Set(selectedIds);
    const updated = elements.map((el) => (targetSet.has(el.id) ? { ...el, visible: false } : el));
    updateElementsWithHistory(updated);
    setSelectedIds([]);
    showToast('Hidden selection (⌘3)');
  }, [elements, selectedIds, updateElementsWithHistory, showToast]);

  const handleShowAll = useCallback(() => {
    const updated = elements.map((el) => ({ ...el, visible: true }));
    updateElementsWithHistory(updated);
    showToast('Showed all elements (⌥⌘3)');
  }, [elements, updateElementsWithHistory, showToast]);

  // Select helpers
  const handleDeselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleSelectInverse = useCallback(() => {
    const targetSet = new Set(selectedIds);
    const inverse = elements.filter((el) => !targetSet.has(el.id)).map((el) => el.id);
    setSelectedIds(inverse);
    showToast(`Selected inverse (${inverse.length} element${inverse.length === 1 ? '' : 's'})`);
  }, [elements, selectedIds, showToast]);

  const handleSelectSame = useCallback(
    (criteria: 'appearance' | 'fill' | 'stroke') => {
      if (!selectedElement) return;
      const matches = elements
        .filter((el) => {
          if (criteria === 'fill') return el.fill === selectedElement.fill;
          if (criteria === 'stroke') return el.stroke === selectedElement.stroke;
          return el.fill === selectedElement.fill && el.stroke === selectedElement.stroke;
        })
        .map((el) => el.id);
      setSelectedIds(matches);
      showToast(`Selected ${matches.length} matching elements`);
    },
    [elements, selectedElement, showToast]
  );

  // Transform actions
  const handleTransformMove = useCallback(
    (dx: number, dy: number) => {
      if (selectedIds.length === 0) return;
      const targetSet = new Set(selectedIds);
      const updated = elements.map((el) => (targetSet.has(el.id) ? translateElement(el, dx, dy) : el));
      updateElementsWithHistory(updated);
    },
    [elements, selectedIds, updateElementsWithHistory]
  );

  const handleTransformRotate = useCallback(
    (deg: number) => {
      if (selectedIds.length === 0) return;
      const targetSet = new Set(selectedIds);
      const updated = elements.map((el) => {
        if (!targetSet.has(el.id)) return el;
        const b = getElementBoundingBox(el);
        return rotateElement(el, { x: b.centerX, y: b.centerY }, (deg * Math.PI) / 180, false);
      });
      updateElementsWithHistory(updated);
      showToast(`Rotated ${deg}°`);
    },
    [elements, selectedIds, updateElementsWithHistory, showToast]
  );

  const handleTransformScale = useCallback(
    (factor: number) => {
      if (selectedIds.length === 0) return;
      const targetSet = new Set(selectedIds);
      const updated = elements.map((el) => {
        if (!targetSet.has(el.id)) return el;
        if (el.type === 'rectangle') {
          return { ...el, width: el.width * factor, height: el.height * factor };
        }
        if (el.type === 'ellipse') {
          return { ...el, rx: el.rx * factor, ry: el.ry * factor };
        }
        if (el.type === 'text') {
          return { ...el, fontSize: Math.round(el.fontSize * factor) };
        }
        return el;
      });
      updateElementsWithHistory(updated);
      showToast(`Scaled by ${(factor * 100).toFixed(0)}%`);
    },
    [elements, selectedIds, updateElementsWithHistory, showToast]
  );

  const handleTransformReflect = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      if (selectedIds.length === 0) return;
      const targetSet = new Set(selectedIds);
      const updated = elements.map((el) => {
        if (!targetSet.has(el.id)) return el;
        const b = getElementBoundingBox(el);
        if (el.type === 'path') {
          return {
            ...el,
            points: el.points.map((p) => ({
              ...p,
              point: {
                x: axis === 'horizontal' ? 2 * b.centerX - p.point.x : p.point.x,
                y: axis === 'vertical' ? 2 * b.centerY - p.point.y : p.point.y,
              },
              handleIn: p.handleIn
                ? {
                    x: axis === 'horizontal' ? -p.handleIn.x : p.handleIn.x,
                    y: axis === 'vertical' ? -p.handleIn.y : p.handleIn.y,
                  }
                : null,
              handleOut: p.handleOut
                ? {
                    x: axis === 'horizontal' ? -p.handleOut.x : p.handleOut.x,
                    y: axis === 'vertical' ? -p.handleOut.y : p.handleOut.y,
                  }
                : null,
            })),
          };
        }
        return el;
      });
      updateElementsWithHistory(updated);
      showToast(`Reflected ${axis}`);
    },
    [elements, selectedIds, updateElementsWithHistory, showToast]
  );

  const handleAlign = useCallback(
    (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedIds.length === 0) return;
      const targetSet = new Set(selectedIds);
      const targetElements = elements.filter((el) => targetSet.has(el.id));
      if (targetElements.length === 0) return;

      if (targetElements.length === 1) {
        // Align single element to artboard bounds
        const el = targetElements[0];
        const box = getElementBoundingBox(el);
        const refX = artboard ? artboard.x : 0;
        const refY = artboard ? artboard.y : 0;
        const refW = artboard ? artboard.width : 800;
        const refH = artboard ? artboard.height : 600;

        let dx = 0;
        let dy = 0;
        if (type === 'left') dx = refX - box.minX;
        else if (type === 'center') dx = refX + refW / 2 - box.centerX;
        else if (type === 'right') dx = refX + refW - box.maxX;
        else if (type === 'top') dy = refY - box.minY;
        else if (type === 'middle') dy = refY + refH / 2 - box.centerY;
        else if (type === 'bottom') dy = refY + refH - box.maxY;

        const updated = elements.map((item) => (item.id === el.id ? translateElement(item, dx, dy) : item));
        updateElementsWithHistory(updated);
        showToast(`Aligned ${type} to artboard`);
      } else {
        // Align multiple elements to selection bounding box
        const boxes = targetElements.map((el) => getElementBoundingBox(el));
        const selMinX = Math.min(...boxes.map((b) => b.minX));
        const selMaxX = Math.max(...boxes.map((b) => b.maxX));
        const selMinY = Math.min(...boxes.map((b) => b.minY));
        const selMaxY = Math.max(...boxes.map((b) => b.maxY));
        const selCenterX = (selMinX + selMaxX) / 2;
        const selCenterY = (selMinY + selMaxY) / 2;

        const updated = elements.map((item) => {
          if (!targetSet.has(item.id)) return item;
          const box = getElementBoundingBox(item);
          let dx = 0;
          let dy = 0;
          if (type === 'left') dx = selMinX - box.minX;
          else if (type === 'center') dx = selCenterX - box.centerX;
          else if (type === 'right') dx = selMaxX - box.maxX;
          else if (type === 'top') dy = selMinY - box.minY;
          else if (type === 'middle') dy = selCenterY - box.centerY;
          else if (type === 'bottom') dy = selMaxY - box.maxY;
          return translateElement(item, dx, dy);
        });

        updateElementsWithHistory(updated);
        showToast(`Aligned ${type} to selection`);
      }
    },
    [elements, selectedIds, artboard, updateElementsWithHistory, showToast]
  );

  // Type styling
  const handleToggleBold = useCallback(() => {
    if (selectedElement && selectedElement.type === 'text') {
      const isBold = selectedElement.fontWeight === 700 || selectedElement.fontWeight === 'bold';
      handleChangeProperties({ fontWeight: isBold ? 400 : 700 });
      showToast(`Set font weight to ${isBold ? 'Regular' : 'Bold'}`);
    }
  }, [selectedElement, handleChangeProperties, showToast]);

  const handleToggleItalic = useCallback(() => {
    if (selectedElement && selectedElement.type === 'text') {
      const isItalic = selectedElement.fontStyle === 'italic';
      handleChangeProperties({ fontStyle: isItalic ? 'normal' : 'italic' });
      showToast(`Set font style to ${isItalic ? 'Normal' : 'Italic'}`);
    }
  }, [selectedElement, handleChangeProperties, showToast]);

  // View helpers
  const handleActualSize = useCallback(() => {
    setTransform((prev) => ({ ...prev, zoom: 1 }));
    showToast('Actual Size (100%)');
  }, [showToast]);

  const handleToggleRulers = useCallback(() => {
    setShowRulers((prev) => !prev);
  }, []);

  const handleToggleGuides = useCallback(() => {
    setShowGuides((prev) => !prev);
  }, []);

  const handleToggleOutlineMode = useCallback(() => {
    setOutlineMode((prev) => !prev);
    showToast(`Outline Mode ${!outlineMode ? 'ON' : 'OFF'}`);
  }, [outlineMode, showToast]);

  // Completely resets all shapes, selections, active drawing, and centers zoom to 100%
  const executeResetDocument = useCallback(() => {
    setElements([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedIds([]);
    setTransform(getCenteredTransform());
    setCanvasRevision((prev) => prev + 1);
    setShowConfirmModal(false);
  }, [getCenteredTransform]);

  const handleNewDocument = useCallback(() => {
    setShowNewDocModal(true);
  }, []);

  const handleCreateDocument = useCallback((newArtboard: Artboard) => {
    setArtboard(newArtboard);
    setElements([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedIds([]);
    fitArtboardInView(newArtboard);
    setCanvasRevision((prev) => prev + 1);
    setShowNewDocModal(false);
    showToast(`Created ${newArtboard.name} (${newArtboard.width} × ${newArtboard.height} px)`);
  }, [fitArtboardInView, showToast]);

  // Master asset import handler (SVG, raster images, PSD, AI, EPS)
  const handleImportAssets = useCallback(
    async (files: FileList | File[], targetPos?: Point) => {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      const newElements: VectorElement[] = [];

      for (const file of fileArr) {
        try {
          const imported = await importAssetFile(file, targetPos);
          if (imported.length > 0) {
            newElements.push(...imported);
          }
        } catch (err) {
          console.error(`Failed to import asset ${file.name}:`, err);
        }
      }

      if (newElements.length > 0) {
        updateElementsWithHistory([...elements, ...newElements]);
        setSelectedIds([newElements[0].id]);
        showToast(`Placed ${newElements.length === 1 ? newElements[0].name : `${newElements.length} elements`}`);
      } else {
        showToast('Could not decode selected asset');
      }
    },
    [elements, updateElementsWithHistory, showToast]
  );

  const handleExportSvg = useCallback(
    async (mode: ExportMode = 'artboard') => {
      const filename = `forma-${mode === 'artboard' ? 'artboard' : 'design'}.svg`;
      const res = await downloadSvgFile(elements, filename, {
        artboard,
        mode,
      });
      if (res.success) {
        showToast(`Exported SVG (${mode === 'artboard' ? 'Artboard' : 'Design Bounds'})`);
      }
    },
    [elements, artboard, showToast]
  );

  const handleExportPng = useCallback(
    async (mode: ExportMode = 'artboard') => {
      const filename = `forma-${mode === 'artboard' ? 'artboard' : 'design'}.png`;
      const res = await downloadPngFile(elements, filename, {
        artboard,
        mode,
      });
      if (res.success) {
        showToast(`Exported PNG (${mode === 'artboard' ? 'Artboard' : 'Design Bounds'})`);
      }
    },
    [elements, artboard, showToast]
  );

  // Open SVG / Asset dialog with native macOS Finder dialog or web fallback
  const handleOpenSvg = useCallback(async () => {
    if (isTauriApp()) {
      const files = await nativeOpenAssets();
      if (files.length > 0) {
        await handleImportAssets(files);
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [handleImportAssets]);

  // Place asset dialog with native macOS Finder dialog or web fallback
  const handlePlaceAsset = useCallback(async () => {
    if (isTauriApp()) {
      const files = await nativeOpenAssets();
      if (files.length > 0) {
        await handleImportAssets(files);
      }
    } else {
      placeInputRef.current?.click();
    }
  }, [handleImportAssets]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImportAssets([file]);
    e.target.value = '';
  };

  // Master Adobe Illustrator / Vectorcraft Keyboard Shortcuts Engine
  useKeyboardShortcuts({
    currentTool,
    setActiveTool: setCurrentTool,
    selectedCount: selectedIds.length,
    selectedElementType: selectedElement?.type,

    // Panels
    activeDockTab: rightDockTab,
    setActiveDockTab: setRightDockTab,
    isDockOpen: isRightDockOpen,
    setIsDockOpen: setIsRightDockOpen,

    // Document & File Operations
    onNewDocument: handleNewDocument,
    onOpenSvg: handleOpenSvg,
    onPlaceAsset: handlePlaceAsset,
    onSaveSvg: () => handleExportSvg('artboard'),
    onSaveAs: () => handleExportSvg('design'),
    onExportPng: () => handleExportPng('artboard'),

    // Edit / Clipboard Operations
    onUndo: handleUndo,
    onRedo: handleRedo,
    onCut: handleCut,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onPasteInFront: handlePasteInFront,
    onPasteInBack: handlePasteInBack,
    onPasteInPlace: handlePasteInPlace,
    onDuplicate: handleDuplicate,
    onDeleteSelected: handleDeleteSelected,
    onSelectAll: handleSelectAll,
    onDeselectAll: handleDeselectAll,
    onSelectInverse: handleSelectInverse,
    onNudge: handleNudge,

    // Object Operations
    onGroup: handleGroup,
    onUngroup: handleUngroup,
    onBringForward: handleBringForward,
    onBringToFront: handleBringToFront,
    onSendBackward: handleSendBackward,
    onSendToBack: handleSendToBack,
    onLockSelection: handleLockSelection,
    onUnlockAll: handleUnlockAll,
    onHideSelection: handleHideSelection,
    onShowAll: handleShowAll,
    onMakeClippingMask: () => showToast('Make Clipping Mask (⌘7)'),
    onReleaseClippingMask: () => showToast('Release Clipping Mask (⌥⌘7)'),
    onMakeCompoundPath: () => showToast('Make Compound Path (⌘8)'),
    onReleaseCompoundPath: () => showToast('Release Compound Path (⌥⌘8)'),

    // Pathfinder Operations
    onApplyPathfinder: handleApplyPathfinder,

    // View / Canvas Operations
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onResetZoom: handleResetZoom,
    onActualSize: handleActualSize,
    onToggleOutlineMode: handleToggleOutlineMode,
    onToggleRulers: handleToggleRulers,
    onToggleGuides: handleToggleGuides,
    onToggleGrid: handleToggleGrid,

    // Appearance & Swatches
    onSwapFillStroke: handleSwapFillStroke,
    onDefaultColors: handleDefaultColors,
    onCycleDrawingMode: () => {
      setDrawingMode((prev) => (prev === 'normal' ? 'behind' : prev === 'behind' ? 'inside' : 'normal'));
      showToast('Toggled Drawing Mode (⇧D)');
    },
    onSetSolidColor: () => {
      handleChangeProperties({ fill: '#ffffff' });
      showToast('Color set to Solid (,)');
    },
    onSetGradientColor: () => {
      handleChangeProperties({ fill: '#38bdf8' });
      showToast('Gradient set (.)');
    },
    onSetNoneColor: () => {
      handleChangeProperties({ fill: 'none' });
      showToast('Fill set to None (/)');
    },

    // Text Formatting
    onToggleBold: handleToggleBold,
    onToggleItalic: handleToggleItalic,

    // UI Modals & Notifications
    onShowShortcutsModal: () => setShowShortcutsModal(true),
    onToast: showToast,
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#121214] text-zinc-100 antialiased">
      {/* Hidden SVG file input for Open SVG */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".svg"
        className="hidden"
      />

      {/* Hidden Asset Place File Input (SVG, Images, PSD, AI, EPS) */}
      <input
        type="file"
        ref={placeInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleImportAssets(e.target.files);
          }
          e.target.value = '';
        }}
        accept=".svg,.png,.jpg,.jpeg,.webp,.gif,.bmp,.psd,.ai,.eps,image/*"
        multiple
        className="hidden"
      />

      {/* Top Bar with macOS drag region, MenuBar dropdowns, zoom indicator */}
      <TitleBar
        zoom={transform.zoom}
        onResetZoom={handleResetZoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onNewDocument={handleNewDocument}
        onExportSvg={handleExportSvg}
        elementCount={elements.length}
        menuBarProps={{
          onAbout: () => setShowAboutModal(true),
          onPreferences: () => setShowShortcutsModal(true),
          onQuit: () => showToast('Forma — Vector Design Studio'),
          onNew: handleNewDocument,
          onOpenSvg: handleOpenSvg,
          onPlaceAsset: handlePlaceAsset,
          onSave: () => handleExportSvg('artboard'),
          onSaveAs: () => handleExportSvg('design'),
          onExportSvg: handleExportSvg,
          onExportPng: handleExportPng,
          onDocumentSetup: handleNewDocument,
          onUndo: handleUndo,
          canUndo: historyIndex > 0,
          onRedo: handleRedo,
          canRedo: historyIndex < history.length - 1,
          onCut: handleCut,
          onCopy: handleCopy,
          onPaste: handlePaste,
          onPasteInFront: handlePasteInFront,
          onPasteInBack: handlePasteInBack,
          onPasteInPlace: handlePasteInPlace,
          hasClipboard: clipboard.length > 0,
          onDuplicate: handleDuplicate,
          onDelete: handleDeleteSelected,
          hasSelection: selectedIds.length > 0,
          onTransformMove: handleTransformMove,
          onTransformRotate: handleTransformRotate,
          onTransformScale: handleTransformScale,
          onTransformReflect: handleTransformReflect,
          onGroup: handleGroup,
          onUngroup: handleUngroup,
          onBringForward: handleBringForward,
          onBringToFront: handleBringToFront,
          onSendBackward: handleSendBackward,
          onSendToBack: handleSendToBack,
          onLock: handleLockSelection,
          onUnlockAll: handleUnlockAll,
          onHide: handleHideSelection,
          onShowAll: handleShowAll,
          onMakeClippingMask: () => showToast('Make Clipping Mask (⌘7)'),
          onReleaseClippingMask: () => showToast('Release Clipping Mask (⌥⌘7)'),
          onMakeCompoundPath: () => showToast('Make Compound Path (⌘8)'),
          onReleaseCompoundPath: () => showToast('Release Compound Path (⌥⌘8)'),
          canPathfinder: selectedIds.length >= 2,
          onPathfinderUnion: () => handleApplyPathfinder('unite'),
          onPathfinderSubtract: () => handleApplyPathfinder('subtract'),
          onPathfinderIntersect: () => handleApplyPathfinder('intersect'),
          onPathfinderExclude: () => handleApplyPathfinder('exclude'),
          onToggleBold: handleToggleBold,
          onToggleItalic: handleToggleItalic,
          onChangeFontSize: (size) => handleChangeProperties({ fontSize: size }),
          onChangeFontFamily: (family) => handleChangeProperties({ fontFamily: family }),
          onCreateOutlines: () => showToast('Converted to Outlines'),
          isTextSelected: selectedElement?.type === 'text',
          onSelectAll: handleSelectAll,
          onDeselectAll: handleDeselectAll,
          onSelectInverse: handleSelectInverse,
          onSelectSameAppearance: () => handleSelectSame('appearance'),
          onSelectSameFill: () => handleSelectSame('fill'),
          onSelectSameStroke: () => handleSelectSame('stroke'),
          outlineMode: outlineMode,
          onToggleOutlineMode: handleToggleOutlineMode,
          onZoomIn: handleZoomIn,
          onZoomOut: handleZoomOut,
          onResetZoom: handleResetZoom,
          onActualSize: handleActualSize,
          showRulers: showRulers,
          onToggleRulers: handleToggleRulers,
          showGuides: showGuides,
          onToggleGuides: handleToggleGuides,
          showGrid: showGrid,
          onToggleGrid: handleToggleGrid,
          showLayers: showLayers,
          onToggleLayers: handleToggleLayers,
          showProperties: true,
          onToggleToolbarColumns: () => showToast('Toolbar Layout Toggled'),
          onShowShortcuts: () => setShowShortcutsModal(true),
          onOpenGithub: () => {
            if (typeof window !== 'undefined') {
              window.open('https://github.com/forma-design/forma', '_blank');
            }
          },
        }}
      />

      <div className="relative flex flex-1 w-full overflow-hidden">
        {/* Static Left Toolbar Sidebar */}
        <Toolbar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          fillColor={selectedElement ? selectedElement.fill : defaultFill}
          strokeColor={selectedElement ? selectedElement.stroke : defaultStroke}
          strokeWidth={selectedElement ? selectedElement.strokeWidth : defaultStrokeWidth}
          fillType={selectedElement ? selectedElement.fillType : 'solid'}
          onFillChange={(c) => handleChangeProperties({ fill: c })}
          onStrokeChange={(c) => handleChangeProperties({ stroke: c })}
          onSwapFillStroke={handleSwapFillStroke}
          onDefaultColors={handleDefaultColors}
          drawingMode={drawingMode}
          onDrawingModeChange={setDrawingMode}
        />

        {/* Center Infinite Bézier Canvas */}
        <Canvas
          key={canvasRevision}
          currentTool={currentTool}
          elements={elements}
          selectedId={selectedId}
          selectedIds={selectedIds}
          defaultFill={defaultFill}
          defaultStroke={defaultStroke}
          defaultStrokeWidth={defaultStrokeWidth}
          defaultOpacity={defaultOpacity}
          transform={transform}
          showGrid={showGrid}
          artboard={artboard}
          onTransformChange={setTransform}
          onElementsChange={updateElementsWithHistory}
          onSelectElement={handleSelectCanvas}
          onImportAssets={handleImportAssets}
          onUpdateElement={handleChangeProperties}
          onUpdateArtboard={setArtboard}
          onSelectTool={setCurrentTool}
        />

        {/* Right Docked Sidebar: Properties, Layers, and Libraries */}
        <RightSidebar
          activeTab={rightDockTab}
          onTabChange={setRightDockTab}
          isOpen={isRightDockOpen}
          onToggleOpen={() => setIsRightDockOpen((prev) => !prev)}
          elements={elements}
          selectedElement={selectedElement}
          selectedIds={selectedIds}
          selectedCount={selectedIds.length}
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          defaultFill={defaultFill}
          defaultStroke={defaultStroke}
          defaultStrokeWidth={defaultStrokeWidth}
          defaultOpacity={defaultOpacity}
          onChangeProperties={handleChangeProperties}
          onDeleteSelected={handleDeleteSelected}
          onClosePath={handleCloseSelectedPath}
          onApplyPathfinder={handleApplyPathfinder}
          onTransformRotate={handleTransformRotate}
          onTransformReflect={handleTransformReflect}
          onAlign={handleAlign}
          onLockSelected={handleLockSelection}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onMakeClippingMask={() => showToast('Make Clipping Mask (⌘7)')}
          artboard={artboard}
          onUpdateArtboard={setArtboard}
          onEditArtboard={handleNewDocument}
          showRulers={showRulers}
          onToggleRulers={handleToggleRulers}
          showGrid={showGrid}
          onToggleGrid={handleToggleGrid}
          transform={transform}
          onResetZoom={handleResetZoom}
          onExportSvg={handleExportSvg}
          onExportPng={handleExportPng}
          onNewDocument={handleNewDocument}
          onPreferences={() => setShowShortcutsModal(true)}
          onSelectElement={handleSelectCanvas}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleToggleLock}
          onRenameLayer={handleRenameLayer}
          onReorderLayers={handleReorderLayers}
          onGroupSelected={handleGroup}
          onUngroupSelected={handleUngroup}
          onNewLayer={handleNewLayer}
          onCreateSublayer={handleGroup}
          onPlaceAsset={handlePlaceAsset}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          historyIndex={historyIndex}
        />
      </div>

      {/* New Document Dialog Modal */}
      <NewDocumentModal
        isOpen={showNewDocModal}
        onClose={() => setShowNewDocModal(false)}
        onCreate={handleCreateDocument}
        currentElementCount={elements.length}
      />

      {/* Quick feedback toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-zinc-800/95 border border-white/10 text-white text-xs font-medium shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}

      {/* Confirmation Modal for Starting New Document */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#1e1e22] border border-white/10 p-5 shadow-2xl shadow-black/80 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-zinc-100">Clear canvas and start new?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You have {elements.length} {elements.length === 1 ? 'shape' : 'shapes'} on the canvas. Starting a new canvas will remove all shapes and reset your view to 100%.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-lg transition-colors border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeResetDocument}
                autoFocus
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-600/30 cursor-pointer"
              >
                Clear & Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Forma Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#1a1a1e] border border-white/10 p-6 shadow-2xl shadow-black/90 flex flex-col items-center text-center relative">
            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-sky-500/20 mb-4">
              <span className="text-white text-2xl font-black tracking-tight">F</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Forma Vector Studio</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 mt-1 mb-3">
              v1.0.0 (Release 2026)
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mb-6">
              A modern, high-performance desktop vector graphics editor inspired by Adobe Illustrator, built with React, Tauri v2, Paper.js, and Lucide.
            </p>
            <div className="w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs text-zinc-400 mb-6">
              <span>Platform: macOS Native (Tauri v2)</span>
              <span className="text-emerald-400 flex items-center gap-1.5">● Ready</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/forma-design/forma"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 hover:text-white border border-white/10 transition-colors"
              >
                GitHub Repository
              </a>
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-md shadow-sky-500/20 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Reference Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#1a1a1e] border border-white/10 p-6 shadow-2xl shadow-black/90 flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Keyboard Shortcuts</h2>
                <p className="text-xs text-zinc-400">Illustrator-compatible keybindings in Forma</p>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar text-xs">
              <div>
                <h3 className="font-semibold text-sky-400 uppercase tracking-wider text-[11px] mb-2">Tools</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Selection Tool</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">V</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Direct Selection</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">A</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Lasso Tool</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Q</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Pen Tool</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">P</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Anchor Point Tool</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⇧C</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Rectangle Tool</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">M</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Ellipse Tool</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">L</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Brush / Blob Brush</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">B / ⇧B</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Pencil Tool</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">N</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Eraser / Scissors</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⇧E / C</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Rotate / Reflect</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">R / O</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Scale / Blend</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">S / W</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Shape Builder</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⇧M</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Type Tool</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">T</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Artboard Tool</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⇧O</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Hand / Pan</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">H / Space</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Zoom Tool</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Z</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Eyedropper / Gradient</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">I / G</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Swap Fill & Stroke</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">X / ⇧X</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Default Colors / Cycle Mode</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">D / ⇧D</kbd></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-purple-400 uppercase tracking-wider text-[11px] mb-2">Panels</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Brushes / Libraries</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">F5</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Color / Properties</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">F6</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Layers Panel</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">F7 / ⌘L</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Align Panel</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⇧F7</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Gradient Panel</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘F9</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Pathfinder Panel</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⇧⌘F9</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Character Panel</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘T</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Paragraph Panel</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌥⌘T</kbd></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px] mb-2">Edit & Clipboard</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Undo / Redo</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘Z / ⇧⌘Z</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Cut / Copy</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘X / ⌘C</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Paste in Front</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘F</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Paste in Back</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘B</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Paste in Place</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⇧⌘V</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Duplicate</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘D</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Select All / Deselect</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘A / ⇧⌘A</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Select Inverse</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⇧⌘I</kbd></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-amber-400 uppercase tracking-wider text-[11px] mb-2">Object & View</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Group / Ungroup</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘G / ⇧⌘G</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Bring to Front / Back</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⇧⌘] / ⇧⌘[</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Lock / Unlock All</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘2 / ⌥⌘2</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Hide / Show All</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘3 / ⌥⌘3</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Outline Mode</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘Y</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Fit Artboard / Actual Size</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘0 / ⌘1</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Rulers / Guides / Grid</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">⌘R / ⌘; / ⌘'</kbd></div>
                  <div className="flex justify-between py-1 px-2 rounded bg-white/[0.02]"><span>Nudge / 10px Nudge</span><kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Arrows / ⇧Arrows</kbd></div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
