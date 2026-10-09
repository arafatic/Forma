import React from 'react';
import { Download, Plus, ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react';
import { MenuBar, MenuBarProps } from './MenuBar';

interface TitleBarProps {
  zoom: number;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onNewDocument: () => void;
  onExportSvg: (mode?: 'artboard' | 'design') => void;
  elementCount: number;
  showLayers?: boolean;
  onToggleLayers?: () => void;
  menuBarProps: MenuBarProps;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  zoom,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  onNewDocument,
  onExportSvg,
  elementCount,
  showLayers = false,
  onToggleLayers,
  menuBarProps,
}) => {
  return (
    <header
      className="relative h-11 bg-[#18181b]/95 backdrop-blur border-b border-white/[0.08] flex items-center justify-between px-3 z-30 select-none"
    >
      {/* Background macOS window drag region */}
      <div
        data-tauri-drag-region
        className="absolute inset-0 z-0 pointer-events-auto"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Left: macOS window buttons offset + App identity + Menu Bar */}
      <div
        className="relative z-10 flex items-center gap-2.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Safe spacing for macOS traffic light buttons (window close/minimize/maximize) */}
        <div className="w-16 h-full pointer-events-none" />

        <div className="flex items-center gap-2 mr-1">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-sm shadow-sky-500/20">
            <span className="text-[10px] font-black text-white leading-none">F</span>
          </div>
          <span className="text-xs font-semibold tracking-wide text-zinc-200">Forma</span>
        </div>

        {/* macOS / Figma style Menu Bar Dropdowns */}
        <MenuBar {...menuBarProps} />

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5">
          {onToggleLayers && (
            <button
              onClick={onToggleLayers}
              type="button"
              title="Toggle Layers Panel (Cmd+L)"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors border cursor-pointer ${
                showLayers
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sm'
                  : 'text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 border-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Layers</span>
            </button>
          )}

          <button
            onClick={onNewDocument}
            type="button"
            title="New Canvas (Clear and Reset View)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-md transition-colors border border-white/10 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>New</span>
          </button>

          <button
            onClick={() => onExportSvg('artboard')}
            type="button"
            title="Export as SVG (Artboard)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/50 active:bg-sky-900/70 border border-sky-800/50 rounded-md transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export SVG</span>
          </button>
        </div>
      </div>

      {/* Center: Canvas info */}
      <div
        data-tauri-drag-region
        className="relative z-10 text-[11px] text-zinc-400 font-mono tracking-tight flex items-center gap-2 pointer-events-none"
      >
        <span>Bézier Engine</span>
        <span className="text-zinc-600">•</span>
        <span>{elementCount} {elementCount === 1 ? 'shape' : 'shapes'}</span>
      </div>

      {/* Right: Zoom controls */}
      <div
        className="relative z-10 flex items-center gap-1 bg-zinc-900/90 rounded-md border border-white/[0.08] p-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={onZoomOut}
          title="Zoom Out (Cmd -)"
          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onResetZoom}
          title="Reset Zoom to 100% (Cmd 0)"
          className="px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition-colors min-w-[52px] text-center"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={onZoomIn}
          title="Zoom In (Cmd +)"
          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onResetZoom}
          title="Reset Canvas Center"
          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors border-l border-white/5 ml-0.5"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </header>
  );
};
