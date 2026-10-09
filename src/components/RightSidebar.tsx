import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Layers,
  Library,
  Palette,
  Paintbrush,
  Sparkles,
  History,
  Wand2,
  Tag,
  ChevronsRight,
  ChevronsLeft,
  Menu,
  X,
  Check,
  Shapes,
} from 'lucide-react';
import { PropertiesPanelProps } from './PropertiesPanel';
import { PathfinderOp } from '../types/vector';
import { PanelId, PanelProps } from './panels/types';
import { getPanelComponent, PANEL_METADATA } from './panels/registry';

export type RightDockTab = PanelId;

export interface RightSidebarProps extends Omit<PropertiesPanelProps, 'hideTabBar'> {
  // Dock State & Control
  activeTab: RightDockTab;
  onTabChange: (tab: RightDockTab) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;

  // Additional Layers Panel Props
  onNewLayer?: () => void;
  onCreateSublayer?: () => void;

  // History & Undo Integration
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  historyLength?: number;
  historyIndex?: number;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen = true,
  onToggleOpen,
  elements,
  selectedElement,
  selectedIds,
  selectedCount,
  currentTool,
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
  showRulers,
  onToggleRulers,
  showGrid,
  onToggleGrid,
  showTransparencyGrid,
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
  onNewLayer,
  onCreateSublayer,
  onPlaceAsset,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  historyLength,
  historyIndex = 0,
}) => {
  // State for flyout popovers from icon rail
  const [activeFlyout, setActiveFlyout] = useState<'align' | 'pathfinder' | null>(null);
  const [showPanelMenu, setShowPanelMenu] = useState<boolean>(false);

  const handleRailClick = (tab: RightDockTab) => {
    setActiveFlyout(null);
    onTabChange(tab);
    if (!isOpen && onToggleOpen) {
      onToggleOpen();
    }
  };

  const toggleFlyout = (flyout: 'align' | 'pathfinder') => {
    setActiveFlyout((prev) => (prev === flyout ? null : flyout));
  };

  const panelProps: PanelProps = {
    elements,
    selectedElement,
    selectedIds,
    selectedCount,
    currentTool,
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
    showRulers,
    onToggleRulers,
    showGrid,
    onToggleGrid,
    showTransparencyGrid,
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
    onNewLayer,
    onCreateSublayer,
    onPlaceAsset,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    historyLength,
    historyIndex,
    onSwitchPanel: handleRailClick,
  };

  const ActiveComponent = getPanelComponent(activeTab);

  return (
    <div className="relative flex h-full z-20 select-none">
      {/* ------------------------------------------------------------- */}
      {/* 1. DOCKED ICON RAIL (Slim vertical strip on left of panel)    */}
      {/* ------------------------------------------------------------- */}
      <div className="w-10 bg-[#121214] border-l border-white/[0.08] flex flex-col items-center py-2.5 gap-2 z-30">
        {/* Collapse / Expand Toggle */}
        <button
          onClick={onToggleOpen}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
          title={isOpen ? 'Collapse Panels (>>)' : 'Expand Panels (<<)'}
        >
          {isOpen ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
        </button>

        <div className="w-5 h-px bg-white/10 my-0.5" />

        {/* Primary Tab Shortcuts */}
        <button
          onClick={() => handleRailClick('properties')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isOpen && activeTab === 'properties'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Properties Panel"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleRailClick('layers')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isOpen && activeTab === 'layers'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Layers Panel (F7)"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleRailClick('libraries')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isOpen && activeTab === 'libraries'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Libraries & Swatches"
        >
          <Library className="w-4 h-4" />
        </button>

        <div className="w-5 h-px bg-white/10 my-0.5" />

        {/* Specialized Design Panels */}
        {/* Color Panel (F6) */}
        <button
          onClick={() => handleRailClick('color')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isOpen && activeTab === 'color'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Color Panel (F6)"
        >
          <Palette className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Brushes Panel (F5) */}
        <button
          onClick={() => handleRailClick('brushes')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isOpen && activeTab === 'brushes'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Brushes Panel (F5)"
        >
          <Paintbrush className="w-4 h-4 text-amber-400" />
        </button>

        {/* Gradient Panel (Cmd+F9) */}
        <button
          onClick={() => handleRailClick('gradient')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isOpen && activeTab === 'gradient'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Gradient Panel (⌘F9)"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
        </button>

        {/* History Panel */}
        <button
          onClick={() => handleRailClick('history')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isOpen && activeTab === 'history'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="History Panel"
        >
          <History className="w-4 h-4 text-sky-400" />
        </button>

        {/* Image Trace Panel */}
        <button
          onClick={() => handleRailClick('image_trace')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isOpen && activeTab === 'image_trace'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Image Trace Panel"
        >
          <Wand2 className="w-4 h-4 text-amber-300" />
        </button>

        {/* Attributes Panel */}
        <button
          onClick={() => handleRailClick('attributes')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isOpen && activeTab === 'attributes'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Attributes Panel"
        >
          <Tag className="w-4 h-4 text-blue-400" />
        </button>

        <div className="w-5 h-px bg-white/10 my-0.5" />

        {/* Align Flyout Trigger */}
        <button
          onClick={() => toggleFlyout('align')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            activeFlyout === 'align'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Quick Align Flyout"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <rect x="7" y="1" width="2" height="14" rx="0.5" />
            <rect x="3" y="4" width="10" height="3" rx="0.5" opacity="0.8" />
            <rect x="4.5" y="9" width="7" height="3" rx="0.5" opacity="0.8" />
          </svg>
        </button>

        {/* Pathfinder Flyout Trigger */}
        <button
          onClick={() => toggleFlyout('pathfinder')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            activeFlyout === 'pathfinder'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Pathfinder Flyout"
        >
          <Shapes className="w-4 h-4 text-purple-400/80" />
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FLYOUT PANELS (Opened from docked icon rail)                 */}
      {/* ------------------------------------------------------------- */}
      {activeFlyout === 'align' && (
        <div className="absolute right-[330px] top-12 z-50 w-64 bg-[#1a1a1e] border border-white/10 rounded-xl p-3 shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
            <span className="font-semibold text-xs text-white">Align Objects</span>
            <button onClick={() => setActiveFlyout(null)} className="text-zinc-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1 bg-zinc-850 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => onAlign?.('left')}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center"
              title="Align Left"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="2" height="12" rx="0.5" />
                <rect x="5" y="4" width="8" height="3" rx="0.5" opacity="0.8" />
                <rect x="5" y="9" width="5" height="3" rx="0.5" opacity="0.8" />
              </svg>
            </button>
            <button
              onClick={() => onAlign?.('center')}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center"
              title="Align Horizontal Center"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="7" y="1" width="2" height="14" rx="0.5" />
                <rect x="3" y="4" width="10" height="3" rx="0.5" opacity="0.8" />
                <rect x="4.5" y="9" width="7" height="3" rx="0.5" opacity="0.8" />
              </svg>
            </button>
            <button
              onClick={() => onAlign?.('right')}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center"
              title="Align Right"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="13" y="2" width="2" height="12" rx="0.5" />
                <rect x="3" y="4" width="8" height="3" rx="0.5" opacity="0.8" />
                <rect x="6" y="9" width="5" height="3" rx="0.5" opacity="0.8" />
              </svg>
            </button>
            <button
              onClick={() => onAlign?.('top')}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center"
              title="Align Top"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="1" width="12" height="2" rx="0.5" />
                <rect x="4" y="5" width="3" height="8" rx="0.5" opacity="0.8" />
                <rect x="9" y="5" width="3" height="5" rx="0.5" opacity="0.8" />
              </svg>
            </button>
            <button
              onClick={() => onAlign?.('middle')}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center"
              title="Align Vertical Center"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="7" width="14" height="2" rx="0.5" />
                <rect x="4" y="3" width="3" height="10" rx="0.5" opacity="0.8" />
                <rect x="9" y="4.5" width="3" height="7" rx="0.5" opacity="0.8" />
              </svg>
            </button>
            <button
              onClick={() => onAlign?.('bottom')}
              className="p-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center"
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
      )}

      {activeFlyout === 'pathfinder' && (
        <div className="absolute right-[330px] top-28 z-50 w-64 bg-[#1a1a1e] border border-white/10 rounded-xl p-3 shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
            <span className="font-semibold text-xs text-white">Pathfinder</span>
            <button onClick={() => setActiveFlyout(null)} className="text-zinc-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(['unite', 'subtract', 'intersect', 'exclude'] as PathfinderOp[]).map((op) => (
              <button
                key={op}
                onClick={() => {
                  onApplyPathfinder(op);
                  setActiveFlyout(null);
                }}
                disabled={selectedCount < 2}
                className="py-2 px-1 bg-zinc-800 hover:bg-sky-950 disabled:opacity-40 text-zinc-200 hover:text-sky-400 rounded text-[11px] font-semibold border border-white/5 transition-colors capitalize text-center"
              >
                {op === 'subtract' ? 'Minus' : op}
              </button>
            ))}
          </div>
          {selectedCount < 2 && (
            <p className="text-[10px] text-zinc-500 text-center mt-2">Select 2+ shapes to apply</p>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. DOCKED MAIN PANEL CONTAINER (Expanded when isOpen is true)  */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <aside className="w-80 bg-[#161619]/95 backdrop-blur border-l border-white/[0.08] flex flex-col h-full z-20 select-none overflow-hidden animate-in slide-in-from-right-4 duration-150">
          {/* A. UNIFIED TABBED HEADER ([Properties | Layers | Libraries] + Active Subpanel + Hamburger) */}
          <div className="h-11 px-2.5 border-b border-white/[0.08] flex items-center justify-between bg-[#121214]/90 shrink-0">
            {/* Segmented Tab Bar */}
            <div className="flex items-center gap-1 p-0.5 bg-zinc-900/90 rounded-lg border border-white/5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => onTabChange('properties')}
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
                onClick={() => onTabChange('layers')}
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
                onClick={() => onTabChange('libraries')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'libraries'
                    ? 'bg-zinc-800 text-sky-400 font-semibold shadow-sm border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Library className="w-3.5 h-3.5" />
                <span>Libraries</span>
              </button>

              {/* Auxiliary Active Tab Pill */}
              {!['properties', 'layers', 'libraries'].includes(activeTab) && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-zinc-800 text-sky-400 border border-white/10 shadow-sm whitespace-nowrap">
                  <span>{PANEL_METADATA[activeTab]?.name || activeTab}</span>
                  <button
                    onClick={() => onTabChange('properties')}
                    className="p-0.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-700 transition-colors ml-0.5"
                    title="Close panel (Back to Properties)"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Right actions: Panel Menu (Hamburger) & Collapse */}
            <div className="flex items-center gap-1 relative">
              <button
                onClick={() => setShowPanelMenu(!showPanelMenu)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-md transition-colors cursor-pointer"
                title="Panel Options Menu"
              >
                <Menu className="w-3.5 h-3.5" />
              </button>

              {/* Hamburger Dropdown Menu listing all registered panels */}
              {showPanelMenu && (
                <div className="absolute right-0 top-8 z-50 w-52 bg-[#1e1e24] border border-white/10 rounded-xl p-1.5 shadow-2xl shadow-black/90 text-xs text-zinc-300 animate-in fade-in duration-100 max-h-80 overflow-y-auto">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-1 block">
                    Panels
                  </span>
                  {(Object.keys(PANEL_METADATA) as PanelId[]).map((pid) => {
                    const meta = PANEL_METADATA[pid];
                    const IconComp = meta.icon;
                    return (
                      <button
                        key={pid}
                        onClick={() => {
                          onTabChange(pid);
                          setShowPanelMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <IconComp className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{meta.name}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {meta.hotkey && (
                            <kbd className="text-[10px] text-zinc-500 font-mono">{meta.hotkey}</kbd>
                          )}
                          {activeTab === pid && <Check className="w-3 h-3 text-sky-400" />}
                        </div>
                      </button>
                    );
                  })}
                  <div className="h-px bg-white/5 my-1" />
                  <button
                    onClick={() => {
                      if (onToggleOpen) onToggleOpen();
                      setShowPanelMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-zinc-400"
                  >
                    Close Dock
                  </button>
                </div>
              )}

              <button
                onClick={onToggleOpen}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-md transition-colors cursor-pointer"
                title="Collapse Sidebar (>>)"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* B. DYNAMIC MODULAR PANEL VIEW */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <ActiveComponent {...panelProps} />
          </div>
        </aside>
      )}
    </div>
  );
};

export default RightSidebar;
