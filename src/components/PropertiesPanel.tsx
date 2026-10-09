import React, { useState, useRef, useMemo } from 'react';
import {
  VectorElement,
  PathElement,
  TextElement,
  ImageElement,
  RectElement,
  GradientFill,
  FillType,
  StrokeCap,
  StrokeJoin,
  PathfinderOp,
  TextAlign,
  Artboard,
  UnitType,
  ViewTransform,
  ExportMode,
  ToolType,
} from '../types/vector';
import {
  SlidersHorizontal,
  Layers,
  Library,
  ChevronsRight,
  ChevronsLeft,
  Trash2,
  CheckCircle2,
  Palette,
  ArrowLeftRight,
  Plus,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
  RotateCw,
  FilePlus,
  Download,
  Image as ImageIcon,
  Grid,
  Ruler,
  Crosshair,
  Lock,
  Unlock,
  Link as LinkIcon,
  Unlink,
  Eye,
  EyeOff,
  Folder,
  Square,
  Circle,
  PenTool,
  Maximize2,
  Settings,
  Sparkles,
  GripVertical,
  ChevronRight,
  ChevronDown,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  X,
  Check,
} from 'lucide-react';
import { getElementBoundingBox } from '../engine/transform';
import { getLayerDisplayName } from '../engine/layers';

export type RightSidebarTab = 'properties' | 'layers' | 'libraries';

export type ReferencePoint =
  | 'nw'
  | 'n'
  | 'ne'
  | 'w'
  | 'center'
  | 'e'
  | 'sw'
  | 's'
  | 'se';

export interface PropertiesPanelProps {
  // Elements & Selection
  elements: VectorElement[];
  selectedElement: VectorElement | null;
  selectedIds: string[];
  selectedCount: number;

  // Active Tool
  currentTool?: ToolType;
  onSelectTool?: (tool: ToolType) => void;

  // Defaults
  defaultFill: string;
  defaultStroke: string;
  defaultStrokeWidth: number;
  defaultOpacity: number;

  // Property Change Handlers
  onChangeProperties: (props: {
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
  }) => void;
  onDeleteSelected: () => void;
  onClosePath?: () => void;
  onApplyPathfinder: (op: PathfinderOp) => void;

  // Transform Actions
  onTransformRotate?: (deg: number) => void;
  onTransformReflect?: (axis: 'horizontal' | 'vertical') => void;
  onAlign?: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onLockSelected?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onMakeClippingMask?: () => void;

  // Context-Aware Document Setup Mode (State A)
  artboard?: Artboard | null;
  onUpdateArtboard?: (ab: Artboard) => void;
  onEditArtboard?: () => void;
  onNewArtboard?: () => void;
  onDeleteArtboard?: () => void;
  showRulers?: boolean;
  onToggleRulers?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  showTransparencyGrid?: boolean;
  onToggleTransparencyGrid?: () => void;
  transform?: ViewTransform;
  onResetZoom?: () => void;
  onExportSvg?: (mode?: ExportMode) => void;
  onExportPng?: (mode?: ExportMode) => void;
  onNewDocument?: () => void;
  onPreferences?: () => void;

  // Layers Tab Integration
  onSelectElement?: (id: string, isShift?: boolean) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onRenameLayer?: (id: string, newName: string) => void;
  onReorderLayers?: (fromIndex: number, toIndex: number) => void;
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;

  // Libraries / Assets Tab
  onPlaceAsset?: () => void;

  // Unified Dock Integration
  hideTabBar?: boolean;
}

const PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#64748b',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
];

const GRADIENT_PRESETS: Array<{ name: string; stops: Array<{ offset: number; color: string }> }> = [
  {
    name: 'Sunset',
    stops: [
      { offset: 0, color: '#f97316' },
      { offset: 0.5, color: '#ec4899' },
      { offset: 1, color: '#8b5cf6' },
    ],
  },
  {
    name: 'Ocean',
    stops: [
      { offset: 0, color: '#06b6d4' },
      { offset: 1, color: '#3b82f6' },
    ],
  },
  {
    name: 'Neon',
    stops: [
      { offset: 0, color: '#22c55e' },
      { offset: 1, color: '#06b6d4' },
    ],
  },
  {
    name: 'Monochrome',
    stops: [
      { offset: 0, color: '#ffffff' },
      { offset: 1, color: '#18181b' },
    ],
  },
];

