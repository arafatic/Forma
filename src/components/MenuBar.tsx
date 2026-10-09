import React, { useState, useEffect, useRef } from 'react';
import {
  FilePlus,
  FolderOpen,
  Save,
  Download,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Clipboard,
  Trash2,
  Layers,
  Ungroup,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Type,
  Bold,
  Italic,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  Sliders,
  Settings,
  Ruler,
  Maximize,
  Move,
  RotateCw,
  Scaling,
  FlipHorizontal,
  Compass,
  Code2,
} from 'lucide-react';

export interface MenuBarProps {
  // App / About
  onAbout?: () => void;
  onPreferences?: () => void;
  onQuit?: () => void;

  // File
  onNew: () => void;
  onOpenSvg: () => void;
  onPlaceAsset?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onExportSvg: (mode?: 'artboard' | 'design') => void;
  onExportPng: (mode?: 'artboard' | 'design') => void;
  onDocumentSetup?: () => void;

  // Edit
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onPasteInFront?: () => void;
  onPasteInBack?: () => void;
  onPasteInPlace?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  hasSelection: boolean;
  hasClipboard?: boolean;

  // Object
  onTransformMove?: (dx: number, dy: number) => void;
  onTransformRotate?: (deg: number) => void;
  onTransformScale?: (scale: number) => void;
  onTransformReflect?: (axis: 'horizontal' | 'vertical') => void;
  onGroup: () => void;
  onUngroup: () => void;
  onBringForward: () => void;
  onBringToFront: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onLock?: () => void;
  onUnlockAll?: () => void;
  onHide?: () => void;
  onShowAll?: () => void;
  onMakeClippingMask?: () => void;
  onReleaseClippingMask?: () => void;
  onMakeCompoundPath?: () => void;
  onReleaseCompoundPath?: () => void;
  canPathfinder?: boolean;
  onPathfinderUnion?: () => void;
  onPathfinderSubtract?: () => void;
  onPathfinderIntersect?: () => void;
  onPathfinderExclude?: () => void;

  // Type
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onChangeFontSize?: (size: number) => void;
  onChangeFontFamily?: (family: string) => void;
  onCreateOutlines?: () => void;
  isTextSelected?: boolean;

  // Select
  onSelectAll: () => void;
  onDeselectAll?: () => void;
  onSelectInverse?: () => void;
  onSelectSameAppearance?: () => void;
  onSelectSameFill?: () => void;
  onSelectSameStroke?: () => void;

  // View
  outlineMode?: boolean;
  onToggleOutlineMode?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onActualSize?: () => void;
  showRulers?: boolean;
  onToggleRulers?: () => void;
  showGuides?: boolean;
  onToggleGuides?: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;

  // Window
  showLayers?: boolean;
  onToggleLayers?: () => void;
  showProperties?: boolean;
  onToggleProperties?: () => void;
  onToggleToolbarColumns?: () => void;

  // Help
  onShowShortcuts?: () => void;
  onOpenGithub?: () => void;
}

export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
  checked?: boolean;
  items?: MenuItem[];
}

