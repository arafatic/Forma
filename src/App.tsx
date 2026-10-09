import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayersPanel } from './components/LayersPanel';
import { NewDocumentModal } from './components/NewDocumentModal';
import {
  VectorElement,
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
} from './types/vector';
import { downloadSvgFile, downloadPngFile } from './engine/svgExporter';
import { applyBooleanOperation } from './engine/booleanOps';
import { importAssetFile } from './engine/assetImporter';
import { isTauriApp, nativeOpenAssets } from './engine/nativeIo';
import { measureTextBounds, translateElement, getElementBoundingBox } from './engine/transform';

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
  const [showLayers, setShowLayers] = useState<boolean>(true);

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

  const [canvasRevision, setCanvasRevision] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showNewDocModal, setShowNewDocModal] = useState<boolean>(false);
  const [artboard, setArtboard] = useState<Artboard>(DEFAULT_ARTBOARD);

  // The primary active selected element
  const selectedId = selectedIds[0] || null;
  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  // Calculates exact viewport center for (0,0) in world space at 100% zoom
  const getCenteredTransform = useCallback((): ViewTransform => {
    const leftOffset = showLayers ? 256 : 0;
    const availableWidth = typeof window !== 'undefined' ? window.innerWidth - 288 - leftOffset : 800;
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 44 : 600;
    return {
      pan: {
        x: availableWidth / 2 + leftOffset,
        y: availableHeight / 2,
      },
      zoom: 1,
    };
  }, [showLayers]);

  // Centers view and fits artboard comfortably within canvas viewport
  const fitArtboardInView = useCallback((ab: Artboard) => {
    const leftOffset = showLayers ? 256 : 0;
    const availableWidth = typeof window !== 'undefined' ? window.innerWidth - 288 - leftOffset : 800;
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 44 : 600;
    const targetZoom = Math.max(0.05, Math.min((availableWidth * 0.75) / ab.width, (availableHeight * 0.75) / ab.height, 1));
    const panX = (availableWidth - ab.width * targetZoom) / 2 - ab.x * targetZoom + leftOffset;
    const panY = (availableHeight - ab.height * targetZoom) / 2 - ab.y * targetZoom;

    setTransform({
      zoom: Math.round(targetZoom * 100) / 100,
      pan: { x: Math.round(panX), y: Math.round(panY) },
    });
  }, [showLayers]);

  // Canvas View Transform (Pan & Zoom)
  const [transform, setTransform] = useState<ViewTransform>(() => {
    const availableWidth = typeof window !== 'undefined' ? window.innerWidth - 288 - 256 : 600;
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 44 : 600;
    return {
      pan: { x: availableWidth / 2 + 256, y: availableHeight / 2 },
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
  const handleChangeProperties = (props: {
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
  };

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
    setShowLayers((prev) => !prev);
  }, []);

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

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // File Shortcuts
      if (isCmdOrCtrl && e.shiftKey && key === 'p') {
        e.preventDefault();
        handlePlaceAsset();
      } else if (isCmdOrCtrl && key === 'n') {
        e.preventDefault();
        handleNewDocument();
      } else if (isCmdOrCtrl && key === 'o') {
        e.preventDefault();
        handleOpenSvg();
      } else if (isCmdOrCtrl && e.altKey && !e.shiftKey && key === 's') {
        e.preventDefault();
        handleExportSvg('design');
      } else if (isCmdOrCtrl && e.altKey && e.shiftKey && key === 's') {
        e.preventDefault();
        handleExportPng('design');
      } else if (isCmdOrCtrl && !e.shiftKey && key === 's') {
        e.preventDefault();
        handleExportSvg('artboard');
      } else if (isCmdOrCtrl && e.shiftKey && key === 's') {
        e.preventDefault();
        handleExportPng('artboard');
      }

      // Edit Shortcuts
      else if (isCmdOrCtrl && !e.shiftKey && key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (isCmdOrCtrl && e.shiftKey && key === 'z') {
        e.preventDefault();
        handleRedo();
      } else if (isCmdOrCtrl && key === 'd') {
        e.preventDefault();
        handleDuplicate();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDeleteSelected();
      } else if (isCmdOrCtrl && key === 'a') {
        e.preventDefault();
        handleSelectAll();
      }

      // Arrow Keys Nudge: 1px default, 10px with Shift
      else if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        if (selectedId) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          handleNudge(dx, dy);
        }
      }

      // Object Shortcuts
      else if (isCmdOrCtrl && !e.shiftKey && key === 'g') {
        e.preventDefault();
        handleGroup();
      } else if (isCmdOrCtrl && e.shiftKey && key === 'g') {
        e.preventDefault();
        handleUngroup();
      } else if (isCmdOrCtrl && !e.shiftKey && e.key === ']') {
        e.preventDefault();
        handleBringForward();
      } else if (isCmdOrCtrl && e.shiftKey && e.key === ']') {
        e.preventDefault();
        handleBringToFront();
      } else if (isCmdOrCtrl && !e.shiftKey && e.key === '[') {
        e.preventDefault();
        handleSendBackward();
      } else if (isCmdOrCtrl && e.shiftKey && e.key === '[') {
        e.preventDefault();
        handleSendToBack();
      }

      // Pathfinder Shortcuts
      else if (isCmdOrCtrl && e.altKey && key === 'u') {
        e.preventDefault();
        handleApplyPathfinder('unite');
      } else if (isCmdOrCtrl && e.altKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleApplyPathfinder('subtract');
      } else if (isCmdOrCtrl && e.altKey && key === 'i') {
        e.preventDefault();
        handleApplyPathfinder('intersect');
      } else if (isCmdOrCtrl && e.altKey && key === 'x') {
        e.preventDefault();
        handleApplyPathfinder('exclude');
      }

      // View Shortcuts
      else if (isCmdOrCtrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if (isCmdOrCtrl && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
      } else if (isCmdOrCtrl && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if (isCmdOrCtrl && e.key === "'") {
        e.preventDefault();
        handleToggleGrid();
      } else if (isCmdOrCtrl && key === 'l') {
        e.preventDefault();
        handleToggleLayers();
      }

      // Tool shortcuts (single keys)
      else if (!isCmdOrCtrl && key === 'v') setCurrentTool('select');
      else if (!isCmdOrCtrl && key === 'p') setCurrentTool('pen');
      else if (!isCmdOrCtrl && key === 'm') setCurrentTool('rectangle');
      else if (!isCmdOrCtrl && key === 'l') setCurrentTool('ellipse');
      else if (!isCmdOrCtrl && key === 't') setCurrentTool('text');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleNewDocument,
    handleOpenSvg,
    handleExportSvg,
    handleExportPng,
    handleUndo,
    handleRedo,
    handleDuplicate,
    handleDeleteSelected,
    handleSelectAll,
    handleNudge,
    selectedId,
    handleGroup,
    handleUngroup,
    handleBringForward,
    handleBringToFront,
    handleSendBackward,
    handleSendToBack,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleToggleGrid,
    handleToggleLayers,
  ]);

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
        showLayers={showLayers}
        onToggleLayers={handleToggleLayers}
        menuBarProps={{
          onNew: handleNewDocument,
          onOpenSvg: handleOpenSvg,
          onPlaceAsset: handlePlaceAsset,
          onExportSvg: handleExportSvg,
          onExportPng: handleExportPng,
          onUndo: handleUndo,
          canUndo: historyIndex > 0,
          onRedo: handleRedo,
          canRedo: historyIndex < history.length - 1,
          onDuplicate: handleDuplicate,
          onDelete: handleDeleteSelected,
          hasSelection: selectedIds.length > 0,
          onSelectAll: handleSelectAll,
          onGroup: handleGroup,
          onUngroup: handleUngroup,
          onBringForward: handleBringForward,
          onBringToFront: handleBringToFront,
          onSendBackward: handleSendBackward,
          onSendToBack: handleSendToBack,
          onZoomIn: handleZoomIn,
          onZoomOut: handleZoomOut,
          onResetZoom: handleResetZoom,
          showGrid: showGrid,
          onToggleGrid: handleToggleGrid,
          showLayers: showLayers,
          onToggleLayers: handleToggleLayers,
          canPathfinder: selectedIds.length >= 2,
          onPathfinderUnion: () => handleApplyPathfinder('unite'),
          onPathfinderSubtract: () => handleApplyPathfinder('subtract'),
          onPathfinderIntersect: () => handleApplyPathfinder('intersect'),
          onPathfinderExclude: () => handleApplyPathfinder('exclude'),
        }}
      />

      <div className="relative flex flex-1 w-full overflow-hidden">
        {/* Collapsible Left Layers Panel */}
        <LayersPanel
          elements={elements}
          selectedIds={selectedIds}
          isOpen={showLayers}
          onClose={() => setShowLayers(false)}
          onSelectLayer={handleSelectLayer}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleToggleLock}
          onRenameLayer={handleRenameLayer}
          onReorderLayers={handleReorderLayers}
          onGroupSelected={handleGroup}
          onUngroupSelected={handleUngroup}
        />

        {/* Floating Left Toolbar */}
        <Toolbar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          className={showLayers ? 'left-[272px]' : 'left-4'}
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
        />

        {/* Right Docked Sidebar: Properties, Layers, and Libraries */}
        <PropertiesPanel
          elements={elements}
          selectedElement={selectedElement}
          selectedIds={selectedIds}
          selectedCount={selectedIds.length}
          defaultFill={defaultFill}
          defaultStroke={defaultStroke}
          defaultStrokeWidth={defaultStrokeWidth}
          defaultOpacity={defaultOpacity}
          onChangeProperties={handleChangeProperties}
          onDeleteSelected={handleDeleteSelected}
          onClosePath={handleCloseSelectedPath}
          onApplyPathfinder={handleApplyPathfinder}
          artboard={artboard}
          onUpdateArtboard={setArtboard}
          onEditArtboard={handleNewDocument}
          showGrid={showGrid}
          onToggleGrid={handleToggleGrid}
          transform={transform}
          onResetZoom={handleResetZoom}
          onExportSvg={handleExportSvg}
          onExportPng={handleExportPng}
          onNewDocument={handleNewDocument}
          onSelectElement={handleSelectCanvas}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleToggleLock}
          onRenameLayer={handleRenameLayer}
          onReorderLayers={handleReorderLayers}
          onGroupSelected={handleGroup}
          onUngroupSelected={handleUngroup}
          onPlaceAsset={handlePlaceAsset}
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
    </div>
  );
};
export default App;