const ARTBOARD_PRESETS = [
  { name: 'Web FHD (1920 × 1080)', width: 1920, height: 1080, unit: 'px' as UnitType },
  { name: 'MacBook (1440 × 900)', width: 1440, height: 900, unit: 'px' as UnitType },
  { name: 'HD (1280 × 720)', width: 1280, height: 720, unit: 'px' as UnitType },
  { name: 'Instagram Post (1080 × 1080)', width: 1080, height: 1080, unit: 'px' as UnitType },
  { name: 'Story / Reel (1080 × 1920)', width: 1080, height: 1920, unit: 'px' as UnitType },
  { name: 'Social Banner (1200 × 630)', width: 1200, height: 630, unit: 'px' as UnitType },
  { name: 'A4 (210 × 297 mm)', width: 794, height: 1123, unit: 'mm' as UnitType },
  { name: 'Letter (8.5 × 11 in)', width: 816, height: 1056, unit: 'in' as UnitType },
  { name: 'Business Card (3.5 × 2 in)', width: 336, height: 192, unit: 'in' as UnitType },
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  elements,
  selectedElement,
  selectedIds,
  selectedCount,
  currentTool = 'select',
  onSelectTool,
  defaultFill,
  defaultStroke,
  defaultStrokeWidth,
  defaultOpacity,
  onChangeProperties,
  onDeleteSelected,
  onClosePath,
  onApplyPathfinder,
  onTransformRotate,
  onTransformReflect,
  onAlign,
  onLockSelected,
  onBringToFront,
  onSendToBack,
  onMakeClippingMask,
  artboard,
  onUpdateArtboard,
  onEditArtboard,
  onNewArtboard,
  onDeleteArtboard,
  showRulers = false,
  onToggleRulers,
  showGrid = true,
  onToggleGrid,
  showTransparencyGrid = false,
  onToggleTransparencyGrid,
  transform,
  onResetZoom,
  onExportSvg,
  onExportPng,
  onNewDocument,
  onPreferences,
  onSelectElement,
  onToggleVisibility,
  onToggleLock,
  onRenameLayer,
  onReorderLayers,
  onGroupSelected,
  onUngroupSelected,
  onPlaceAsset,
  hideTabBar = false,
}) => {
  // Sidebar tab & dock collapse state
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('properties');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Transform Card reference point (9-dot anchor grid)
  const [referencePoint, setReferencePoint] = useState<ReferencePoint>('center');

  // Transform Card aspect lock state
  const [isAspectLocked, setIsAspectLocked] = useState<boolean>(true);

  // Document setup toggles state
  const [snapToGridState, setSnapToGridState] = useState<boolean>(true);
  const [snapToPointsState, setSnapToPointsState] = useState<boolean>(true);
  const [smartGuidesState, setSmartGuidesState] = useState<boolean>(true);
  const [keyboardIncrement, setKeyboardIncrement] = useState<number>(1);
  const [scaleStrokes, setScaleStrokes] = useState<boolean>(true);

  // Rotation manual input state
  const [rotationInput, setRotationInput] = useState<string>('0');

  // Gradient Editor State
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const gradientBarRef = useRef<HTMLDivElement>(null);

  // Image replacement file input ref
  const replaceImageInputRef = useRef<HTMLInputElement | null>(null);

  // Layers Tab inline rename & drag state
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState<string>('');
  const [draggedLayerIdx, setDraggedLayerIdx] = useState<number | null>(null);
  const [dragOverLayerIdx, setDragOverLayerIdx] = useState<number | null>(null);

  // Extract selected element properties
  const fill = selectedElement ? selectedElement.fill : defaultFill;
  const stroke = selectedElement ? selectedElement.stroke : defaultStroke;
  const strokeWidth = selectedElement ? selectedElement.strokeWidth : defaultStrokeWidth;
  const opacity = selectedElement ? selectedElement.opacity : defaultOpacity;

  const fillType: FillType =
    selectedElement?.fillType || (selectedElement?.gradient ? selectedElement.gradient.type : 'solid');
  const gradient: GradientFill | undefined = selectedElement?.gradient;
  const strokeCap: StrokeCap = selectedElement?.strokeCap || 'round';
  const strokeJoin: StrokeJoin = selectedElement?.strokeJoin || 'round';
  const strokeDashArray = selectedElement?.strokeDashArray || [];

  const isPath = selectedElement?.type === 'path';
  const pathElement = isPath ? (selectedElement as PathElement) : null;
  const textElement = selectedElement?.type === 'text' ? (selectedElement as TextElement) : null;
  const imageElement = selectedElement?.type === 'image' ? (selectedElement as ImageElement) : null;
  const rectElement = selectedElement?.type === 'rectangle' ? (selectedElement as RectElement) : null;

  // Selected element bounding box for transform card
  const boundingBox = useMemo(() => {
    if (!selectedElement) return null;
    return getElementBoundingBox(selectedElement);
  }, [selectedElement]);

  // Coordinates calculated from reference point
  const refCoords = useMemo(() => {
    if (!boundingBox) return { x: 0, y: 0, w: 0, h: 0 };
    let x = boundingBox.centerX;
    let y = boundingBox.centerY;

    if (referencePoint === 'nw' || referencePoint === 'w' || referencePoint === 'sw') {
      x = boundingBox.minX;
    } else if (referencePoint === 'ne' || referencePoint === 'e' || referencePoint === 'se') {
      x = boundingBox.maxX;
    }

    if (referencePoint === 'nw' || referencePoint === 'n' || referencePoint === 'ne') {
      y = boundingBox.minY;
    } else if (referencePoint === 'sw' || referencePoint === 's' || referencePoint === 'se') {
      y = boundingBox.maxY;
    }

    return {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(boundingBox.width),
      h: Math.round(boundingBox.height),
    };
  }, [boundingBox, referencePoint]);

  // Extract all unique colors used in current document for Libraries tab
  const documentColors = useMemo(() => {
    const set = new Set<string>();
    for (const el of elements) {
      if (el.fill && el.fill !== 'none' && !el.fill.startsWith('url')) {
        set.add(el.fill);
      }
      if (el.stroke && el.stroke !== 'none') {
        set.add(el.stroke);
      }
      if (el.gradient) {
        for (const stop of el.gradient.stops) {
          set.add(stop.color);
        }
      }
    }
    return Array.from(set);
  }, [elements]);

  // Placed media assets for Libraries tab
  const placedAssets = useMemo(() => {
    return elements.filter(
      (el) =>
        el.type === 'image' ||
        (el.name && el.name.toLowerCase().includes('imported')) ||
        (el.name && el.name.toLowerCase().includes('svg'))
    );
  }, [elements]);

  // Context Detection Modes
  const isArtboardTool = currentTool === 'artboard';
  const hasSelection = selectedCount > 0 && selectedElement !== null;
  const isTextSelected = hasSelection && selectedElement?.type === 'text';

  // -------------------------------------------------------------
  // TRANSFORM POSITION HANDLER (Relative to 9-dot Reference Point)
  // -------------------------------------------------------------
  const handleRefCoordChange = (axis: 'x' | 'y', newCoord: number) => {
    if (!boundingBox) return;
    if (axis === 'x') {
      let delta = 0;
      if (referencePoint === 'nw' || referencePoint === 'w' || referencePoint === 'sw') {
        delta = newCoord - boundingBox.minX;
      } else if (referencePoint === 'ne' || referencePoint === 'e' || referencePoint === 'se') {
        delta = newCoord - boundingBox.maxX;
      } else {
        delta = newCoord - boundingBox.centerX;
      }
      onChangeProperties({ x: boundingBox.minX + delta });
    } else {
      let delta = 0;
      if (referencePoint === 'nw' || referencePoint === 'n' || referencePoint === 'ne') {
        delta = newCoord - boundingBox.minY;
      } else if (referencePoint === 'sw' || referencePoint === 's' || referencePoint === 'se') {
        delta = newCoord - boundingBox.maxY;
      } else {
        delta = newCoord - boundingBox.centerY;
      }
      onChangeProperties({ y: boundingBox.minY + delta });
    }
  };

  // -------------------------------------------------------------
  // GRADIENT ACTIONS
  // -------------------------------------------------------------
  const handleSetFillType = (type: FillType) => {
    if (type === 'solid') {
      onChangeProperties({
        fillType: 'solid',
        fill: fill === 'none' ? '#3b82f6' : fill,
        gradient: undefined,
      });
    } else {
      const stops = gradient?.stops || [
        { id: '1', offset: 0, color: '#38bdf8' },
        { id: '2', offset: 1, color: '#6366f1' },
      ];
      onChangeProperties({
        fillType: type,
        fill: stops[0]?.color || '#38bdf8',
        gradient: {
          type,
          stops,
          startX: 0,
          startY: 0.5,
          endX: 1,
          endY: 0.5,
        },
      });
    }
  };

  const handleApplyPresetGradient = (preset: (typeof GRADIENT_PRESETS)[0]) => {
    const stops = preset.stops.map((s, idx) => ({
      id: `stop-${idx}`,
      offset: s.offset,
      color: s.color,
    }));
    onChangeProperties({
      fillType: 'linear',
      fill: stops[0].color,
      gradient: {
        type: 'linear',
        stops,
        startX: 0,
        startY: 0.5,
        endX: 1,
        endY: 0.5,
      },
    });
  };

  const handleUpdateStopColor = (color: string) => {
    if (!gradient) return;
    const newStops = [...gradient.stops];
    if (newStops[activeStopIndex]) {
      newStops[activeStopIndex] = { ...newStops[activeStopIndex], color };
      onChangeProperties({
        gradient: { ...gradient, stops: newStops },
      });
    }
  };

  const handleUpdateStopOffset = (offset: number) => {
    if (!gradient) return;
    const newStops = [...gradient.stops];
    if (newStops[activeStopIndex]) {
      newStops[activeStopIndex] = {
        ...newStops[activeStopIndex],
        offset: Math.max(0, Math.min(1, offset)),
      };
      newStops.sort((a, b) => a.offset - b.offset);
      onChangeProperties({
        gradient: { ...gradient, stops: newStops },
      });
    }
  };

  const handleAddStop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gradient || !gradientBarRef.current) return;
    const rect = gradientBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const offset = Math.max(0, Math.min(1, clickX / rect.width));

    const newStop = {
      id: `stop_${Date.now()}`,
      offset: parseFloat(offset.toFixed(2)),
      color: '#ffffff',
    };
    const newStops = [...gradient.stops, newStop].sort((a, b) => a.offset - b.offset);
    const newIndex = newStops.findIndex((s) => s.id === newStop.id);
    setActiveStopIndex(newIndex >= 0 ? newIndex : 0);

    onChangeProperties({
      gradient: { ...gradient, stops: newStops },
    });
  };

  const handleRemoveActiveStop = () => {
    if (!gradient || gradient.stops.length <= 2) return;
    const newStops = gradient.stops.filter((_, idx) => idx !== activeStopIndex);
    setActiveStopIndex(Math.max(0, activeStopIndex - 1));
    onChangeProperties({
      gradient: { ...gradient, stops: newStops },
    });
  };

  // Image replacement file handler
  const handleReplaceImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) {
        onChangeProperties({ src });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------
  // RENDER: COLLAPSED DOCK ICON STRIP
  // -------------------------------------------------------------
  if (!hideTabBar && isCollapsed) {
    return (
      <aside className="w-12 bg-[#141416] border-l border-white/[0.08] flex flex-col items-center py-3 gap-3 z-20 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          title="Expand Properties Panel (<<)"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <div className="w-6 h-px bg-white/10 my-1" />

        <button
          onClick={() => {
            setActiveTab('properties');
            setIsCollapsed(false);
          }}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'properties'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Properties"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setActiveTab('layers');
            setIsCollapsed(false);
          }}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'layers'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Layers"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setActiveTab('libraries');
            setIsCollapsed(false);
          }}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'libraries'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Libraries & Swatches"
        >
          <Library className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // RENDER: EXPANDED DOCKED RIGHT SIDEBAR
  // -------------------------------------------------------------
  return (
    <aside
      className={`flex flex-col h-full select-none overflow-hidden ${
        hideTabBar
          ? 'w-full'
          : 'w-80 bg-[#161619]/95 backdrop-blur border-l border-white/[0.08] z-20 animate-in slide-in-from-right-4 duration-150'
      }`}
    >
      {/* Hidden image replace input */}
      <input
        type="file"
        ref={replaceImageInputRef}
        onChange={handleReplaceImageFile}
        accept="image/*,.svg,.psd,.ai,.eps"
        className="hidden"
      />

      {/* 1. DOCKED TOP TABS (Illustrator Style: Properties | Layers | Libraries) */}
      {!hideTabBar && (
        <div className="h-11 px-2.5 border-b border-white/[0.08] flex items-center justify-between bg-[#121214]/90">
          <div className="flex items-center gap-1 p-0.5 bg-zinc-900/90 rounded-lg border border-white/5">
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'properties'
                  ? 'bg-zinc-800 text-sky-400 font-semibold shadow-sm border border-white/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Properties</span>
            </button>

            <button
              onClick={() => setActiveTab('layers')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'layers'
                  ? 'bg-zinc-800 text-sky-400 font-semibold shadow-sm border border-white/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Layers</span>
              {elements.length > 0 && (
                <span className="text-[10px] px-1 py-0.2 bg-zinc-800 text-zinc-400 rounded-full font-mono">
                  {elements.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('libraries')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'libraries'
                  ? 'bg-zinc-800 text-sky-400 font-semibold shadow-sm border border-white/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              <span>Libraries</span>
            </button>
          </div>

          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-md transition-colors cursor-pointer"
            title="Collapse Sidebar (>>)"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. TAB BODY CONTENT */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {/* ========================================================= */}
        {/* TAB 1: PROPERTIES (Dynamic 4-Mode Context Architecture)    */}
        {/* ========================================================= */}
        {activeTab === 'properties' && (
          <>
            {/* ------------------------------------------------------- */}
            {/* MODE D: ARTBOARD TOOL ACTIVE                            */}
            {/* ------------------------------------------------------- */}
            {isArtboardTool && artboard && (
              <div className="space-y-3.5 animate-in fade-in duration-100">
                {/* Header */}
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Square className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
                      Artboard Options
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectTool?.('select')}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium border border-white/10 transition-colors"
                  >
                    Exit Tool
                  </button>
                </div>

                {/* Artboard Details Card */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400">Name</label>
                    <input
                      type="text"
                      value={artboard.name || 'Artboard 1'}
                      onChange={(e) => onUpdateArtboard?.({ ...artboard, name: e.target.value })}
                      className="w-full bg-zinc-850 border border-white/10 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Preset Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400">Preset</label>
                    <select
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10);
                        if (!isNaN(idx) && ARTBOARD_PRESETS[idx]) {
                          const p = ARTBOARD_PRESETS[idx];
                          onUpdateArtboard?.({
                            ...artboard,
                            name: p.name.split(' (')[0],
                            width: p.width,
                            height: p.height,
                            unit: p.unit,
                          });
                        }
                      }}
                      defaultValue=""
                      className="w-full bg-zinc-850 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="" disabled>Choose Preset…</option>
                      {ARTBOARD_PRESETS.map((p, idx) => (
                        <option key={p.name} value={idx}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dimensions & Orientation */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 bg-zinc-850 px-2 py-1 rounded border border-white/5">
                      <span className="text-[10px] text-zinc-500 font-mono">W</span>
                      <input
                        type="number"
                        value={Math.round(artboard.width)}
                        onChange={(e) => {
                          const val = Math.max(10, parseFloat(e.target.value) || 10);
                          onUpdateArtboard?.({ ...artboard, width: val });
                        }}
                        className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 bg-zinc-850 px-2 py-1 rounded border border-white/5">
                      <span className="text-[10px] text-zinc-500 font-mono">H</span>
                      <input
                        type="number"
                        value={Math.round(artboard.height)}
                        onChange={(e) => {
                          const val = Math.max(10, parseFloat(e.target.value) || 10);
                          onUpdateArtboard?.({ ...artboard, height: val });
                        }}
                        className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onUpdateArtboard?.({
                          ...artboard,
                          width: artboard.height,
                          height: artboard.width,
                        });
                      }}
                      className="flex items-center justify-center gap-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 rounded text-xs transition-colors cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>{artboard.width >= artboard.height ? 'Landscape' : 'Portrait'}</span>
                    </button>

                    <select
                      value={artboard.unit || 'px'}
                      onChange={(e) => onUpdateArtboard?.({ ...artboard, unit: e.target.value as UnitType })}
                      className="bg-zinc-850 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none cursor-pointer"
                    >
                      <option value="px">px</option>
                      <option value="pt">pt</option>
                      <option value="in">in</option>
                      <option value="mm">mm</option>
                    </select>
                  </div>
                </div>

                {/* Artboard Actions */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
                  <span className="font-medium text-zinc-300">Quick Actions</span>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => onNewArtboard ? onNewArtboard() : onNewDocument?.()}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-sky-400" />
                      <span>New Artboard</span>
                    </button>
                    <button
                      onClick={() => onDeleteArtboard ? onDeleteArtboard() : onDeleteSelected()}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-red-950 text-red-400 rounded text-xs font-medium border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------- */}
            {/* MODE A: NO SELECTION -> DOCUMENT SETUP MODE             */}
            {/* ------------------------------------------------------- */}
            {!isArtboardTool && !hasSelection && (
              <div className="space-y-3.5 animate-in fade-in duration-100">
                {/* Header */}
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                  <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-sky-400" />
                    Document
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/90 text-zinc-400 font-mono">
                    No Selection
                  </span>
                </div>

                {/* 1. Document & Artboard Card */}
                {artboard && (
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                        <Square className="w-3.5 h-3.5 text-sky-400" />
                        {artboard.name || 'Artboard 1'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {Math.round(artboard.width)} × {Math.round(artboard.height)} {artboard.unit || 'px'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Document Units</label>
                        <select
                          value={artboard.unit || 'px'}
                          onChange={(e) => onUpdateArtboard?.({ ...artboard, unit: e.target.value as UnitType })}
                          className="w-full bg-zinc-850 border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                        >
                          <option value="px">Pixels (px)</option>
                          <option value="pt">Points (pt)</option>
                          <option value="in">Inches (in)</option>
                          <option value="mm">Millimeters (mm)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Orientation</label>
                        <button
                          onClick={() => {
                            onUpdateArtboard?.({
                              ...artboard,
                              width: artboard.height,
                              height: artboard.width,
                            });
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 rounded text-xs transition-colors cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
                          <span>{artboard.width >= artboard.height ? 'Landscape' : 'Portrait'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Two Main Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={onEditArtboard || onNewDocument}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Document Setup</span>
                      </button>
                      <button
                        onClick={() => onSelectTool?.('artboard')}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Square className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit Artboards</span>
                      </button>
                    </div>

                    {/* Surface / Background */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] text-zinc-400">Artboard Surface</label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onUpdateArtboard?.({ ...artboard, backgroundColor: '#ffffff' })}
                          className={`flex-1 py-1 rounded text-[11px] font-medium border transition-colors ${
                            artboard.backgroundColor === '#ffffff'
                              ? 'bg-zinc-800 text-sky-400 border-sky-400/40'
                              : 'bg-zinc-800/60 text-zinc-400 border-white/5 hover:text-white'
                          }`}
                        >
                          White
                        </button>
                        <button
                          onClick={() => onUpdateArtboard?.({ ...artboard, backgroundColor: 'transparent' })}
                          className={`flex-1 py-1 rounded text-[11px] font-medium border transition-colors ${
                            artboard.backgroundColor === 'transparent'
                              ? 'bg-zinc-800 text-sky-400 border-sky-400/40'
                              : 'bg-zinc-800/60 text-zinc-400 border-white/5 hover:text-white'
                          }`}
                        >
                          Transparent
                        </button>
                        <button
                          onClick={() => onUpdateArtboard?.({ ...artboard, backgroundColor: '#18181b' })}
                          className={`flex-1 py-1 rounded text-[11px] font-medium border transition-colors ${
                            artboard.backgroundColor === '#18181b'
                              ? 'bg-zinc-800 text-sky-400 border-sky-400/40'
                              : 'bg-zinc-800/60 text-zinc-400 border-white/5 hover:text-white'
                          }`}
                        >
                          Dark
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Appearance Default Swatches Preview */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-emerald-400" />
                    Appearance (Defaults)
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg border border-white/20 shadow-sm"
                        style={{ backgroundColor: defaultFill === 'none' ? 'transparent' : defaultFill }}
                      />
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Default Fill</span>
                        <span className="text-[11px] font-mono text-zinc-300">{defaultFill}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg border border-white/20 shadow-sm"
                        style={{ backgroundColor: defaultStroke }}
                      />
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Default Stroke</span>
                        <span className="text-[11px] font-mono text-zinc-300">{defaultStroke}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => onChangeProperties({ fill: c })}
                        style={{ backgroundColor: c }}
                        className="w-4 h-4 rounded-full border border-white/20 hover:scale-110 transition-transform"
                      />
                    ))}
                  </div>
                </div>

                {/* 3. Rulers & Grids */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-sky-400" />
                    Rulers & Grids
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onToggleRulers}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-colors border ${
                        showRulers
                          ? 'bg-sky-950 text-sky-400 border-sky-800/40 font-medium'
                          : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Rulers (⌘R)</span>
                    </button>

                    <button
                      onClick={onToggleGrid}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-colors border ${
                        showGrid
                          ? 'bg-sky-950 text-sky-400 border-sky-800/40 font-medium'
                          : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Grid (⌘')</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onToggleTransparencyGrid}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-colors border ${
                        showTransparencyGrid
                          ? 'bg-sky-950 text-sky-400 border-sky-800/40 font-medium'
                          : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      <span>Transparency</span>
                    </button>

                    <button
                      onClick={() => setSnapToGridState(!snapToGridState)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-colors border ${
                        snapToGridState
                          ? 'bg-sky-950 text-sky-400 border-sky-800/40 font-medium'
                          : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Snap Grid</span>
                    </button>
                  </div>
                </div>

                {/* 4. Guides & Snapping Checkboxes */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                    Guides & Snapping
                  </span>
                  <div className="space-y-1.5 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="checkbox"
                        checked={smartGuidesState}
                        onChange={(e) => setSmartGuidesState(e.target.checked)}
                        className="rounded bg-zinc-800 border-white/20 text-sky-500 focus:ring-0"
                      />
                      <span>Smart Guides (⌘U)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="checkbox"
                        checked={snapToPointsState}
                        onChange={(e) => setSnapToPointsState(e.target.checked)}
                        className="rounded bg-zinc-800 border-white/20 text-sky-500 focus:ring-0"
                      />
                      <span>Snap to Point</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="checkbox"
                        checked={snapToGridState}
                        onChange={(e) => setSnapToGridState(e.target.checked)}
                        className="rounded bg-zinc-800 border-white/20 text-sky-500 focus:ring-0"
                      />
                      <span>Snap to Grid</span>
                    </label>
                  </div>
                </div>

                {/* 5. Preferences */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Preferences
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">Keyboard Increment</span>
                    <div className="flex items-center gap-1 bg-zinc-850 px-2 py-0.5 rounded border border-white/5 w-24">
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={keyboardIncrement}
                        onChange={(e) => setKeyboardIncrement(parseFloat(e.target.value) || 1)}
                        className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                      />
                      <span className="text-[10px] text-zinc-500">pt</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300 pt-0.5">
                    <input
                      type="checkbox"
                      checked={scaleStrokes}
                      onChange={(e) => setScaleStrokes(e.target.checked)}
                      className="rounded bg-zinc-800 border-white/20 text-sky-500 focus:ring-0"
                    />
                    <span>Scale Strokes & Effects</span>
                  </label>
                </div>

                {/* 6. Quick Actions */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Quick Actions
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      onClick={onEditArtboard || onNewDocument}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors"
                    >
                      Document Setup
                    </button>
                    <button
                      onClick={onPreferences}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors"
                    >
                      Preferences (⌘K)
                    </button>
                    {onExportSvg && (
                      <button
                        onClick={() => onExportSvg('artboard')}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors"
                      >
                        Export SVG (⌘S)
                      </button>
                    )}
                    {onExportPng && (
                      <button
                        onClick={() => onExportPng('artboard')}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors"
                      >
                        Export PNG (⇧⌘S)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------- */}
            {/* MODE B & C: SELECTION ACTIVE (OBJECT INSPECTOR)         */}
            {/* ------------------------------------------------------- */}
            {!isArtboardTool && hasSelection && selectedElement && (
              <div className="space-y-3.5 animate-in fade-in duration-100">
                {/* Header: Dynamic Object Label */}
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                  <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
                    {selectedCount > 1
                      ? `${selectedCount} Objects Selected`
                      : selectedElement.name || selectedElement.type}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-sky-400 font-mono capitalize">
                    {selectedCount > 1 ? 'Multi-Selection' : selectedElement.type}
                  </span>
                </div>

                {/* 1. TRANSFORM SECTION */}
                {boundingBox && (
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between text-zinc-300 font-medium">
                      <span>Transform</span>
                      <button
                        onClick={() => setIsAspectLocked(!isAspectLocked)}
                        className={`p-1 rounded transition-colors ${
                          isAspectLocked ? 'text-sky-400 bg-sky-950/60' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title={isAspectLocked ? 'Constrain Proportions (Locked)' : 'Constrain Proportions (Unlocked)'}
                      >
                        {isAspectLocked ? <LinkIcon className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* 9-Dot Reference Point Grid Selector */}
                      <div className="p-1.5 bg-zinc-850 rounded border border-white/5 grid grid-cols-3 gap-1 w-[52px] h-[52px] shrink-0">
                        {(['nw', 'n', 'ne', 'w', 'center', 'e', 'sw', 's', 'se'] as ReferencePoint[]).map((pt) => (
                          <button
                            key={pt}
                            onClick={() => setReferencePoint(pt)}
                            className={`w-2.5 h-2.5 rounded-sm transition-all ${
                              referencePoint === pt
                                ? 'bg-sky-400 ring-1 ring-sky-300 scale-110'
                                : 'bg-zinc-650 hover:bg-zinc-400'
                            }`}
                            title={`Reference Point: ${pt}`}
                          />
                        ))}
                      </div>

                      {/* X, Y, W, H Inputs */}
                      <div className="grid grid-cols-2 gap-1.5 flex-1">
                        <div className="flex items-center gap-1.5 bg-zinc-850 px-2 py-1 rounded border border-white/5">
                          <span className="text-[10px] text-zinc-500 font-mono">X</span>
                          <input
                            type="number"
                            value={refCoords.x}
                            onChange={(e) => handleRefCoordChange('x', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-zinc-850 px-2 py-1 rounded border border-white/5">
                          <span className="text-[10px] text-zinc-500 font-mono">Y</span>
                          <input
                            type="number"
                            value={refCoords.y}
                            onChange={(e) => handleRefCoordChange('y', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-zinc-850 px-2 py-1 rounded border border-white/5">
                          <span className="text-[10px] text-zinc-500 font-mono">W</span>
                          <input
                            type="number"
                            value={refCoords.w}
                            onChange={(e) => {
                              const val = Math.max(1, parseFloat(e.target.value) || 1);
                              if (isAspectLocked && boundingBox.width > 0) {
                                const ratio = boundingBox.height / boundingBox.width;
                                onChangeProperties({ width: val, height: Math.round(val * ratio) });
                              } else {
                                onChangeProperties({ width: val });
                              }
                            }}
                            className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-zinc-850 px-2 py-1 rounded border border-white/5">
                          <span className="text-[10px] text-zinc-500 font-mono">H</span>
                          <input
                            type="number"
                            value={refCoords.h}
                            onChange={(e) => {
                              const val = Math.max(1, parseFloat(e.target.value) || 1);
                              if (isAspectLocked && boundingBox.height > 0) {
                                const ratio = boundingBox.width / boundingBox.height;
                                onChangeProperties({ height: val, width: Math.round(val * ratio) });
                              } else {
                                onChangeProperties({ height: val });
                              }
                            }}
                            className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rotation & Flip Controls */}
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1 bg-zinc-850 px-2 py-1 rounded border border-white/5 flex-1">
                        <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
                        <input
                          type="number"
                          placeholder="0°"
                          value={rotationInput}
                          onChange={(e) => setRotationInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const deg = parseFloat(rotationInput) || 0;
                              onTransformRotate?.(deg);
                            }
                          }}
                          className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                        />
                        <span className="text-[10px] text-zinc-500">°</span>
                      </div>

                      <button
                        onClick={() => onTransformRotate?.(90)}
                        className="p-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded border border-white/5 transition-colors"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onTransformReflect?.('horizontal')}
                        className="p-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded border border-white/5 transition-colors"
                        title="Flip Horizontal"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onTransformReflect?.('vertical')}
                        className="p-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded border border-white/5 transition-colors"
                        title="Flip Vertical"
                      >
                        <FlipVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Corner Radius (for rectangles) */}
                    {rectElement && (
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-[11px] text-zinc-400">Corner Radius</span>
                        <div className="flex items-center gap-1.5 bg-zinc-850 px-2 py-0.5 rounded border border-white/5 w-28">
                          <input
                            type="number"
                            min="0"
                            value={Math.round(rectElement.cornerRadius || rectElement.rx || 0)}
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0);
                              onChangeProperties({ cornerRadius: val, rx: val, ry: val });
                            }}
                            className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                          />
                          <span className="text-[10px] text-zinc-500">px</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. APPEARANCE SECTION */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-zinc-300 font-medium">
                    <span>Appearance</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {Math.round(opacity * 100)}% Opacity
                    </span>
                  </div>

                  {/* Fill Row */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">Fill</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSetFillType('solid')}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                            fillType === 'solid'
                              ? 'bg-zinc-800 text-sky-400 border-sky-400/40'
                              : 'bg-zinc-850 text-zinc-400 border-white/5'
                          }`}
                        >
                          Solid
                        </button>
                        <button
                          onClick={() => handleSetFillType('linear')}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                            fillType === 'linear'
                              ? 'bg-zinc-800 text-sky-400 border-sky-400/40'
                              : 'bg-zinc-850 text-zinc-400 border-white/5'
                          }`}
                        >
                          Linear
                        </button>
                        <button
                          onClick={() => handleSetFillType('radial')}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                            fillType === 'radial'
                              ? 'bg-zinc-800 text-sky-400 border-sky-400/40'
                              : 'bg-zinc-850 text-zinc-400 border-white/5'
                          }`}
                        >
                          Radial
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          value={fill === 'none' ? '#ffffff' : fill}
                          onChange={(e) => {
                            if (fillType === 'solid') {
                              onChangeProperties({ fill: e.target.value });
                            } else {
                              handleUpdateStopColor(e.target.value);
                            }
                          }}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 opacity-0 absolute inset-0 z-10"
                        />
                        <div
                          className="w-8 h-8 rounded-lg border border-white/20 shadow-sm"
                          style={{ backgroundColor: fill === 'none' ? 'transparent' : fill }}
                        />
                      </div>
                      <input
                        type="text"
                        value={fill}
                        onChange={(e) => onChangeProperties({ fill: e.target.value })}
                        className="bg-zinc-850 px-2 py-1 rounded border border-white/5 text-zinc-200 text-xs font-mono flex-1 focus:outline-none"
                      />
                      <button
                        onClick={() => onChangeProperties({ fill: 'none' })}
                        className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                          fill === 'none'
                            ? 'bg-red-950 text-red-400 border-red-800/40 font-medium'
                            : 'bg-zinc-850 text-zinc-400 border-white/5 hover:text-white'
                        }`}
                      >
                        None
                      </button>
                    </div>

                    {/* Gradient Editor Bar (if gradient active) */}
                    {gradient && (
                      <div className="space-y-2 pt-1">
                        <div
                          ref={gradientBarRef}
                          onClick={handleAddStop}
                          className="w-full h-5 rounded-lg border border-white/10 relative cursor-crosshair shadow-inner"
                          style={{
                            background: `linear-gradient(to right, ${gradient.stops
                              .map((s) => `${s.color} ${s.offset * 100}%`)
                              .join(', ')})`,
                          }}
                        >
                          {gradient.stops.map((stop, idx) => (
                            <div
                              key={stop.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveStopIndex(idx);
                              }}
                              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 cursor-pointer transition-transform ${
                                activeStopIndex === idx
                                  ? 'border-white scale-125 shadow-md shadow-black'
                                  : 'border-zinc-900 opacity-80'
                              }`}
                              style={{
                                left: `${stop.offset * 100}%`,
                                backgroundColor: stop.color,
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500">Click bar to add stop</span>
                          {gradient.stops.length > 2 && (
                            <button
                              onClick={handleRemoveActiveStop}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete Active Stop
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stroke Row */}
                  <div className="space-y-1.5 pt-1 border-t border-white/5">
                    <span className="text-[11px] text-zinc-400 block">Stroke</span>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          value={stroke === 'none' ? '#000000' : stroke}
                          onChange={(e) => onChangeProperties({ stroke: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 opacity-0 absolute inset-0 z-10"
                        />
                        <div
                          className="w-8 h-8 rounded-lg border border-white/20 shadow-sm"
                          style={{ backgroundColor: stroke === 'none' ? 'transparent' : stroke }}
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-850 px-2 py-1 rounded border border-white/5 w-24">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={strokeWidth}
                          onChange={(e) =>
                            onChangeProperties({ strokeWidth: Math.max(0, parseFloat(e.target.value) || 0) })
                          }
                          className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                        />
                        <span className="text-[10px] text-zinc-500">pt</span>
                      </div>
                      <button
                        onClick={() => onChangeProperties({ stroke: 'none' })}
                        className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                          stroke === 'none'
                            ? 'bg-red-950 text-red-400 border-red-800/40 font-medium'
                            : 'bg-zinc-850 text-zinc-400 border-white/5 hover:text-white'
                        }`}
                      >
                        None
                      </button>
                    </div>

                    {/* Caps & Joins */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="flex items-center gap-1 bg-zinc-850 p-0.5 rounded border border-white/5">
                        {(['round', 'butt', 'square'] as StrokeCap[]).map((cap) => (
                          <button
                            key={cap}
                            onClick={() => onChangeProperties({ strokeCap: cap })}
                            className={`flex-1 py-0.5 rounded text-[10px] capitalize transition-colors ${
                              strokeCap === cap ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400'
                            }`}
                          >
                            {cap}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-850 p-0.5 rounded border border-white/5">
                        {(['round', 'miter', 'bevel'] as StrokeJoin[]).map((join) => (
                          <button
                            key={join}
                            onClick={() => onChangeProperties({ strokeJoin: join })}
                            className={`flex-1 py-0.5 rounded text-[10px] capitalize transition-colors ${
                              strokeJoin === join ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400'
                            }`}
                          >
                            {join}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Opacity Slider */}
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Opacity</span>
                      <span className="font-mono text-zinc-300">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={opacity}
                      onChange={(e) => onChangeProperties({ opacity: parseFloat(e.target.value) })}
                      className="w-full accent-sky-400 bg-zinc-800 h-1 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* 3. MODE C: CHARACTER & PARAGRAPH (When Text is Selected) */}
                {isTextSelected && textElement && (
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
                    <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-sky-400" />
                      Character & Paragraph
                    </span>

                    {/* Font Family */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400">Font Family</label>
                      <select
                        value={textElement.fontFamily}
                        onChange={(e) => onChangeProperties({ fontFamily: e.target.value })}
                        className="w-full bg-zinc-850 border border-white/10 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="Inter, sans-serif">Inter</option>
                        <option value="Roboto, sans-serif">Roboto</option>
                        <option value="'Playfair Display', serif">Playfair Display</option>
                        <option value="'Fira Code', monospace">Fira Code</option>
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="'Times New Roman', serif">Times New Roman</option>
                        <option value="'Courier New', monospace">Courier New</option>
                      </select>
                    </div>

                    {/* Size & Weight */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Size (pt)</label>
                        <input
                          type="number"
                          min="6"
                          max="200"
                          value={textElement.fontSize}
                          onChange={(e) =>
                            onChangeProperties({ fontSize: Math.max(6, parseFloat(e.target.value) || 12) })
                          }
                          className="w-full bg-zinc-850 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 font-mono focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Weight</label>
                        <select
                          value={textElement.fontWeight}
                          onChange={(e) => onChangeProperties({ fontWeight: e.target.value })}
                          className="w-full bg-zinc-850 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none cursor-pointer"
                        >
                          <option value="300">Light (300)</option>
                          <option value="400">Regular (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="700">Bold (700)</option>
                        </select>
                      </div>
                    </div>

                    {/* Alignment */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] text-zinc-400">Alignment</label>
                      <div className="flex bg-zinc-850 rounded p-0.5 border border-white/5">
                        <button
                          onClick={() => onChangeProperties({ textAlign: 'left' })}
                          className={`flex-1 py-1 rounded flex justify-center ${
                            textElement.textAlign === 'left' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onChangeProperties({ textAlign: 'center' })}
                          className={`flex-1 py-1 rounded flex justify-center ${
                            textElement.textAlign === 'center' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onChangeProperties({ textAlign: 'right' })}
                          className={`flex-1 py-1 rounded flex justify-center ${
                            textElement.textAlign === 'right' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                          }`}
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onChangeProperties({ textAlign: 'justify' })}
                          className={`flex-1 py-1 rounded flex justify-center ${
                            textElement.textAlign === 'justify' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                          }`}
                        >
                          <AlignJustify className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. ALIGN SECTION */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between text-zinc-300 font-medium">
                    <span>Align</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {selectedCount > 1 ? 'To Selection' : 'To Artboard'}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-1 bg-zinc-850 p-1 rounded-lg border border-white/5">
                    {/* Align Left */}
                    <button
                      onClick={() => onAlign?.('left')}
                      className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      title="Align Left"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="1" y="2" width="2" height="12" rx="0.5" />
                        <rect x="5" y="4" width="8" height="3" rx="0.5" opacity="0.8" />
                        <rect x="5" y="9" width="5" height="3" rx="0.5" opacity="0.8" />
                      </svg>
                    </button>

                    {/* Align Horizontal Center */}
                    <button
                      onClick={() => onAlign?.('center')}
                      className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      title="Align Horizontal Center"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="7" y="1" width="2" height="14" rx="0.5" />
                        <rect x="3" y="4" width="10" height="3" rx="0.5" opacity="0.8" />
                        <rect x="4.5" y="9" width="7" height="3" rx="0.5" opacity="0.8" />
                      </svg>
                    </button>

                    {/* Align Right */}
                    <button
                      onClick={() => onAlign?.('right')}
                      className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      title="Align Right"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="13" y="2" width="2" height="12" rx="0.5" />
                        <rect x="3" y="4" width="8" height="3" rx="0.5" opacity="0.8" />
                        <rect x="6" y="9" width="5" height="3" rx="0.5" opacity="0.8" />
                      </svg>
                    </button>

                    {/* Align Top */}
                    <button
                      onClick={() => onAlign?.('top')}
                      className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      title="Align Top"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="2" y="1" width="12" height="2" rx="0.5" />
                        <rect x="4" y="5" width="3" height="8" rx="0.5" opacity="0.8" />
                        <rect x="9" y="5" width="3" height="5" rx="0.5" opacity="0.8" />
                      </svg>
                    </button>

                    {/* Align Vertical Center */}
                    <button
                      onClick={() => onAlign?.('middle')}
                      className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      title="Align Vertical Center"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="1" y="7" width="14" height="2" rx="0.5" />
                        <rect x="4" y="3" width="3" height="10" rx="0.5" opacity="0.8" />
                        <rect x="9" y="4.5" width="3" height="7" rx="0.5" opacity="0.8" />
                      </svg>
                    </button>

                    {/* Align Bottom */}
                    <button
                      onClick={() => onAlign?.('bottom')}
                      className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      title="Align Bottom"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="2" y="13" width="12" height="2" rx="0.5" />
                        <rect x="4" y="3" width="3" height="8" rx="0.5" opacity="0.8" />
                        <rect x="9" y="6" width="3" height="5" rx="0.5" opacity="0.8" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 5. PATHFINDER SECTION (Visible when 2+ objects selected) */}
                {selectedCount >= 2 && (
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
                    <span className="font-medium text-zinc-200">Pathfinder</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        onClick={() => onApplyPathfinder('unite')}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-sky-950 text-zinc-300 hover:text-sky-400 rounded text-[11px] font-medium border border-white/5 transition-colors flex flex-col items-center gap-1"
                        title="Unite (Combines shapes into one outline)"
                      >
                        <span className="font-semibold text-xs">Unite</span>
                      </button>
                      <button
                        onClick={() => onApplyPathfinder('subtract')}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-sky-950 text-zinc-300 hover:text-sky-400 rounded text-[11px] font-medium border border-white/5 transition-colors flex flex-col items-center gap-1"
                        title="Minus Front (Cuts top shape out of bottom)"
                      >
                        <span className="font-semibold text-xs">Minus</span>
                      </button>
                      <button
                        onClick={() => onApplyPathfinder('intersect')}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-sky-950 text-zinc-300 hover:text-sky-400 rounded text-[11px] font-medium border border-white/5 transition-colors flex flex-col items-center gap-1"
                        title="Intersect (Keeps overlapping area)"
                      >
                        <span className="font-semibold text-xs">Intersect</span>
                      </button>
                      <button
                        onClick={() => onApplyPathfinder('exclude')}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-sky-950 text-zinc-300 hover:text-sky-400 rounded text-[11px] font-medium border border-white/5 transition-colors flex flex-col items-center gap-1"
                        title="Exclude (Keeps non-overlapping area)"
                      >
                        <span className="font-semibold text-xs">Exclude</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. QUICK ACTIONS */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Quick Actions
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      onClick={onGroupSelected}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors"
                    >
                      Group (⌘G)
                    </button>
                    <button
                      onClick={onUngroupSelected}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors"
                    >
                      Ungroup (⇧⌘G)
                    </button>
                    <button
                      onClick={onMakeClippingMask}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors"
                    >
                      Make Mask (⌘7)
                    </button>
                    <button
                      onClick={onLockSelected}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors"
                    >
                      Lock (⌘2)
                    </button>
                    <button
                      onClick={onBringToFront}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors"
                    >
                      Bring to Front
                    </button>
                    <button
                      onClick={onDeleteSelected}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-red-950 text-red-400 rounded text-[11px] font-medium border border-white/5 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: LAYERS TREE                                        */}
        {/* ========================================================= */}
        {activeTab === 'layers' && (
          <div className="space-y-3 animate-in fade-in duration-100">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
              <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Layer Stack
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {elements.length} {elements.length === 1 ? 'layer' : 'layers'}
              </span>
            </div>

            {elements.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No layers on canvas</p>
              </div>
            ) : (
              <div className="space-y-1">
                {[...elements].reverse().map((el, revIdx) => {
                  const actualIdx = elements.length - 1 - revIdx;
                  const isSelected = selectedIds.includes(el.id);
                  const isEditing = editingLayerId === el.id;

                  return (
                    <div
                      key={el.id}
                      draggable
                      onDragStart={() => setDraggedLayerIdx(actualIdx)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverLayerIdx(actualIdx);
                      }}
                      onDrop={() => {
                        if (draggedLayerIdx !== null && draggedLayerIdx !== actualIdx) {
                          onReorderLayers?.(draggedLayerIdx, actualIdx);
                        }
                        setDraggedLayerIdx(null);
                        setDragOverLayerIdx(null);
                      }}
                      onClick={(e) => onSelectElement?.(el.id, e.shiftKey)}
                      className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400/40 text-white'
                          : 'bg-zinc-900/60 border-white/[0.04] text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <GripVertical className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 cursor-grab" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVisibility?.(el.id);
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        {el.visible !== false ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLock?.(el.id);
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        {el.locked ? (
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                        )}
                      </button>

                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingLayerName}
                          onChange={(e) => setEditingLayerName(e.target.value)}
                          onBlur={() => {
                            if (editingLayerName.trim()) {
                              onRenameLayer?.(el.id, editingLayerName.trim());
                            }
                            setEditingLayerId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingLayerName.trim()) {
                                onRenameLayer?.(el.id, editingLayerName.trim());
                              }
                              setEditingLayerId(null);
                            }
                          }}
                          className="flex-1 bg-zinc-800 border border-sky-400/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => {
                            setEditingLayerId(el.id);
                            setEditingLayerName(el.name || getLayerDisplayName(el));
                          }}
                          className="flex-1 truncate text-xs font-medium"
                        >
                          {el.name || getLayerDisplayName(el)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: LIBRARIES & SWATCHES                               */}
        {/* ========================================================= */}
        {activeTab === 'libraries' && (
          <div className="space-y-4 animate-in fade-in duration-100">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
              <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Library className="w-3.5 h-3.5 text-sky-400" />
                Document Swatches
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {documentColors.length} colors
              </span>
            </div>

            <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
              <span className="font-medium text-zinc-300 block">Colors in Use</span>
              {documentColors.length === 0 ? (
                <p className="text-zinc-500 text-xs">No active colors detected</p>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {documentColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => onChangeProperties({ fill: c })}
                      className="group relative w-8 h-8 rounded-lg border border-white/10 hover:scale-105 transition-transform shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Placed Media Assets */}
            <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-300">Placed Assets</span>
                {onPlaceAsset && (
                  <button
                    onClick={onPlaceAsset}
                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Place File</span>
                  </button>
                )}
              </div>

              {placedAssets.length === 0 ? (
                <p className="text-zinc-500 text-xs py-2">No imported assets in project</p>
              ) : (
                <div className="space-y-1.5">
                  {placedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => onSelectElement?.(asset.id)}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-white/5 cursor-pointer text-xs"
                    >
                      <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="truncate flex-1 text-zinc-200">
                        {asset.name || asset.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default PropertiesPanel;