export interface MenuCategory {
  id: string;
  label: string;
  items: MenuItem[];
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onAbout,
  onPreferences,
  onQuit,
  onNew,
  onOpenSvg,
  onPlaceAsset,
  onSave,
  onSaveAs,
  onExportSvg,
  onExportPng,
  onDocumentSetup,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onCut,
  onCopy,
  onPaste,
  onPasteInFront,
  onPasteInBack,
  onPasteInPlace,
  onDuplicate,
  onDelete,
  hasSelection,
  hasClipboard = false,
  onTransformMove,
  onTransformRotate,
  onTransformScale,
  onTransformReflect,
  onGroup,
  onUngroup,
  onBringForward,
  onBringToFront,
  onSendBackward,
  onSendToBack,
  onLock,
  onUnlockAll,
  onHide,
  onShowAll,
  onMakeClippingMask,
  onReleaseClippingMask,
  onMakeCompoundPath,
  onReleaseCompoundPath,
  canPathfinder,
  onPathfinderUnion,
  onPathfinderSubtract,
  onPathfinderIntersect,
  onPathfinderExclude,
  onToggleBold,
  onToggleItalic,
  onChangeFontSize,
  onChangeFontFamily,
  onCreateOutlines,
  isTextSelected = false,
  onSelectAll,
  onDeselectAll,
  onSelectInverse,
  onSelectSameAppearance,
  onSelectSameFill,
  onSelectSameStroke,
  outlineMode = false,
  onToggleOutlineMode,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onActualSize,
  showRulers = false,
  onToggleRulers,
  showGuides = true,
  onToggleGuides,
  showGrid,
  onToggleGrid,
  showLayers = false,
  onToggleLayers,
  showProperties = true,
  onToggleProperties,
  onToggleToolbarColumns,
  onShowShortcuts,
  onOpenGithub,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
        setActiveSubmenuId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null);
        setActiveSubmenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const menus: MenuCategory[] = [
    // 1. App Menu (Forma)
    {
      id: 'forma',
      label: 'Forma',
      items: [
        {
          id: 'about',
          label: 'About Forma',
          icon: Info,
          action: onAbout,
        },
        { id: 'div-forma-1', label: '', divider: true },
        {
          id: 'preferences',
          label: 'Preferences…',
          shortcut: '⌘,',
          icon: Settings,
          action: onPreferences,
        },
        { id: 'div-forma-2', label: '', divider: true },
        {
          id: 'quit',
          label: 'Quit Forma',
          shortcut: '⌘Q',
          action: onQuit,
        },
      ],
    },
    // 2. File Menu
    {
      id: 'file',
      label: 'File',
      items: [
        {
          id: 'new',
          label: 'New Document…',
          shortcut: '⌘N',
          icon: FilePlus,
          action: onNew,
        },
        {
          id: 'open',
          label: 'Open…',
          shortcut: '⌘O',
          icon: FolderOpen,
          action: onOpenSvg,
        },
        {
          id: 'open-recent',
          label: 'Open Recent',
          items: [
            { id: 'recent-1', label: 'Artboard Preset FHD.svg', action: onOpenSvg },
            { id: 'recent-2', label: 'Vector Icon Studio.svg', action: onOpenSvg },
          ],
        },
        {
          id: 'place',
          label: 'Place Asset…',
          shortcut: '⇧⌘P',
          icon: FolderOpen,
          action: onPlaceAsset,
        },
        { id: 'div-file-1', label: '', divider: true },
        {
          id: 'save',
          label: 'Save',
          shortcut: '⌘S',
          icon: Save,
          action: onSave || (() => onExportSvg('artboard')),
        },
        {
          id: 'save-as',
          label: 'Save As…',
          shortcut: '⇧⌘S',
          icon: Download,
          action: onSaveAs || (() => onExportPng('artboard')),
        },
        {
          id: 'export-sub',
          label: 'Export',
          icon: Download,
          items: [
            {
              id: 'export-svg-ab',
              label: 'Export As SVG (Artboard)',
              shortcut: '⌘S',
              icon: Download,
              action: () => onExportSvg('artboard'),
            },
            {
              id: 'export-svg-design',
              label: 'Export As SVG (Design Bounds)',
              shortcut: '⌥⌘S',
              icon: Download,
              action: () => onExportSvg('design'),
            },
            {
              id: 'export-png-ab',
              label: 'Export As PNG (Artboard)…',
              shortcut: '⇧⌘S',
              icon: ImageIcon,
              action: () => onExportPng('artboard'),
            },
            {
              id: 'export-png-design',
              label: 'Export As PNG (Design Bounds)…',
              shortcut: '⌥⇧⌘S',
              icon: ImageIcon,
              action: () => onExportPng('design'),
            },
          ],
        },
        { id: 'div-file-2', label: '', divider: true },
        {
          id: 'doc-setup',
          label: 'Document Setup…',
          shortcut: '⌥⌘P',
          icon: Sliders,
          action: onDocumentSetup || onNew,
        },
      ],
    },
    // 3. Edit Menu
    {
      id: 'edit',
      label: 'Edit',
      items: [
        {
          id: 'undo',
          label: 'Undo',
          shortcut: '⌘Z',
          icon: Undo2,
          action: onUndo,
          disabled: !canUndo,
        },
        {
          id: 'redo',
          label: 'Redo',
          shortcut: '⇧⌘Z',
          icon: Redo2,
          action: onRedo,
          disabled: !canRedo,
        },
        { id: 'div-edit-1', label: '', divider: true },
        {
          id: 'cut',
          label: 'Cut',
          shortcut: '⌘X',
          icon: Scissors,
          action: onCut,
          disabled: !hasSelection,
        },
        {
          id: 'copy',
          label: 'Copy',
          shortcut: '⌘C',
          icon: Copy,
          action: onCopy,
          disabled: !hasSelection,
        },
        {
          id: 'paste',
          label: 'Paste',
          shortcut: '⌘V',
          icon: Clipboard,
          action: onPaste,
          disabled: !hasClipboard,
        },
        {
          id: 'paste-in-front',
          label: 'Paste in Front',
          shortcut: '⌘F',
          action: onPasteInFront,
          disabled: !hasClipboard,
        },
        {
          id: 'paste-in-back',
          label: 'Paste in Back',
          shortcut: '⌘B',
          action: onPasteInBack,
          disabled: !hasClipboard,
        },
        {
          id: 'paste-in-place',
          label: 'Paste in Place',
          shortcut: '⇧⌘V',
          action: onPasteInPlace,
          disabled: !hasClipboard,
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          shortcut: '⌘D',
          icon: Copy,
          action: onDuplicate,
          disabled: !hasSelection,
        },
        {
          id: 'delete',
          label: 'Delete Selection',
          shortcut: '⌫',
          icon: Trash2,
          action: onDelete,
          disabled: !hasSelection,
        },
        { id: 'div-edit-2', label: '', divider: true },
        {
          id: 'preferences-edit',
          label: 'Preferences…',
          shortcut: '⌘K',
          icon: Settings,
          action: onPreferences,
        },
      ],
    },
    // 4. Object Menu
    {
      id: 'object',
      label: 'Object',
      items: [
        {
          id: 'transform-sub',
          label: 'Transform',
          icon: Compass,
          disabled: !hasSelection,
          items: [
            {
              id: 'trans-move',
              label: 'Move…',
              icon: Move,
              action: () => onTransformMove?.(10, 10),
            },
            {
              id: 'trans-rot-cw',
              label: 'Rotate 90° Clockwise',
              shortcut: '⌘R',
              icon: RotateCw,
              action: () => onTransformRotate?.(90),
            },
            {
              id: 'trans-rot-ccw',
              label: 'Rotate 90° Counter-Clockwise',
              action: () => onTransformRotate?.(-90),
            },
            {
              id: 'trans-scale-up',
              label: 'Scale 150%',
              icon: Scaling,
              action: () => onTransformScale?.(1.5),
            },
            {
              id: 'trans-scale-down',
              label: 'Scale 50%',
              icon: Scaling,
              action: () => onTransformScale?.(0.5),
            },
            {
              id: 'trans-reflect-h',
              label: 'Reflect Horizontal',
              icon: FlipHorizontal,
              action: () => onTransformReflect?.('horizontal'),
            },
            {
              id: 'trans-reflect-v',
              label: 'Reflect Vertical',
              action: () => onTransformReflect?.('vertical'),
            },
          ],
        },
        {
          id: 'arrange-sub',
          label: 'Arrange',
          disabled: !hasSelection,
          items: [
            {
              id: 'bring-to-front',
              label: 'Bring to Front',
              shortcut: '⇧⌘]',
              icon: ArrowUp,
              action: onBringToFront,
            },
            {
              id: 'bring-forward',
              label: 'Bring Forward',
              shortcut: '⌘]',
              icon: ArrowUp,
              action: onBringForward,
            },
            {
              id: 'send-backward',
              label: 'Send Backward',
              shortcut: '⌘[',
              icon: ArrowDown,
              action: onSendBackward,
            },
            {
              id: 'send-to-back',
              label: 'Send to Back',
              shortcut: '⇧⌘[',
              icon: ArrowDown,
              action: onSendToBack,
            },
          ],
        },
        { id: 'div-obj-1', label: '', divider: true },
        {
          id: 'group',
          label: 'Group',
          shortcut: '⌘G',
          icon: Layers,
          action: onGroup,
          disabled: !hasSelection,
        },
        {
          id: 'ungroup',
          label: 'Ungroup',
          shortcut: '⇧⌘G',
          icon: Ungroup,
          action: onUngroup,
          disabled: !hasSelection,
        },
        { id: 'div-obj-2', label: '', divider: true },
        {
          id: 'lock',
          label: 'Lock Selection',
          shortcut: '⌘2',
          icon: Lock,
          action: onLock,
          disabled: !hasSelection,
        },
        {
          id: 'unlock-all',
          label: 'Unlock All',
          shortcut: '⌥⌘2',
          icon: Unlock,
          action: onUnlockAll,
        },
        {
          id: 'hide',
          label: 'Hide Selection',
          shortcut: '⌘3',
          icon: EyeOff,
          action: onHide,
          disabled: !hasSelection,
        },
        {
          id: 'show-all',
          label: 'Show All',
          shortcut: '⌥⌘3',
          icon: Eye,
          action: onShowAll,
        },
        { id: 'div-obj-3', label: '', divider: true },
        {
          id: 'clipping-mask-sub',
          label: 'Clipping Mask',
          items: [
            {
              id: 'make-mask',
              label: 'Make',
              shortcut: '⌘7',
              action: onMakeClippingMask,
              disabled: !hasSelection,
            },
            {
              id: 'release-mask',
              label: 'Release',
              shortcut: '⌥⌘7',
              action: onReleaseClippingMask,
              disabled: !hasSelection,
            },
          ],
        },
        {
          id: 'compound-path-sub',
          label: 'Compound Path',
          items: [
            {
              id: 'make-compound',
              label: 'Make',
              shortcut: '⌘8',
              action: onMakeCompoundPath,
              disabled: !hasSelection,
            },
            {
              id: 'release-compound',
              label: 'Release',
              shortcut: '⌥⌘8',
              action: onReleaseCompoundPath,
              disabled: !hasSelection,
            },
          ],
        },
        {
          id: 'pathfinder-sub',
          label: 'Pathfinder',
          items: [
            {
              id: 'pathfinder-unite',
              label: 'Unite',
              shortcut: '⌥⌘U',
              action: onPathfinderUnion,
              disabled: !canPathfinder,
            },
            {
              id: 'pathfinder-subtract',
              label: 'Minus Front',
              shortcut: '⌥⌘-',
              action: onPathfinderSubtract,
              disabled: !canPathfinder,
            },
            {
              id: 'pathfinder-intersect',
              label: 'Intersect',
              shortcut: '⌥⌘I',
              action: onPathfinderIntersect,
              disabled: !canPathfinder,
            },
            {
              id: 'pathfinder-exclude',
              label: 'Exclude',
              shortcut: '⌥⌘X',
              action: onPathfinderExclude,
              disabled: !canPathfinder,
            },
          ],
        },
      ],
    },
    // 5. Type Menu
    {
      id: 'type',
      label: 'Type',
      items: [
        {
          id: 'font-sub',
          label: 'Font',
          icon: Type,
          items: [
            { id: 'f-inter', label: 'Inter', action: () => onChangeFontFamily?.('Inter, sans-serif') },
            { id: 'f-roboto', label: 'Roboto', action: () => onChangeFontFamily?.('Roboto, sans-serif') },
            { id: 'f-playfair', label: 'Playfair Display', action: () => onChangeFontFamily?.('Playfair Display, serif') },
            { id: 'f-fira', label: 'Fira Code', action: () => onChangeFontFamily?.('Fira Code, monospace') },
            { id: 'f-helvetica', label: 'Helvetica Neue', action: () => onChangeFontFamily?.('Helvetica Neue, sans-serif') },
            { id: 'f-georgia', label: 'Georgia', action: () => onChangeFontFamily?.('Georgia, serif') },
          ],
        },
        {
          id: 'size-sub',
          label: 'Size',
          items: [
            { id: 'sz-12', label: '12 pt', action: () => onChangeFontSize?.(12) },
            { id: 'sz-14', label: '14 pt', action: () => onChangeFontSize?.(14) },
            { id: 'sz-18', label: '18 pt', action: () => onChangeFontSize?.(18) },
            { id: 'sz-24', label: '24 pt', action: () => onChangeFontSize?.(24) },
            { id: 'sz-36', label: '36 pt', action: () => onChangeFontSize?.(36) },
            { id: 'sz-48', label: '48 pt', action: () => onChangeFontSize?.(48) },
            { id: 'sz-72', label: '72 pt', action: () => onChangeFontSize?.(72) },
          ],
        },
        { id: 'div-type-1', label: '', divider: true },
        {
          id: 'type-bold',
          label: 'Bold',
          shortcut: '⌘B',
          icon: Bold,
          action: onToggleBold,
          disabled: !isTextSelected,
        },
        {
          id: 'type-italic',
          label: 'Italic',
          shortcut: '⌘I',
          icon: Italic,
          action: onToggleItalic,
          disabled: !isTextSelected,
        },
        { id: 'div-type-2', label: '', divider: true },
        {
          id: 'create-outlines',
          label: 'Create Outlines',
          shortcut: '⇧⌘O',
          action: onCreateOutlines,
          disabled: !isTextSelected,
        },
      ],
    },
    // 6. Select Menu
    {
      id: 'select',
      label: 'Select',
      items: [
        {
          id: 'select-all',
          label: 'All',
          shortcut: '⌘A',
          action: onSelectAll,
        },
        {
          id: 'deselect-all',
          label: 'Deselect',
          shortcut: '⇧⌘A',
          action: onDeselectAll,
          disabled: !hasSelection,
        },
        {
          id: 'select-inverse',
          label: 'Inverse',
          shortcut: '⇧⌘I',
          action: onSelectInverse,
        },
        { id: 'div-sel-1', label: '', divider: true },
        {
          id: 'select-same-sub',
          label: 'Same',
          disabled: !hasSelection,
          items: [
            {
              id: 'same-appearance',
              label: 'Appearance',
              action: onSelectSameAppearance,
            },
            {
              id: 'same-fill',
              label: 'Fill Color',
              action: onSelectSameFill,
            },
            {
              id: 'same-stroke',
              label: 'Stroke Color',
              action: onSelectSameStroke,
            },
          ],
        },
      ],
    },
    // 7. View Menu
    {
      id: 'view',
      label: 'View',
      items: [
        {
          id: 'outline-mode',
          label: 'Outline Mode',
          shortcut: '⌘Y',
          action: onToggleOutlineMode,
          checked: outlineMode,
        },
        { id: 'div-view-1', label: '', divider: true },
        {
          id: 'zoom-in',
          label: 'Zoom In',
          shortcut: '⌘=',
          icon: ZoomIn,
          action: onZoomIn,
        },
        {
          id: 'zoom-out',
          label: 'Zoom Out',
          shortcut: '⌘-',
          icon: ZoomOut,
          action: onZoomOut,
        },
        {
          id: 'fit-artboard',
          label: 'Fit Artboard in Window',
          shortcut: '⌘0',
          icon: RotateCcw,
          action: onResetZoom,
        },
        {
          id: 'actual-size',
          label: 'Actual Size (100%)',
          shortcut: '⌘1',
          action: onActualSize || onResetZoom,
        },
        { id: 'div-view-2', label: '', divider: true },
        {
          id: 'toggle-rulers',
          label: 'Rulers',
          shortcut: '⌘R',
          icon: Ruler,
          action: onToggleRulers,
          checked: showRulers,
        },
        {
          id: 'toggle-guides',
          label: 'Guides',
          shortcut: '⌘;',
          action: onToggleGuides,
          checked: showGuides,
        },
        {
          id: 'toggle-grid',
          label: 'Grid Lines',
          shortcut: "⌘'",
          icon: Grid,
          action: onToggleGrid,
          checked: showGrid,
        },
      ],
    },
    // 8. Window Menu
    {
      id: 'window',
      label: 'Window',
      items: [
        {
          id: 'win-tools',
          label: 'Tools (Toggle Columns)',
          action: onToggleToolbarColumns,
          checked: true,
        },
        {
          id: 'win-properties',
          label: 'Properties Panel',
          action: onToggleProperties,
          checked: showProperties,
        },
        {
          id: 'win-layers',
          label: 'Layers Panel',
          shortcut: '⌘L',
          icon: Layers,
          action: onToggleLayers,
          checked: showLayers,
        },
        { id: 'div-win-1', label: '', divider: true },
        {
          id: 'win-swatches',
          label: 'Swatches',
          checked: true,
        },
        {
          id: 'win-align',
          label: 'Align & Transform',
          checked: true,
        },
        {
          id: 'win-history',
          label: 'History & State',
          checked: true,
        },
      ],
    },
    // 9. Help Menu
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          id: 'shortcuts-modal',
          label: 'Keyboard Shortcuts',
          icon: Compass,
          action: onShowShortcuts,
        },
        {
          id: 'github-repo',
          label: 'GitHub Repository',
          icon: Code2,
          action: onOpenGithub,
        },
        { id: 'div-help-1', label: '', divider: true },
        {
          id: 'about-forma',
          label: 'About Forma Vector Studio',
          icon: Info,
          action: onAbout,
        },
      ],
    },
  ];

  const handleMenuClick = (menuId: string) => {
    if (activeMenuId === menuId) {
      setActiveMenuId(null);
      setActiveSubmenuId(null);
    } else {
      setActiveMenuId(menuId);
      setActiveSubmenuId(null);
    }
  };

  const handleMenuMouseEnter = (menuId: string) => {
    // switchOnHover: When any top-level menu is open, hovering adjacent menu opens it immediately
    if (activeMenuId !== null && activeMenuId !== menuId) {
      setActiveMenuId(menuId);
      setActiveSubmenuId(null);
    }
  };

  const executeItemAction = (item: MenuItem) => {
    if (item.disabled || item.divider || item.items) return;
    setActiveMenuId(null);
    setActiveSubmenuId(null);
    item.action?.();
  };

  return (
    <nav
      ref={containerRef}
      className="flex items-center gap-0.5 select-none"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {menus.map((menu) => {
        const isOpen = activeMenuId === menu.id;

        return (
          <div key={menu.id} className="relative">
            {/* Top Level Menu Button */}
            <button
              type="button"
              onClick={() => handleMenuClick(menu.id)}
              onMouseEnter={() => handleMenuMouseEnter(menu.id)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                isOpen
                  ? 'bg-zinc-700/80 text-white shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80 active:bg-zinc-700/60'
              }`}
            >
              {menu.label}
            </button>

            {/* Dropdown Menu Panel */}
            {isOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl bg-[#1c1c20] border border-white/10 shadow-2xl shadow-black/90 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-75">
                {menu.items.map((item, idx) => {
                  if (item.divider) {
                    return <div key={`div-${idx}`} className="h-px bg-white/[0.08] my-1" />;
                  }

                  const Icon = item.icon;
                  const hasSubmenu = Boolean(item.items && item.items.length > 0);
                  const isSubmenuOpen = activeSubmenuId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="relative"
                      onMouseEnter={() => {
                        if (hasSubmenu) {
                          setActiveSubmenuId(item.id);
                        } else {
                          setActiveSubmenuId(null);
                        }
                      }}
                    >
                      <button
                        type="button"
                        disabled={item.disabled}
                        onClick={() => executeItemAction(item)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                          item.disabled
                            ? 'text-zinc-600 cursor-not-allowed opacity-50'
                            : isSubmenuOpen
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-200 hover:text-white hover:bg-sky-600/90 active:bg-sky-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {Icon ? (
                            <Icon className="w-3.5 h-3.5 opacity-80 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.checked !== undefined && (
                            <Check
                              className={`w-3.5 h-3.5 ${
                                item.checked ? 'text-sky-400' : 'opacity-0'
                              }`}
                            />
                          )}
                          {item.shortcut && (
                            <kbd className="text-[10px] font-mono tracking-wider opacity-60">
                              {item.shortcut}
                            </kbd>
                          )}
                          {hasSubmenu && (
                            <ChevronRight className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                          )}
                        </div>
                      </button>

                      {/* Nested Submenu Flyout */}
                      {hasSubmenu && isSubmenuOpen && (
                        <div className="absolute left-full top-0 ml-1 w-56 rounded-xl bg-[#1c1c20] border border-white/10 shadow-2xl shadow-black/90 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-75">
                          {item.items!.map((subItem, sIdx) => {
                            if (subItem.divider) {
                              return (
                                <div
                                  key={`subdiv-${sIdx}`}
                                  className="h-px bg-white/[0.08] my-1"
                                />
                              );
                            }

                            const SubIcon = subItem.icon;

                            return (
                              <button
                                key={subItem.id}
                                type="button"
                                disabled={subItem.disabled}
                                onClick={() => executeItemAction(subItem)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                                  subItem.disabled
                                    ? 'text-zinc-600 cursor-not-allowed opacity-50'
                                    : 'text-zinc-200 hover:text-white hover:bg-sky-600/90 active:bg-sky-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  {SubIcon ? (
                                    <SubIcon className="w-3.5 h-3.5 opacity-80 shrink-0" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span className="truncate">{subItem.label}</span>
                                </div>

                                {subItem.shortcut && (
                                  <kbd className="text-[10px] font-mono tracking-wider opacity-60">
                                    {subItem.shortcut}
                                  </kbd>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};
