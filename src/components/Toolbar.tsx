import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MousePointer,
  MousePointer2,
  Lasso,
  Square,
  Squircle,
  Circle,
  Hexagon,
  Star,
  Slash,
  PenTool,
  Spline,
  Paintbrush,
  Pencil,
  Eraser,
  Scissors,
  RotateCw,
  Scaling,
  Shapes,
  Type,
  Hand,
  ZoomIn,
  Pipette,
  Blend,
  ChevronsRight,
  ChevronsLeft,
  ArrowLeftRight,
  Layers,
  SquareDashed,
  Maximize,
} from 'lucide-react';
import { ToolType, FillType, DrawingMode } from '../types/vector';

export interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillType?: FillType;
  onFillChange?: (color: string) => void;
  onStrokeChange?: (color: string) => void;
  onSwapFillStroke?: () => void;
  onDefaultColors?: () => void;
  drawingMode?: DrawingMode;
  onDrawingModeChange?: (mode: DrawingMode) => void;
  className?: string;
}

interface SubTool {
  id: ToolType;
  name: string;
  hotkey: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ToolSlot {
  id: string;
  category: 'Select' | 'Shapes' | 'Draw' | 'Modify' | 'Type' | 'Navigate' | 'Color';
  subTools: SubTool[];
}

const TOOL_SLOTS: ToolSlot[] = [
  // 1. Select Category
  {
    id: 'slot-select',
    category: 'Select',
    subTools: [
      { id: 'select', name: 'Selection Tool', hotkey: 'V', icon: MousePointer },
      { id: 'direct-select', name: 'Direct Selection Tool', hotkey: 'A', icon: MousePointer2 },
      { id: 'lasso', name: 'Lasso Tool', hotkey: 'Q', icon: Lasso },
    ],
  },
  // 2. Shapes Category
  {
    id: 'slot-shapes',
    category: 'Shapes',
    subTools: [
      { id: 'rectangle', name: 'Rectangle Tool', hotkey: 'M', icon: Square },
      { id: 'rounded-rect', name: 'Rounded Rectangle Tool', hotkey: '', icon: Squircle },
      { id: 'ellipse', name: 'Ellipse Tool', hotkey: 'L', icon: Circle },
      { id: 'polygon', name: 'Polygon Tool', hotkey: '', icon: Hexagon },
      { id: 'star', name: 'Star Tool', hotkey: '', icon: Star },
      { id: 'line', name: 'Line Segment Tool', hotkey: '\\', icon: Slash },
    ],
  },
  // 3. Draw Category
  {
    id: 'slot-draw',
    category: 'Draw',
    subTools: [
      { id: 'pen', name: 'Pen Tool', hotkey: 'P', icon: PenTool },
      { id: 'curvature', name: 'Curvature Tool', hotkey: '', icon: Spline },
      { id: 'brush', name: 'Paintbrush Tool', hotkey: 'B', icon: Paintbrush },
      { id: 'pencil', name: 'Pencil Tool', hotkey: 'N', icon: Pencil },
      { id: 'eraser', name: 'Eraser Tool', hotkey: '⇧E', icon: Eraser },
      { id: 'scissors', name: 'Scissors Tool', hotkey: 'C', icon: Scissors },
    ],
  },
  // 4. Modify Category
  {
    id: 'slot-modify',
    category: 'Modify',
    subTools: [
      { id: 'rotate', name: 'Rotate Tool', hotkey: 'R', icon: RotateCw },
      { id: 'scale', name: 'Scale Tool', hotkey: 'S', icon: Scaling },
      { id: 'shape-builder', name: 'Shape Builder Tool', hotkey: '⇧M', icon: Shapes },
    ],
  },
  // 5. Type Category
  {
    id: 'slot-type',
    category: 'Type',
    subTools: [
      { id: 'text', name: 'Type Tool', hotkey: 'T', icon: Type },
      { id: 'vertical-text', name: 'Vertical Type Tool', hotkey: '', icon: Type },
    ],
  },
  // 6. Navigate Category
  {
    id: 'slot-navigate',
    category: 'Navigate',
    subTools: [
      { id: 'hand', name: 'Hand Tool', hotkey: 'H', icon: Hand },
      { id: 'zoom', name: 'Zoom Tool', hotkey: 'Z', icon: ZoomIn },
    ],
  },
  // 7. Color Category
  {
    id: 'slot-color',
    category: 'Color',
    subTools: [
      { id: 'eyedropper', name: 'Eyedropper Tool', hotkey: 'I', icon: Pipette },
      { id: 'gradient-tool', name: 'Gradient Tool', hotkey: 'G', icon: Blend },
    ],
  },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  fillColor = 'none',
  strokeColor = '#38bdf8',
  strokeWidth = 2,
  fillType = 'solid',
  onFillChange,
  onStrokeChange,
  onSwapFillStroke,
  onDefaultColors,
  drawingMode = 'normal',
  onDrawingModeChange,
  className = '',
}) => {
  // Single or double column layout state
  const [isDoubleColumn, setIsDoubleColumn] = useState<boolean>(false);

  // Active sub-tool per slot mapping
  const [activeSlotTools, setActiveSlotTools] = useState<Record<string, ToolType>>(() => {
    const initial: Record<string, ToolType> = {};
    TOOL_SLOTS.forEach((slot) => {
      initial[slot.id] = slot.subTools[0].id;
    });
    return initial;
  });

  // Open flyout state
  const [openFlyoutSlotId, setOpenFlyoutSlotId] = useState<string | null>(null);

  // Color focus: 'fill' or 'stroke'
  const [activeColorTarget, setActiveColorTarget] = useState<'fill' | 'stroke'>('fill');

  // Long press timer ref
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // Automatically update the slot's active icon when external currentTool changes
  useEffect(() => {
    for (const slot of TOOL_SLOTS) {
      const match = slot.subTools.find((s) => s.id === currentTool);
      if (match) {
        setActiveSlotTools((prev) => ({
          ...prev,
          [slot.id]: currentTool,
        }));
        break;
      }
    }
  }, [currentTool]);

  // Dismiss flyout on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenFlyoutSlotId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenFlyoutSlotId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePointerDown = (slotId: string) => {
    isLongPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setOpenFlyoutSlotId(slotId);
    }, 350);
  };

  const handlePointerUp = (slot: ToolSlot) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // If it was a normal click (not a long-press), select the current sub-tool
    if (!isLongPressTriggeredRef.current) {
      const activeToolInSlot = activeSlotTools[slot.id] || slot.subTools[0].id;
      onSelectTool(activeToolInSlot);
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, slotId: string) => {
    e.preventDefault();
    setOpenFlyoutSlotId(slotId);
  };

  const handleSelectSubTool = (slotId: string, subToolId: ToolType) => {
    setActiveSlotTools((prev) => ({
      ...prev,
      [slotId]: subToolId,
    }));
    onSelectTool(subToolId);
    setOpenFlyoutSlotId(null);
  };

  // Swatch helpers
  const handleSetNoneColor = () => {
    if (activeColorTarget === 'fill') {
      onFillChange?.('none');
    } else {
      onStrokeChange?.('none');
    }
  };

  const handleSetSolidColor = () => {
    if (activeColorTarget === 'fill') {
      onFillChange?.('#ffffff');
    } else {
      onStrokeChange?.('#38bdf8');
    }
  };

  const handleSetGradientColor = () => {
    if (activeColorTarget === 'fill') {
      onFillChange?.('#38bdf8');
    }
  };

  const handleCycleDrawingMode = () => {
    if (!onDrawingModeChange) return;
    if (drawingMode === 'normal') onDrawingModeChange('behind');
    else if (drawingMode === 'behind') onDrawingModeChange('inside');
    else onDrawingModeChange('normal');
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <aside
      ref={toolbarRef}
      className={`absolute top-16 z-20 flex flex-col items-center p-1 bg-[#18181b]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl shadow-black/70 select-none transition-all duration-200 ${
        isDoubleColumn ? 'w-20' : 'w-12'
      } ${className || 'left-4'}`}
    >
      {/* 1. Header: 1/2 Column Toggle Chevron */}
      <div className="w-full flex items-center justify-center pb-1 border-b border-white/[0.08] mb-1">
        <button
          onClick={() => setIsDoubleColumn((prev) => !prev)}
          type="button"
          title={isDoubleColumn ? 'Switch to 1 Column' : 'Switch to 2 Columns'}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
        >
          {isDoubleColumn ? (
            <ChevronsLeft className="w-3.5 h-3.5" />
          ) : (
            <ChevronsRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* 2. Tool Slots Area */}
      <div
        className={
          isDoubleColumn
            ? 'grid grid-cols-2 gap-1 w-full justify-items-center'
            : 'flex flex-col gap-1 w-full items-center'
        }
      >
        {TOOL_SLOTS.map((slot) => {
          const activeSubToolId = activeSlotTools[slot.id] || slot.subTools[0].id;
          const activeSubTool =
            slot.subTools.find((s) => s.id === activeSubToolId) || slot.subTools[0];
          const isSlotActive = slot.subTools.some((s) => s.id === currentTool);
          const Icon = activeSubTool.icon;
          const hasMultiple = slot.subTools.length > 1;
          const isFlyoutOpen = openFlyoutSlotId === slot.id;

          return (
            <div key={slot.id} className="relative">
              {/* Primary Slot Button */}
              <button
                type="button"
                onPointerDown={() => handlePointerDown(slot.id)}
                onPointerUp={() => handlePointerUp(slot)}
                onPointerLeave={handlePointerLeave}
                onContextMenu={(e) => handleContextMenu(e, slot.id)}
                className={`group relative flex items-center justify-center w-9 h-9 rounded-lg transition-all cursor-pointer ${
                  isSlotActive
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80 active:bg-zinc-700/60'
                }`}
                title={`${activeSubTool.name} ${activeSubTool.hotkey ? `(${activeSubTool.hotkey})` : ''}`}
              >
                <Icon className="w-4 h-4 transition-transform group-hover:scale-105" />

                {/* Sub-tools corner triangle (Adobe Illustrator style) */}
                {hasMultiple && (
                  <svg
                    className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 pointer-events-none transition-colors ${
                      isSlotActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                    viewBox="0 0 6 6"
                  >
                    <polygon points="6,0 6,6 0,6" fill="currentColor" />
                  </svg>
                )}

                {/* Hover Tooltip (when flyout is closed) */}
                {!isFlyoutOpen && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-white/10 text-white text-xs rounded-md shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 flex items-center gap-1.5">
                    <span className="font-medium">{activeSubTool.name}</span>
                    {activeSubTool.hotkey && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300 rounded border border-white/10">
                        {activeSubTool.hotkey}
                      </kbd>
                    )}
                  </div>
                )}
              </button>

              {/* Floating Flyout Menu */}
              {isFlyoutOpen && (
                <div
                  className="absolute left-full ml-2 top-0 z-50 flex flex-col gap-0.5 p-1 bg-[#18181b]/98 backdrop-blur-md border border-white/15 rounded-lg shadow-2xl min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-white/[0.06] mb-0.5">
                    {slot.category} Tools
                  </div>
                  {slot.subTools.map((subTool) => {
                    const SubIcon = subTool.icon;
                    const isSelected = currentTool === subTool.id;

                    return (
                      <button
                        key={subTool.id}
                        type="button"
                        onClick={() => handleSelectSubTool(slot.id, subTool.id)}
                        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500 text-white font-medium shadow-sm'
                            : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80 active:bg-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <SubIcon className="w-4 h-4" />
                          <span>{subTool.name}</span>
                        </div>
                        {subTool.hotkey && (
                          <kbd
                            className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
                              isSelected
                                ? 'bg-sky-600 border-sky-400 text-white'
                                : 'bg-zinc-800 text-zinc-400 border-white/10'
                            }`}
                          >
                            {subTool.hotkey}
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

      {/* 3. Divider */}
      <div className="w-full h-px bg-white/10 my-2" />

      {/* 4. Dual Overlapping Swatches & Controls */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {/* Swatches Container */}
        <div className="relative w-9 h-9">
          {/* Default B/W Reset Button (Top-Left Mini Icon - 'D') */}
          <button
            onClick={onDefaultColors}
            type="button"
            title="Default Fill and Stroke (D)"
            className="absolute -top-1.5 -left-1.5 z-20 w-3.5 h-3.5 flex items-center justify-center p-0 hover:scale-110 transition-transform cursor-pointer"
          >
            <div className="relative w-3 h-3 border border-white/60 bg-white shadow-sm">
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-black border border-white/40" />
            </div>
          </button>

          {/* Swap Fill/Stroke Button (Top-Right Curved Arrow - 'Shift+X') */}
          <button
            onClick={onSwapFillStroke}
            type="button"
            title="Swap Fill and Stroke (Shift+X)"
            className="absolute -top-1.5 -right-1.5 z-20 w-3.5 h-3.5 flex items-center justify-center text-zinc-400 hover:text-white hover:scale-110 transition-transform cursor-pointer"
          >
            <ArrowLeftRight className="w-3 h-3 rotate-45" />
          </button>

          {/* Fill Box (Top-Left) */}
          <button
            onClick={() => setActiveColorTarget('fill')}
            type="button"
            title={`Fill: ${fillColor} (Click to activate)`}
            className={`absolute top-0 left-0 w-6 h-6 rounded border transition-all cursor-pointer ${
              activeColorTarget === 'fill'
                ? 'z-10 ring-2 ring-sky-500 border-white shadow-md'
                : 'z-0 border-white/20 hover:border-white/50 opacity-90'
            }`}
            style={{
              backgroundColor: fillColor === 'none' ? 'transparent' : fillColor,
            }}
          >
            {fillColor === 'none' && (
              <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-zinc-900 rounded-sm">
                <div className="w-[140%] h-[1.5px] bg-red-500 rotate-45" />
              </div>
            )}
          </button>

          {/* Stroke Box (Bottom-Right) */}
          <button
            onClick={() => setActiveColorTarget('stroke')}
            type="button"
            title={`Stroke: ${strokeColor} (${strokeWidth}px) (Click to activate)`}
            className={`absolute bottom-0 right-0 w-6 h-6 rounded transition-all cursor-pointer bg-zinc-900/90 ${
              activeColorTarget === 'stroke'
                ? 'z-10 ring-2 ring-sky-500 shadow-md'
                : 'z-0 opacity-90 hover:opacity-100'
            }`}
            style={{
              border: `3px solid ${strokeColor === 'none' ? '#52525b' : strokeColor}`,
            }}
          >
            {strokeColor === 'none' && (
              <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                <div className="w-[140%] h-[1.5px] bg-red-500 rotate-45" />
              </div>
            )}
          </button>
        </div>

        {/* Color / Gradient / None Quick Chips */}
        <div className="flex items-center gap-1 px-0.5 py-0.5 bg-zinc-900/90 border border-white/10 rounded-md">
          <button
            onClick={handleSetSolidColor}
            type="button"
            title="Color (,)"
            className="w-4 h-4 rounded-sm flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="w-2.5 h-2.5 bg-white rounded-[1px] border border-black/40" />
          </button>

          <button
            onClick={handleSetGradientColor}
            type="button"
            title="Gradient (.)"
            className="w-4 h-4 rounded-sm flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-[1px] bg-gradient-to-r from-white to-black border border-black/40" />
          </button>

          <button
            onClick={handleSetNoneColor}
            type="button"
            title="None (/)"
            className="w-4 h-4 rounded-sm flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative overflow-hidden cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-[1px] bg-zinc-800 border border-white/20 relative flex items-center justify-center overflow-hidden">
              <div className="w-[150%] h-[1px] bg-red-500 rotate-45" />
            </div>
          </button>
        </div>

        {/* Drawing Mode & Screen Mode Strip */}
        <div className="flex items-center gap-1 pt-0.5">
          {/* Drawing Mode Cycle */}
          <button
            onClick={handleCycleDrawingMode}
            type="button"
            title={`Drawing Mode: ${drawingMode === 'normal' ? 'Normal' : drawingMode === 'behind' ? 'Draw Behind' : 'Draw Inside'} (Shift+D)`}
            className={`w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer ${
              drawingMode !== 'normal' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : ''
            }`}
          >
            {drawingMode === 'normal' && <Square className="w-3 h-3" />}
            {drawingMode === 'behind' && <Layers className="w-3 h-3" />}
            {drawingMode === 'inside' && <SquareDashed className="w-3 h-3" />}
          </button>

          {/* Screen Mode */}
          <button
            onClick={handleToggleFullscreen}
            type="button"
            title="Change Screen Mode (F)"
            className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Maximize className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
