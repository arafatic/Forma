import React, { useState, useRef, useMemo } from 'react';
import {
  VectorElement,
  PathElement,
  TextElement,
  ImageElement,
  GroupElement,
  GradientFill,
  ColorStop,
  FillType,
  StrokeCap,
  StrokeJoin,
  PathfinderOp,
  TextAlign,
  Artboard,
  UnitType,
  ViewTransform,
  ExportMode,
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
  Info,
  ArrowLeftRight,
  Plus,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
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
  RefreshCw,
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
} from 'lucide-react';
import { getElementBoundingBox } from '../engine/transform';
import { getLayerDisplayName } from '../engine/layers';

export type RightSidebarTab = 'properties' | 'layers' | 'libraries';

export interface PropertiesPanelProps {
  // Elements & Selection
  elements: VectorElement[];
  selectedElement: VectorElement | null;
  selectedIds: string[];
  selectedCount: number;

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
    src?: string;
  }) => void;
  onDeleteSelected: () => void;
  onClosePath?: () => void;
  onApplyPathfinder: (op: PathfinderOp) => void;

  // Context-Aware Document Setup Mode (State A)
  artboard?: Artboard | null;
  onUpdateArtboard?: (ab: Artboard) => void;
  onEditArtboard?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  transform?: ViewTransform;
  onResetZoom?: () => void;
  onExportSvg?: (mode?: ExportMode) => void;
  onExportPng?: (mode?: ExportMode) => void;
  onNewDocument?: () => void;

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

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  elements,
  selectedElement,
  selectedIds,
  selectedCount,
  defaultFill,
  defaultStroke,
  defaultStrokeWidth,
  defaultOpacity,
  onChangeProperties,
  onDeleteSelected,
  onClosePath,
  onApplyPathfinder,
  artboard,
  onUpdateArtboard,
  onEditArtboard,
  showGrid = true,
  onToggleGrid,
  transform,
  onResetZoom,
  onExportSvg,
  onExportPng,
  onNewDocument,
  onSelectElement,
  onToggleVisibility,
  onToggleLock,
  onRenameLayer,
  onReorderLayers,
  onGroupSelected,
  onUngroupSelected,
  onPlaceAsset,
}) => {
  // Sidebar tab & dock collapse state
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('properties');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Gradient Editor State
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const gradientBarRef = useRef<HTMLDivElement>(null);

  // Transform Card aspect lock state
  const [isAspectLocked, setIsAspectLocked] = useState<boolean>(true);

  // Document setup toggles state
  const [showRulers, setShowRulers] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [snapToPoints, setSnapToPoints] = useState<boolean>(true);
  const [snapToGuides, setSnapToGuides] = useState<boolean>(true);

  // Image replacement file input ref
  const replaceImageInputRef = useRef<HTMLInputElement | null>(null);

  // Layers Tab inline rename & drag state
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState<string>('');
  const [draggedLayerIdx, setDraggedLayerIdx] = useState<number | null>(null);
  const [dragOverLayerIdx, setDragOverLayerIdx] = useState<number | null>(null);

  // Extract element properties
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

  // Selected element bounding box for transform card
  const boundingBox = useMemo(() => {
    if (!selectedElement) return null;
    return getElementBoundingBox(selectedElement);
  }, [selectedElement]);

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
      const existingStops =
        gradient?.stops && gradient.stops.length >= 2
          ? gradient.stops
          : [
              { id: 'stop-0', offset: 0, color: fill === 'none' ? '#3b82f6' : fill },
              { id: 'stop-1', offset: 1, color: '#ec4899' },
            ];
      onChangeProperties({
        fillType: type,
        fill: 'url(#gradient)',
        gradient: {
          type,
          startX: gradient?.startX ?? 0,
          startY: gradient?.startY ?? 0.5,
          endX: gradient?.endX ?? 1,
          endY: gradient?.endY ?? 0.5,
          stops: existingStops,
        },
      });
    }
  };

  const handleApplyPresetGradient = (preset: (typeof GRADIENT_PRESETS)[0]) => {
    onChangeProperties({
      fillType: fillType === 'radial' ? 'radial' : 'linear',
      fill: 'url(#gradient)',
      gradient: {
        type: fillType === 'radial' ? 'radial' : 'linear',
        startX: 0,
        startY: 0.5,
        endX: 1,
        endY: 0.5,
        stops: preset.stops.map((s, idx) => ({
          id: `stop-${idx}`,
          offset: s.offset,
          color: s.color,
        })),
      },
    });
    setActiveStopIndex(0);
  };

  const handleUpdateActiveStopColor = (color: string) => {
    if (!gradient) return;
    const newStops = gradient.stops.map((stop, idx) =>
      idx === activeStopIndex ? { ...stop, color } : stop
    );
    onChangeProperties({
      gradient: {
        ...gradient,
        stops: newStops,
      },
    });
  };

  const handleUpdateActiveStopOffset = (offset: number) => {
    if (!gradient) return;
    const newStops = gradient.stops
      .map((stop, idx) => (idx === activeStopIndex ? { ...stop, offset } : stop))
      .sort((a, b) => a.offset - b.offset);

    const activeId = gradient.stops[activeStopIndex]?.id;
    const newActiveIndex = newStops.findIndex((s) => s.id === activeId);

    onChangeProperties({
      gradient: {
        ...gradient,
        stops: newStops,
      },
    });
    if (newActiveIndex !== -1) setActiveStopIndex(newActiveIndex);
  };

  const handleDeleteActiveStop = () => {
    if (!gradient || gradient.stops.length <= 2) return;
    const newStops = gradient.stops.filter((_, idx) => idx !== activeStopIndex);
    onChangeProperties({
      gradient: {
        ...gradient,
        stops: newStops,
      },
    });
    setActiveStopIndex(Math.max(0, activeStopIndex - 1));
  };

  const handleReverseGradient = () => {
    if (!gradient) return;
    const newStops = gradient.stops
      .map((stop) => ({ ...stop, offset: Math.round((1 - stop.offset) * 100) / 100 }))
      .reverse();
    onChangeProperties({
      gradient: {
        ...gradient,
        stops: newStops,
      },
    });
  };

  // Image Replacement Handler
  const handleReplaceImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imageElement) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        onChangeProperties({
          src: dataUrl,
          width: img.naturalWidth || imageElement.width,
          height: img.naturalHeight || imageElement.height,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------
  // RENDER: COLLAPSED ICON STRIP
  // -------------------------------------------------------------
  if (isCollapsed) {
    return (
      <aside className="w-12 bg-[#18181b]/95 backdrop-blur border-l border-white/[0.08] flex flex-col items-center py-2.5 gap-2.5 z-20 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 text-zinc-400 hover:text-sky-400 hover:bg-zinc-800/80 rounded-md transition-colors cursor-pointer"
          title="Expand Dock (<<)"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <div className="w-6 h-px bg-white/10 my-0.5" />

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
          title="Properties Inspector"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setActiveTab('layers');
            setIsCollapsed(false);
          }}
          className={`p-2 rounded-lg transition-colors cursor-pointer relative ${
            activeTab === 'layers'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Layers Tree"
        >
          <Layers className="w-4 h-4" />
          {elements.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-sky-500 text-[8px] font-bold text-black flex items-center justify-center">
              {elements.length}
            </span>
          )}
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
    <aside className="w-80 bg-[#18181b]/95 backdrop-blur border-l border-white/[0.08] flex flex-col h-full z-20 select-none overflow-hidden animate-in slide-in-from-right-4 duration-150">
      {/* Hidden image replace input */}
      <input
        type="file"
        ref={replaceImageInputRef}
        onChange={handleReplaceImageFile}
        accept="image/*,.svg,.psd,.ai,.eps"
        className="hidden"
      />

      {/* 1. DOCKED TOP TABS (Illustrator Style: Properties | Layers | Libraries) */}
      <div className="h-11 px-2.5 border-b border-white/[0.08] flex items-center justify-between bg-[#141416]/90">
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

      {/* 2. TAB BODY CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ========================================================= */}
        {/* TAB 1: PROPERTIES (Context-Aware: State A vs. State B)    */}
        {/* ========================================================= */}
        {activeTab === 'properties' && (
          <>
            {/* STATE A: NO SELECTION ACTIVE -> DOCUMENT SETUP MODE */}
            {!selectedElement && (
              <div className="space-y-4 animate-in fade-in duration-100">
                {/* Document Header Status */}
                <div className="flex items-center justify-between pb-1">
                  <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-sky-400" />
                    Document Setup
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/90 text-zinc-400 font-mono">
                    No Selection
                  </span>
                </div>

                {/* 1. Document / Artboard Card */}
                {artboard && (
                  <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                        <Square className="w-3.5 h-3.5 text-sky-400" />
                        {artboard.name || 'Artboard 1'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {Math.round(artboard.width)} × {Math.round(artboard.height)} {artboard.unit || 'px'}
                      </span>
                    </div>

                    {/* Units Selector & Orientation */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Ruler Units</label>
                        <select
                          value={artboard.unit || 'px'}
                          onChange={(e) => {
                            const newUnit = e.target.value as UnitType;
                            onUpdateArtboard?.({ ...artboard, unit: newUnit });
                          }}
                          className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                        >
                          <option value="px">Pixels (px)</option>
                          <option value="in">Inches (in)</option>
                          <option value="mm">Millimeters (mm)</option>
                          <option value="pt">Points (pt)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Orientation</label>
                        <button
                          onClick={() => {
                            // Swap width and height to toggle landscape/portrait
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

                    {/* Canvas Background Color Options */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] text-zinc-400">Artboard Surface</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onUpdateArtboard?.({ ...artboard, backgroundColor: '#ffffff' })}
                          className={`flex-1 py-1 px-2 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                            artboard.backgroundColor === '#ffffff'
                              ? 'bg-zinc-800 text-sky-400 border-sky-400/40'
                              : 'bg-zinc-800/60 text-zinc-400 border-white/5 hover:text-white'
                          }`}
                        >
                          White
                        </button>
                        <button
                          onClick={() => onUpdateArtboard?.({ ...artboard, backgroundColor: 'transparent' })}
                          className={`flex-1 py-1 px-2 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                            artboard.backgroundColor === 'transparent'
                              ? 'bg-zinc-800 text-sky-400 border-sky-400/40'
                              : 'bg-zinc-800/60 text-zinc-400 border-white/5 hover:text-white'
                          }`}
                        >
                          Transparent
                        </button>
                        <button
                          onClick={() => onUpdateArtboard?.({ ...artboard, backgroundColor: '#18181b' })}
                          className={`flex-1 py-1 px-2 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                            artboard.backgroundColor === '#18181b'
                              ? 'bg-zinc-800 text-sky-400 border-sky-400/40'
                              : 'bg-zinc-800/60 text-zinc-400 border-white/5 hover:text-white'
                          }`}
                        >
                          Dark
                        </button>
                      </div>
                    </div>

                    {/* Edit Artboard Presets Button */}
                    {onEditArtboard && (
                      <button
                        onClick={onEditArtboard}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 rounded-lg transition-colors text-xs font-medium cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Edit Artboard Presets…</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 2. Rulers & Grids Card */}
                <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between text-zinc-200 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5 text-sky-400" />
                      Rulers & Grids
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowRulers(!showRulers)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-colors border cursor-pointer ${
                        showRulers
                          ? 'bg-sky-950 text-sky-400 border-sky-800/40 font-medium'
                          : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Rulers</span>
                    </button>

                    <button
                      onClick={onToggleGrid}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-colors border cursor-pointer ${
                        showGrid
                          ? 'bg-sky-950 text-sky-400 border-sky-800/40 font-medium'
                          : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Grid (⌘')</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setSnapToGrid(!snapToGrid)}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs transition-colors border cursor-pointer ${
                      snapToGrid
                        ? 'bg-sky-950 text-sky-400 border-sky-800/40 font-medium'
                        : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-zinc-200'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Snap to Grid {snapToGrid ? '(On)' : '(Off)'}</span>
                  </button>
                </div>

                {/* 3. Guides & Snap Card */}
                <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between text-zinc-200 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                      Guides & Snapping
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSnapToPoints(!snapToPoints)}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs transition-colors border cursor-pointer ${
                        snapToPoints
                          ? 'bg-indigo-950 text-indigo-400 border-indigo-800/40 font-medium'
                          : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      <span>Snap to Point</span>
                    </button>

                    <button
                      onClick={() => setSnapToGuides(!snapToGuides)}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs transition-colors border cursor-pointer ${
                        snapToGuides
                          ? 'bg-indigo-950 text-indigo-400 border-indigo-800/40 font-medium'
                          : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      <span>Snap to Guides</span>
                    </button>
                  </div>
                </div>

                {/* 4. Quick Actions Card */}
                <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Quick Actions
                  </span>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {onResetZoom && (
                      <button
                        onClick={onResetZoom}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors cursor-pointer"
                      >
                        Reset 100% (⌘0)
                      </button>
                    )}
                    {onNewDocument && (
                      <button
                        onClick={onNewDocument}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors cursor-pointer"
                      >
                        New Doc (⌘N)
                      </button>
                    )}
                    {onExportSvg && (
                      <button
                        onClick={() => onExportSvg('artboard')}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors cursor-pointer"
                      >
                        Export SVG (⌘S)
                      </button>
                    )}
                    {onExportPng && (
                      <button
                        onClick={() => onExportPng('artboard')}
                        className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium border border-white/5 transition-colors cursor-pointer"
                      >
                        Export PNG (⇧⌘S)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STATE B: SELECTION ACTIVE -> ELEMENT INSPECTOR MODE */}
            {selectedElement && (
              <div className="space-y-4 animate-in fade-in duration-100">
                {/* Selection Header Badge */}
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
                      {selectedElement.name || selectedElement.type}
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-sky-400 font-mono capitalize">
                    {selectedCount > 1 ? `${selectedCount} items` : selectedElement.type}
                  </span>
                </div>

                {/* 1. TRANSFORM CARD (X, Y, W, H & Aspect Ratio Lock) */}
                {boundingBox && (
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-zinc-300 font-medium">
                      <span>Transform</span>
                      <button
                        onClick={() => setIsAspectLocked(!isAspectLocked)}
                        className={`p-1 rounded transition-colors ${
                          isAspectLocked ? 'text-sky-400 bg-sky-950/60' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title={isAspectLocked ? 'Aspect Ratio Locked' : 'Aspect Ratio Unlocked'}
                      >
                        {isAspectLocked ? <LinkIcon className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 bg-zinc-850 px-2 py-1 rounded border border-white/5">
                        <span className="text-[10px] text-zinc-500 font-mono">X</span>
                        <input
                          type="number"
                          value={Math.round(boundingBox.minX)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onChangeProperties({ x: val });
                          }}
                          className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-zinc-850 px-2 py-1 rounded border border-white/5">
                        <span className="text-[10px] text-zinc-500 font-mono">Y</span>
                        <input
                          type="number"
                          value={Math.round(boundingBox.minY)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onChangeProperties({ y: val });
                          }}
                          className="w-full bg-transparent text-zinc-200 text-xs font-mono focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-zinc-850 px-2 py-1 rounded border border-white/5">
                        <span className="text-[10px] text-zinc-500 font-mono">W</span>
                        <input
                          type="number"
                          value={Math.round(boundingBox.width)}
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
                          value={Math.round(boundingBox.height)}
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
                )}

                {/* 2. IMAGE SPECIFIC INSPECTOR */}
                {imageElement && (
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-zinc-300 font-medium">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                        Placed Image
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {imageElement.naturalWidth || imageElement.width} × {imageElement.naturalHeight || imageElement.height} px
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={imageElement.src}
                        alt="Placed"
                        className="w-14 h-14 object-contain rounded-lg bg-black/40 border border-white/10"
                      />
                      <div className="flex-1 space-y-1.5">
                        <button
                          onClick={() => replaceImageInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium border border-white/10 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                          <span>Replace Image…</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. TYPOGRAPHY INSPECTOR (TextElement) */}
                {textElement && (
                  <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-sky-400" />
                        Typography
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {textElement.fontSize}px
                      </span>
                    </div>

                    {/* Font Family */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400">Font Family</label>
                      <select
                        value={textElement.fontFamily}
                        onChange={(e) => onChangeProperties({ fontFamily: e.target.value })}
                        className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="Inter, sans-serif">Inter</option>
                        <option value="Roboto, sans-serif">Roboto</option>
                        <option value="'Playfair Display', Georgia, serif">Playfair Display</option>
                        <option value="'Fira Code', monospace">Fira Code</option>
                        <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">System Sans</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</option>
                        <option value="Courier New, monospace">Courier New</option>
                      </select>
                    </div>

                    {/* Size & Weight */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Size (pt/px)</label>
                        <input
                          type="number"
                          min="6"
                          max="200"
                          value={textElement.fontSize}
                          onChange={(e) => onChangeProperties({ fontSize: Math.max(6, parseInt(e.target.value) || 12) })}
                          className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Weight</label>
                        <select
                          value={textElement.fontWeight}
                          onChange={(e) => onChangeProperties({ fontWeight: parseInt(e.target.value) || e.target.value })}
                          className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-200 cursor-pointer"
                        >
                          <option value="300">Light (300)</option>
                          <option value="400">Regular (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">Extra-Bold (800)</option>
                        </select>
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400">Alignment</label>
                      <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-800 rounded border border-white/10">
                        <button
                          onClick={() => onChangeProperties({ textAlign: 'left' })}
                          className={`flex items-center justify-center py-1 rounded transition-colors cursor-pointer ${
                            textElement.textAlign === 'left' ? 'bg-sky-950 text-sky-400 font-medium' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onChangeProperties({ textAlign: 'center' })}
                          className={`flex items-center justify-center py-1 rounded transition-colors cursor-pointer ${
                            textElement.textAlign === 'center' ? 'bg-sky-950 text-sky-400 font-medium' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onChangeProperties({ textAlign: 'right' })}
                          className={`flex items-center justify-center py-1 rounded transition-colors cursor-pointer ${
                            textElement.textAlign === 'right' ? 'bg-sky-950 text-sky-400 font-medium' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onChangeProperties({ textAlign: 'justify' })}
                          className={`flex items-center justify-center py-1 rounded transition-colors cursor-pointer ${
                            textElement.textAlign === 'justify' ? 'bg-sky-950 text-sky-400 font-medium' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <AlignJustify className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Tracking & Line Height */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-400">
                          <span>Tracking</span>
                          <span className="font-mono text-zinc-300">{textElement.letterSpacing || 0}px</span>
                        </div>
                        <input
                          type="range"
                          min="-2"
                          max="20"
                          step="0.5"
                          value={textElement.letterSpacing || 0}
                          onChange={(e) => onChangeProperties({ letterSpacing: parseFloat(e.target.value) })}
                          className="w-full accent-sky-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-400">
                          <span>Line Height</span>
                          <span className="font-mono text-zinc-300">{textElement.lineHeight || 1.2}</span>
                        </div>
                        <input
                          type="range"
                          min="0.8"
                          max="2.5"
                          step="0.05"
                          value={textElement.lineHeight || 1.2}
                          onChange={(e) => onChangeProperties({ lineHeight: parseFloat(e.target.value) })}
                          className="w-full accent-sky-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Content Editor */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400">Text Content</label>
                      <textarea
                        rows={2}
                        value={textElement.text}
                        onChange={(e) => onChangeProperties({ text: e.target.value })}
                        className="w-full bg-zinc-800 border border-white/10 rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500 font-sans resize-y"
                        placeholder="Enter text..."
                      />
                    </div>
                  </div>
                )}

                {/* 4. PATHFINDER / BOOLEAN OPERATIONS (When >= 2 items selected) */}
                {selectedCount >= 2 && (
                  <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
                    <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      Pathfinder ({selectedCount} selected)
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-800/80 rounded-lg">
                      <button
                        onClick={() => onApplyPathfinder('unite')}
                        className="flex flex-col items-center justify-center py-2 px-1 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer"
                        title="Unite"
                      >
                        <span className="text-[10px] font-semibold">Unite</span>
                      </button>
                      <button
                        onClick={() => onApplyPathfinder('subtract')}
                        className="flex flex-col items-center justify-center py-2 px-1 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer"
                        title="Subtract"
                      >
                        <span className="text-[10px] font-semibold">Minus</span>
                      </button>
                      <button
                        onClick={() => onApplyPathfinder('intersect')}
                        className="flex flex-col items-center justify-center py-2 px-1 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer"
                        title="Intersect"
                      >
                        <span className="text-[10px] font-semibold">Intersect</span>
                      </button>
                      <button
                        onClick={() => onApplyPathfinder('exclude')}
                        className="flex flex-col items-center justify-center py-2 px-1 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer"
                        title="Exclude"
                      >
                        <span className="text-[10px] font-semibold">Exclude</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. FILL & GRADIENT ENGINE */}
                {selectedElement.type !== 'image' && (
                  <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-zinc-400" />
                        Fill
                      </span>
                      <button
                        onClick={() => onChangeProperties({ fill: fill === 'none' ? '#3b82f6' : 'none' })}
                        className={`text-[11px] font-mono px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                          fill === 'none'
                            ? 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                            : 'bg-sky-950 text-sky-400 border border-sky-800/40'
                        }`}
                      >
                        {fill === 'none' ? 'None' : 'Active'}
                      </button>
                    </div>

                    {/* Fill Type Toggle */}
                    <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-800 rounded-lg">
                      <button
                        onClick={() => handleSetFillType('solid')}
                        className={`py-1 text-[11px] rounded transition-colors cursor-pointer ${
                          fillType === 'solid' ? 'bg-zinc-700 text-sky-400 font-semibold' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Solid
                      </button>
                      <button
                        onClick={() => handleSetFillType('linear')}
                        className={`py-1 text-[11px] rounded transition-colors cursor-pointer ${
                          fillType === 'linear' ? 'bg-zinc-700 text-sky-400 font-semibold' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Linear
                      </button>
                      <button
                        onClick={() => handleSetFillType('radial')}
                        className={`py-1 text-[11px] rounded transition-colors cursor-pointer ${
                          fillType === 'radial' ? 'bg-zinc-700 text-sky-400 font-semibold' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Radial
                      </button>
                    </div>

                    {/* Solid Fill Color Picker */}
                    {fillType === 'solid' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={fill === 'none' ? '#3b82f6' : fill}
                            onChange={(e) => onChangeProperties({ fill: e.target.value })}
                            className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            value={fill}
                            onChange={(e) => onChangeProperties({ fill: e.target.value })}
                            className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                          />
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-6 gap-1.5 pt-1">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => onChangeProperties({ fill: c })}
                              className="w-6 h-6 rounded border border-white/10 transition-transform hover:scale-110 cursor-pointer"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gradient Editor */}
                    {fillType !== 'solid' && gradient && (
                      <div className="space-y-2.5">
                        <div
                          ref={gradientBarRef}
                          className="h-6 w-full rounded border border-white/10 relative"
                          style={{
                            background: `linear-gradient(to right, ${gradient.stops
                              .map((s) => `${s.color} ${s.offset * 100}%`)
                              .join(', ')})`,
                          }}
                        />

                        {/* Active stop color & offset */}
                        {gradient.stops[activeStopIndex] && (
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={gradient.stops[activeStopIndex].color}
                              onChange={(e) => handleUpdateActiveStopColor(e.target.value)}
                              className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                            />
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={gradient.stops[activeStopIndex].offset}
                              onChange={(e) => handleUpdateActiveStopOffset(parseFloat(e.target.value))}
                              className="w-full accent-sky-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
                            />
                            <button
                              onClick={handleReverseGradient}
                              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 cursor-pointer"
                              title="Reverse"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. STROKE ENGINE */}
                {selectedElement.type !== 'image' && (
                  <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-200">Stroke</span>
                      <button
                        onClick={() => onChangeProperties({ stroke: stroke === 'none' ? '#ffffff' : 'none' })}
                        className={`text-[11px] font-mono px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                          stroke === 'none'
                            ? 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                            : 'bg-sky-950 text-sky-400 border border-sky-800/40'
                        }`}
                      >
                        {stroke === 'none' ? 'None' : 'Active'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={stroke === 'none' ? '#ffffff' : stroke}
                        onChange={(e) => onChangeProperties({ stroke: e.target.value })}
                        className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={strokeWidth}
                        onChange={(e) => onChangeProperties({ strokeWidth: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-20 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono">px</span>
                    </div>

                    {/* Caps & Joins */}
                    <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-800 rounded">
                      <button
                        onClick={() => onChangeProperties({ strokeCap: 'butt' })}
                        className={`py-1 text-[10px] rounded cursor-pointer ${strokeCap === 'butt' ? 'bg-zinc-700 text-sky-400 font-semibold' : 'text-zinc-400'}`}
                      >
                        Butt
                      </button>
                      <button
                        onClick={() => onChangeProperties({ strokeCap: 'round' })}
                        className={`py-1 text-[10px] rounded cursor-pointer ${strokeCap === 'round' ? 'bg-zinc-700 text-sky-400 font-semibold' : 'text-zinc-400'}`}
                      >
                        Round
                      </button>
                      <button
                        onClick={() => onChangeProperties({ strokeCap: 'square' })}
                        className={`py-1 text-[10px] rounded cursor-pointer ${strokeCap === 'square' ? 'bg-zinc-700 text-sky-400 font-semibold' : 'text-zinc-400'}`}
                      >
                        Square
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. OPACITY SECTION */}
                <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between text-zinc-300 font-medium">
                    <span>Opacity</span>
                    <span className="font-mono text-zinc-400">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={opacity}
                    onChange={(e) => onChangeProperties({ opacity: parseFloat(e.target.value) })}
                    className="w-full accent-sky-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Path Specific Actions */}
                {pathElement && !pathElement.closed && onClosePath && (
                  <button
                    onClick={onClosePath}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Close Path
                  </button>
                )}

                {/* Delete Selected Button */}
                <button
                  onClick={onDeleteSelected}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-900/30 rounded-lg transition-colors text-xs font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: LAYERS HIERARCHY TREE DOCK                         */}
        {/* ========================================================= */}
        {activeTab === 'layers' && (
          <div className="space-y-3 animate-in fade-in duration-100">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
              <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Layer Stack
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {elements.length} {elements.length === 1 ? 'object' : 'objects'}
              </span>
            </div>

            {/* Quick Actions (Group / Ungroup) */}
            <div className="flex items-center gap-1.5">
              <button
                disabled={selectedCount < 2}
                onClick={onGroupSelected}
                className={`flex-1 py-1 px-2 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                  selectedCount >= 2
                    ? 'bg-zinc-800 text-zinc-200 border-white/10 hover:bg-zinc-700'
                    : 'bg-zinc-900 text-zinc-600 border-white/5 cursor-not-allowed'
                }`}
              >
                Group (⌘G)
              </button>
              <button
                disabled={!selectedElement || selectedElement.type !== 'group'}
                onClick={onUngroupSelected}
                className={`flex-1 py-1 px-2 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                  selectedElement && selectedElement.type === 'group'
                    ? 'bg-zinc-800 text-zinc-200 border-white/10 hover:bg-zinc-700'
                    : 'bg-zinc-900 text-zinc-600 border-white/5 cursor-not-allowed'
                }`}
              >
                Ungroup (⇧⌘G)
              </button>
            </div>

            {/* Layer Tree Items */}
            {elements.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-xs">
                Canvas is empty. Draw shapes to see layers.
              </div>
            ) : (
              <div className="space-y-1">
                {[...elements]
                  .map((el, originalIdx) => ({ el, originalIdx }))
                  .reverse()
                  .map(({ el, originalIdx }) => {
                    const isSelected = selectedIds.includes(el.id);
                    return (
                      <div
                        key={el.id}
                        draggable
                        onDragStart={() => setDraggedLayerIdx(originalIdx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverLayerIdx(originalIdx);
                        }}
                        onDrop={() => {
                          if (draggedLayerIdx !== null && draggedLayerIdx !== originalIdx && onReorderLayers) {
                            onReorderLayers(draggedLayerIdx, originalIdx);
                          }
                          setDraggedLayerIdx(null);
                          setDragOverLayerIdx(null);
                        }}
                        onClick={(e) => onSelectElement?.(el.id, e.shiftKey)}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-950/70 border-sky-500/50 text-white'
                            : 'bg-zinc-900/60 hover:bg-zinc-850 border-white/5 text-zinc-300'
                        } ${dragOverLayerIdx === originalIdx ? 'border-t-2 border-t-sky-400' : ''}`}
                      >
                        {/* Drag Handle & Type Icon */}
                        <div className="flex items-center gap-2 truncate flex-1">
                          <GripVertical className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 cursor-grab" />
                          {el.type === 'group' && <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          {el.type === 'rectangle' && <Square className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                          {el.type === 'ellipse' && <Circle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          {el.type === 'path' && <PenTool className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          {el.type === 'text' && <Type className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                          {el.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />}

                          {editingLayerId === el.id ? (
                            <input
                              type="text"
                              value={editingLayerName}
                              onChange={(e) => setEditingLayerName(e.target.value)}
                              onBlur={() => {
                                if (editingLayerName.trim() && onRenameLayer) {
                                  onRenameLayer(el.id, editingLayerName.trim());
                                }
                                setEditingLayerId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (editingLayerName.trim() && onRenameLayer) {
                                    onRenameLayer(el.id, editingLayerName.trim());
                                  }
                                  setEditingLayerId(null);
                                }
                              }}
                              autoFocus
                              className="bg-zinc-800 text-white text-xs px-1 rounded outline-none w-28"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => {
                                setEditingLayerId(el.id);
                                setEditingLayerName(getLayerDisplayName(el));
                              }}
                              className="truncate text-xs select-none"
                            >
                              {getLayerDisplayName(el)}
                            </span>
                          )}
                        </div>

                        {/* Lock & Eye toggles */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleLock?.(el.id);
                            }}
                            className={`p-1 rounded hover:bg-zinc-800 ${
                              el.locked ? 'text-amber-400' : 'text-zinc-600 opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleVisibility?.(el.id);
                            }}
                            className={`p-1 rounded hover:bg-zinc-800 ${
                              el.visible === false ? 'text-zinc-600' : 'text-zinc-400'
                            }`}
                          >
                            {el.visible === false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: LIBRARIES & ASSETS (Swatches + Placed Media)       */}
        {/* ========================================================= */}
        {activeTab === 'libraries' && (
          <div className="space-y-4 animate-in fade-in duration-100">
            {/* Swatches Section */}
            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200 text-xs flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  Document Swatches
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {documentColors.length} colors
                </span>
              </div>

              {documentColors.length === 0 ? (
                <div className="text-[11px] text-zinc-500 py-1">No custom colors extracted yet.</div>
              ) : (
                <div className="grid grid-cols-6 gap-2 pt-1">
                  {documentColors.map((col, idx) => (
                    <button
                      key={`doc-${col}-${idx}`}
                      onClick={() => onChangeProperties({ fill: col })}
                      className="w-7 h-7 rounded-lg border border-white/10 transition-transform hover:scale-110 shadow-sm cursor-pointer relative group"
                      style={{ backgroundColor: col }}
                      title={col}
                    />
                  ))}
                </div>
              )}

              <div className="h-px bg-white/5 my-2" />

              <span className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
                Forma Core Swatches
              </span>
              <div className="grid grid-cols-6 gap-2 pt-1">
                {PRESET_COLORS.map((col) => (
                  <button
                    key={`core-${col}`}
                    onClick={() => onChangeProperties({ fill: col })}
                    className="w-7 h-7 rounded-lg border border-white/10 transition-transform hover:scale-110 shadow-sm cursor-pointer"
                    style={{ backgroundColor: col }}
                    title={col}
                  />
                ))}
              </div>
            </div>

            {/* Placed Assets Tray */}
            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200 text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                  Media & Placed Assets
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {placedAssets.length} assets
                </span>
              </div>

              {placedAssets.length === 0 ? (
                <div className="py-6 text-center text-zinc-500 text-xs space-y-2">
                  <p>No placed media in this document.</p>
                  <p className="text-[10px] text-zinc-600">Drag & drop PNG, SVG, or PSD files onto canvas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {placedAssets.map((asset) => {
                    const isSelected = selectedIds.includes(asset.id);
                    const isImg = asset.type === 'image';
                    return (
                      <div
                        key={asset.id}
                        onClick={() => onSelectElement?.(asset.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-950/70 border-sky-500/50'
                            : 'bg-zinc-850/60 hover:bg-zinc-800 border-white/5'
                        }`}
                      >
                        {isImg ? (
                          <img
                            src={(asset as ImageElement).src}
                            alt={asset.name}
                            className="w-9 h-9 object-cover rounded bg-black/50 border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center shrink-0">
                            <PenTool className="w-4 h-4 text-emerald-400" />
                          </div>
                        )}

                        <div className="truncate flex-1">
                          <div className="font-medium text-xs text-zinc-200 truncate">{asset.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono uppercase">
                            {asset.type === 'image' ? 'Raster Image' : 'Vector Asset'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Place Asset Button */}
              {onPlaceAsset && (
                <button
                  onClick={onPlaceAsset}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-white/10 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-400" />
                  <span>Place New Asset… (⇧⌘P)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
