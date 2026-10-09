import { useEffect, useRef } from 'react';
import { ToolType, PathfinderOp } from '../types/vector';
import { RightDockTab } from '../components/RightSidebar';

export interface UseKeyboardShortcutsOptions {
  // Current Tool & Active Selection
  currentTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  selectedCount: number;
  selectedElementType?: string;

  // Sidebar / Panels
  activeDockTab: RightDockTab;
  setActiveDockTab: (tab: RightDockTab) => void;
  isDockOpen: boolean;
  setIsDockOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Document & File Operations
  onNewDocument: () => void;
  onOpenSvg: () => void;
  onPlaceAsset: () => void;
  onSaveSvg: () => void;
  onSaveAs: () => void;
  onExportPng: () => void;

  // Edit / Clipboard Operations
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onPasteInFront: () => void;
  onPasteInBack: () => void;
  onPasteInPlace: () => void;
  onDuplicate: () => void;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectInverse: () => void;
  onNudge: (dx: number, dy: number) => void;

  // Object Operations
  onGroup: () => void;
  onUngroup: () => void;
  onBringForward: () => void;
  onBringToFront: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onLockSelection: () => void;
  onUnlockAll: () => void;
  onHideSelection: () => void;
  onShowAll: () => void;
  onMakeClippingMask: () => void;
  onReleaseClippingMask: () => void;
  onMakeCompoundPath?: () => void;
  onReleaseCompoundPath?: () => void;

  // Pathfinder Operations
  onApplyPathfinder: (op: PathfinderOp) => void;

  // View / Canvas Operations
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onActualSize: () => void;
  onToggleOutlineMode: () => void;
  onToggleRulers: () => void;
  onToggleGuides: () => void;
  onToggleGrid: () => void;

  // Colors / Appearance
  onSwapFillStroke: () => void;
  onDefaultColors: () => void;
  onCycleDrawingMode: () => void;
  onSetSolidColor: () => void;
  onSetGradientColor: () => void;
  onSetNoneColor: () => void;

  // Text Styling
  onToggleBold: () => void;
  onToggleItalic: () => void;

  // UI Modals & Notifications
  onShowShortcutsModal: () => void;
  onToast: (msg: string) => void;
}

/**
 * Text Input Guard: Checks if target element is editable (input, textarea, select, contentEditable)
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
  if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') return true;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
  return false;
}

/**
 * Master Keyboard Shortcut & Tool Selection Engine for Forma.
 * Implements complete Adobe Illustrator / Vectorcraft keybinding registry,
 * input guard, temporary Spacebar pan toggle, and panel activation.
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const {
    currentTool,
    setActiveTool,
    selectedCount,
    selectedElementType,
    activeDockTab,
    setActiveDockTab,
    isDockOpen,
    setIsDockOpen,
    onNewDocument,
    onOpenSvg,
    onPlaceAsset,
    onSaveSvg,
    onSaveAs,
    onExportPng,
    onUndo,
    onRedo,
    onCut,
    onCopy,
    onPaste,
    onPasteInFront,
    onPasteInBack,
    onPasteInPlace,
    onDuplicate,
    onDeleteSelected,
    onSelectAll,
    onDeselectAll,
    onSelectInverse,
    onNudge,
    onGroup,
    onUngroup,
    onBringForward,
    onBringToFront,
    onSendBackward,
    onSendToBack,
    onLockSelection,
    onUnlockAll,
    onHideSelection,
    onShowAll,
    onMakeClippingMask,
    onReleaseClippingMask,
    onMakeCompoundPath,
    onReleaseCompoundPath,
    onApplyPathfinder,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onActualSize,
    onToggleOutlineMode,
    onToggleRulers,
    onToggleGuides,
    onToggleGrid,
    onSwapFillStroke,
    onDefaultColors,
    onCycleDrawingMode,
    onSetSolidColor,
    onSetGradientColor,
    onSetNoneColor,
    onToggleBold,
    onToggleItalic,
    onShowShortcutsModal,
    onToast,
  } = options;

  // Spacebar temporary pan tracking
  const spaceHeldRef = useRef<boolean>(false);
  const toolBeforeSpaceRef = useRef<ToolType | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isAlt = e.altKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();
      const code = e.code;

      // -------------------------------------------------------------
      // 0. SPACEBAR TEMPORARY PAN (HAND TOOL)
      // -------------------------------------------------------------
      if (code === 'Space' && !e.repeat && !isEditableTarget(e.target)) {
        e.preventDefault();
        if (!spaceHeldRef.current) {
          spaceHeldRef.current = true;
          if (currentTool !== 'hand') {
            toolBeforeSpaceRef.current = currentTool;
            setActiveTool('hand');
          }
        }
        return;
      }

      // -------------------------------------------------------------
      // 1. ESCAPE KEY (Always allowed, even in input to blur or exit)
      // -------------------------------------------------------------
      if (e.key === 'Escape') {
        if (isEditableTarget(e.target) && e.target instanceof HTMLElement) {
          e.target.blur();
          return;
        }
        if (currentTool === 'artboard') {
          setActiveTool('select');
          onToast('Exited Artboard Tool (V)');
          return;
        }
        return;
      }

      // -------------------------------------------------------------
      // 2. TEXT INPUT GUARD: Ignore tool & command keys if typing
      // -------------------------------------------------------------
      if (isEditableTarget(e.target)) {
        return;
      }

      // -------------------------------------------------------------
      // 3. FUNCTION KEYS: Panel Shortcuts
      // -------------------------------------------------------------
      if (code === 'F5') {
        // F5: Brushes Panel
        e.preventDefault();
        setIsDockOpen(true);
        setActiveDockTab('brushes');
        onToast('Brushes Panel (F5)');
        return;
      }
      if (code === 'F6') {
        // F6: Color Panel
        e.preventDefault();
        setIsDockOpen(true);
        setActiveDockTab('color');
        onToast('Color Panel (F6)');
        return;
      }
      if (code === 'F7' && !isShift) {
        // F7: Layers Panel
        e.preventDefault();
        if (!isDockOpen || activeDockTab !== 'layers') {
          setIsDockOpen(true);
          setActiveDockTab('layers');
          onToast('Layers Panel (F7)');
        } else {
          setIsDockOpen(false);
          onToast('Collapsed Panel');
        }
        return;
      }
      if (code === 'F7' && isShift) {
        // Shift+F7: Align Panel (Properties Panel)
        e.preventDefault();
        setIsDockOpen(true);
        setActiveDockTab('properties');
        onToast('Align Panel (⇧F7)');
        return;
      }
      if (code === 'F9' && isCmdOrCtrl && isShift) {
        // Cmd+Shift+F9: Pathfinder Panel
        e.preventDefault();
        setIsDockOpen(true);
        setActiveDockTab('properties');
        onToast('Pathfinder Panel (⇧⌘F9)');
        return;
      }
      if (code === 'F9' && isCmdOrCtrl && !isShift) {
        // Cmd+F9: Gradient Panel
        e.preventDefault();
        setIsDockOpen(true);
        setActiveDockTab('gradient');
        onToast('Gradient Panel (⌘F9)');
        return;
      }

      // -------------------------------------------------------------
      // 4. COMMAND / MODIFIER SHORTCUTS (Cmd / Ctrl pressed)
      // -------------------------------------------------------------
      if (isCmdOrCtrl) {
        // --- App & General ---
        if (key === 'q') {
          e.preventDefault();
          onToast('Forma — Vector Studio');
          return;
        }
        if (key === 'k') {
          e.preventDefault();
          onShowShortcutsModal();
          return;
        }

        // --- File Operations ---
        if (key === 'n') {
          e.preventDefault();
          onNewDocument();
          return;
        }
        if (key === 'o' && !isShift && !isAlt) {
          e.preventDefault();
          onOpenSvg();
          return;
        }
        if (key === 'p' && isAlt) {
          e.preventDefault();
          onNewDocument();
          return;
        }
        if (key === 'p' && isShift) {
          e.preventDefault();
          onPlaceAsset();
          return;
        }
        if (key === 's' && !isShift && !isAlt) {
          e.preventDefault();
          onSaveSvg();
          return;
        }
        if (key === 's' && isShift && !isAlt) {
          e.preventDefault();
          onExportPng();
          return;
        }
        if (key === 's' && isAlt) {
          e.preventDefault();
          onSaveAs();
          return;
        }

        // --- Edit & Clipboard ---
        if (key === 'z' && !isShift) {
          e.preventDefault();
          onUndo();
          return;
        }
        if (key === 'z' && isShift) {
          e.preventDefault();
          onRedo();
          return;
        }
        if (key === 'x') {
          e.preventDefault();
          onCut();
          return;
        }
        if (key === 'c') {
          e.preventDefault();
          onCopy();
          return;
        }
        if (key === 'v' && !isShift) {
          e.preventDefault();
          onPaste();
          return;
        }
        if (key === 'f') {
          e.preventDefault();
          onPasteInFront();
          return;
        }
        if (key === 'b') {
          e.preventDefault();
          if (selectedElementType === 'text') {
            onToggleBold();
          } else {
            onPasteInBack();
          }
          return;
        }
        if (key === 'i' && !isAlt && !isShift) {
          e.preventDefault();
          if (selectedElementType === 'text') {
            onToggleItalic();
          }
          return;
        }
        if (key === 'v' && isShift) {
          e.preventDefault();
          onPasteInPlace();
          return;
        }
        if (key === 'd') {
          e.preventDefault();
          onDuplicate();
          return;
        }
        if (key === 'a' && !isShift) {
          e.preventDefault();
          onSelectAll();
          return;
        }
        if (key === 'a' && isShift) {
          e.preventDefault();
          onDeselectAll();
          return;
        }
        if (key === 'i' && isShift && !isAlt) {
          e.preventDefault();
          onSelectInverse();
          return;
        }

        // --- Object Grouping, Arranging, Lock, Hide ---
        if (key === 'g' && !isShift) {
          e.preventDefault();
          onGroup();
          return;
        }
        if (key === 'g' && isShift) {
          e.preventDefault();
          onUngroup();
          return;
        }
        if (e.key === ']' && !isShift) {
          e.preventDefault();
          onBringForward();
          return;
        }
        if (e.key === ']' && isShift) {
          e.preventDefault();
          onBringToFront();
          return;
        }
        if (e.key === '[' && !isShift) {
          e.preventDefault();
          onSendBackward();
          return;
        }
        if (e.key === '[' && isShift) {
          e.preventDefault();
          onSendToBack();
          return;
        }
        if (e.key === '2' && !isAlt) {
          e.preventDefault();
          onLockSelection();
          return;
        }
        if (e.key === '2' && isAlt) {
          e.preventDefault();
          onUnlockAll();
          return;
        }
        if (e.key === '3' && !isAlt) {
          e.preventDefault();
          onHideSelection();
          return;
        }
        if (e.key === '3' && isAlt) {
          e.preventDefault();
          onShowAll();
          return;
        }
        if (e.key === '7' && !isAlt) {
          e.preventDefault();
          onMakeClippingMask();
          return;
        }
        if (e.key === '7' && isAlt) {
          e.preventDefault();
          onReleaseClippingMask();
          return;
        }
        if (e.key === '8' && !isAlt) {
          e.preventDefault();
          onMakeCompoundPath?.();
          return;
        }
        if (e.key === '8' && isAlt) {
          e.preventDefault();
          onReleaseCompoundPath?.();
          return;
        }

        // --- Character (Cmd+T) & Paragraph (Cmd+Alt+T) ---
        if (key === 't' && !isAlt) {
          e.preventDefault();
          setIsDockOpen(true);
          setActiveDockTab('properties');
          onToast('Character Panel (⌘T)');
          return;
        }
        if (key === 't' && isAlt) {
          e.preventDefault();
          setIsDockOpen(true);
          setActiveDockTab('properties');
          onToast('Paragraph Panel (⌥⌘T)');
          return;
        }

        // --- Pathfinder Shortcuts (Cmd+Alt+...) ---
        if (isAlt && key === 'u') {
          e.preventDefault();
          onApplyPathfinder('unite');
          return;
        }
        if (isAlt && (e.key === '-' || e.key === '_')) {
          e.preventDefault();
          onApplyPathfinder('subtract');
          return;
        }
        if (isAlt && key === 'i') {
          e.preventDefault();
          onApplyPathfinder('intersect');
          return;
        }
        if (isAlt && key === 'x') {
          e.preventDefault();
          onApplyPathfinder('exclude');
          return;
        }

        // --- View & Navigation Shortcuts ---
        if (key === 'y') {
          e.preventDefault();
          onToggleOutlineMode();
          return;
        }
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          onZoomIn();
          return;
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          onZoomOut();
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          onResetZoom();
          return;
        }
        if (e.key === '1') {
          e.preventDefault();
          onActualSize();
          return;
        }
        if (key === 'r') {
          e.preventDefault();
          onToggleRulers();
          return;
        }
        if (e.key === ';') {
          e.preventDefault();
          onToggleGuides();
          return;
        }
        if (e.key === "'") {
          e.preventDefault();
          onToggleGrid();
          return;
        }
        if (key === 'l') {
          e.preventDefault();
          setIsDockOpen(true);
          setActiveDockTab('layers');
          onToast('Layers Panel (⌘L)');
          return;
        }

        return;
      }

      // -------------------------------------------------------------
      // 5. SELECTION EDITING & ARROWS (No Cmd/Ctrl)
      // -------------------------------------------------------------
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedCount > 0) {
          e.preventDefault();
          onDeleteSelected();
        }
        return;
      }

      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        if (selectedCount > 0) {
          e.preventDefault();
          const step = isShift ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          onNudge(dx, dy);
          return;
        }
      }

      // -------------------------------------------------------------
      // 6. VECTORCRAFT TOOL CATALOG & APPEARANCE SHORTCUTS
      // -------------------------------------------------------------
      // Selection Tools
      if (!isShift && key === 'v') {
        setActiveTool('select');
        return;
      }
      if (!isShift && key === 'a') {
        setActiveTool('direct-select');
        return;
      }
      if (!isShift && key === 'q') {
        setActiveTool('lasso');
        return;
      }

      // Shapes Tools
      if (!isShift && key === 'm') {
        setActiveTool('rectangle');
        return;
      }
      if (!isShift && key === 'l') {
        setActiveTool('ellipse');
        return;
      }
      if (!isShift && key === '\\') {
        setActiveTool('line');
        return;
      }

      // Drawing & Modifying Tools
      if (!isShift && key === 'p') {
        setActiveTool('pen');
        return;
      }
      if (isShift && key === 'c') {
        // Shift+C: Anchor Point Tool
        setActiveTool('anchor-point');
        onToast('Anchor Point Tool (⇧C)');
        return;
      }
      if (!isShift && key === 'b') {
        setActiveTool('brush');
        return;
      }
      if (isShift && key === 'b') {
        // Shift+B: Blob Brush Tool
        setActiveTool('blob-brush');
        onToast('Blob Brush Tool (⇧B)');
        return;
      }
      if (!isShift && key === 'n') {
        setActiveTool('pencil');
        return;
      }
      if (isShift && key === 'e') {
        // Shift+E: Eraser Tool
        setActiveTool('eraser');
        return;
      }
      if (!isShift && key === 'c') {
        // C: Scissors Tool
        setActiveTool('scissors');
        return;
      }
      if (!isShift && key === 'r') {
        setActiveTool('rotate');
        return;
      }
      if (!isShift && key === 'o') {
        // O: Reflect Tool
        setActiveTool('reflect');
        onToast('Reflect Tool (O)');
        return;
      }
      if (isShift && key === 'o') {
        // Shift+O: Artboard Tool
        setActiveTool('artboard');
        setIsDockOpen(true);
        setActiveDockTab('properties');
        onToast('Artboard Tool (⇧O) — Press Esc or V to exit');
        return;
      }
      if (!isShift && key === 's') {
        setActiveTool('scale');
        return;
      }
      if (!isShift && key === 'w') {
        // W: Blend Tool
        setActiveTool('blend');
        onToast('Blend Tool (W)');
        return;
      }
      if (isShift && key === 'm') {
        // Shift+M: Shape Builder Tool
        setActiveTool('shape-builder');
        return;
      }

      // Type Tool
      if (!isShift && key === 't') {
        setActiveTool('text');
        return;
      }

      // Navigation Tools
      if (!isShift && key === 'h') {
        setActiveTool('hand');
        return;
      }
      if (!isShift && key === 'z') {
        setActiveTool('zoom');
        return;
      }

      // Color Tools
      if (!isShift && key === 'i') {
        setActiveTool('eyedropper');
        return;
      }
      if (!isShift && key === 'g') {
        setActiveTool('gradient-tool');
        return;
      }

      // Appearance / Swatch Shortcuts
      if (key === 'x') {
        e.preventDefault();
        onSwapFillStroke();
        return;
      }
      if (!isShift && key === 'd') {
        e.preventDefault();
        onDefaultColors();
        return;
      }
      if (isShift && key === 'd') {
        e.preventDefault();
        onCycleDrawingMode();
        return;
      }
      if (key === ',') {
        onSetSolidColor();
        return;
      }
      if (key === '.') {
        onSetGradientColor();
        return;
      }
      if (key === '/') {
        onSetNoneColor();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Restore previous tool when releasing spacebar
      if (e.code === 'Space') {
        if (spaceHeldRef.current) {
          spaceHeldRef.current = false;
          if (toolBeforeSpaceRef.current) {
            setActiveTool(toolBeforeSpaceRef.current);
            toolBeforeSpaceRef.current = null;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    currentTool,
    setActiveTool,
    selectedCount,
    selectedElementType,
    activeDockTab,
    setActiveDockTab,
    isDockOpen,
    setIsDockOpen,
    onNewDocument,
    onOpenSvg,
    onPlaceAsset,
    onSaveSvg,
    onSaveAs,
    onExportPng,
    onUndo,
    onRedo,
    onCut,
    onCopy,
    onPaste,
    onPasteInFront,
    onPasteInBack,
    onPasteInPlace,
    onDuplicate,
    onDeleteSelected,
    onSelectAll,
    onDeselectAll,
    onSelectInverse,
    onNudge,
    onGroup,
    onUngroup,
    onBringForward,
    onBringToFront,
    onSendBackward,
    onSendToBack,
    onLockSelection,
    onUnlockAll,
    onHideSelection,
    onShowAll,
    onMakeClippingMask,
    onReleaseClippingMask,
    onMakeCompoundPath,
    onReleaseCompoundPath,
    onApplyPathfinder,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onActualSize,
    onToggleOutlineMode,
    onToggleRulers,
    onToggleGuides,
    onToggleGrid,
    onSwapFillStroke,
    onDefaultColors,
    onCycleDrawingMode,
    onSetSolidColor,
    onSetGradientColor,
    onSetNoneColor,
    onToggleBold,
    onToggleItalic,
    onShowShortcutsModal,
    onToast,
  ]);
}
