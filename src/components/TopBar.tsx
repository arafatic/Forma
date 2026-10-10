import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ChevronDown,
  Check,
  X,
  LayoutGrid,
} from 'lucide-react';

export interface TopBarProps {
  zoom: number;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onNewDocument: () => void;
  onExportSvg: (mode?: 'artboard' | 'design') => void;
  elementCount: number;
  documentTitle?: string;
  isModified?: boolean;
  onCloseDocument?: () => void;
  onOpenCommandSearch?: () => void;
  activeWorkspace?: string;
  onWorkspaceChange?: (workspace: string) => void;
}

const WORKSPACE_OPTIONS = [
  'Essentials',
  'Essentials Classic',
  'Typography',
  'Painting',
  'Layout',
];

export const TopBar: React.FC<TopBarProps> = ({
  zoom,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  onNewDocument,
  onExportSvg,
  elementCount,
  documentTitle = 'Untitled-1',
  isModified = false,
  onCloseDocument,
  onOpenCommandSearch,
  activeWorkspace: initialWorkspace = 'Essentials',
  onWorkspaceChange,
}) => {
  const [activeWorkspace, setActiveWorkspace] = useState<string>(initialWorkspace);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState<boolean>(false);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);

  // Close workspace dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(e.target as Node)
      ) {
        setIsWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectWorkspace = (ws: string) => {
    setActiveWorkspace(ws);
    setIsWorkspaceMenuOpen(false);
    onWorkspaceChange?.(ws);
  };

  const handleCloseTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCloseDocument) {
      onCloseDocument();
    } else {
      onNewDocument();
    }
  };

  return (
    <header className="relative w-full z-30 select-none flex flex-col bg-[#161619] border-b border-[#2d2d2d]">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP UTILITY STRIP                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="relative h-10 bg-[#161619]/95 backdrop-blur flex items-center justify-between px-3 z-30 border-b border-white/[0.06]">
        {/* Native macOS window drag region */}
        <div
          data-tauri-drag-region
          className="absolute inset-0 z-0 pointer-events-auto"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        {/* LEFT: Window controls offset + Forma Logo + Quick Actions */}
        <div
          className="relative z-10 flex items-center gap-3"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Safe spacing for macOS traffic light buttons */}
          <div className="w-16 h-full pointer-events-none" />

          {/* Forma Brand Identity */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-sm shadow-sky-500/20">
              <span className="text-[10px] font-black text-white leading-none">F</span>
            </div>
            <span className="text-xs font-semibold tracking-wide text-zinc-200">Forma</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Quick Actions (New & Export SVG) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onNewDocument}
              type="button"
              title="New Document (Cmd+N)"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/90 hover:bg-zinc-700/90 rounded-md transition-colors border border-white/10 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>New</span>
            </button>

            <button
              onClick={() => onExportSvg('artboard')}
              type="button"
              title="Export SVG (Artboard)"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/50 border border-sky-800/40 rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export SVG</span>
            </button>
          </div>
        </div>

        {/* CENTER: Adobe-style Command Search Pill */}
        <div
          className="relative z-10 flex items-center justify-center flex-1 max-w-sm px-4"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={onOpenCommandSearch}
            type="button"
            className="w-full flex items-center justify-between px-3 py-1 bg-zinc-900/90 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-white/10 rounded-full text-xs transition-colors shadow-inner group cursor-pointer"
            title="Search commands, tools, and actions (Cmd+K)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 truncate">
                Search commands and tools
              </span>
            </div>
            <kbd className="text-[10px] font-mono bg-zinc-800 group-hover:bg-zinc-750 border border-white/10 rounded px-1.5 py-0.2 text-zinc-400 shadow-sm">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* RIGHT: Workspace Dropdown + Zoom Controls */}
        <div
          className="relative z-10 flex items-center gap-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Workspace Layout Dropdown ("Essentials") */}
          <div className="relative" ref={workspaceMenuRef}>
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 rounded-md text-xs font-medium transition-colors cursor-pointer shadow-sm"
              title="Switch Workspace Layout"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px]">{activeWorkspace}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
            </button>

            {isWorkspaceMenuOpen && (
              <div className="absolute right-0 top-8 z-50 w-44 bg-[#1e1e24] border border-white/10 rounded-xl p-1.5 shadow-2xl shadow-black/90 text-xs text-zinc-300 animate-in fade-in zoom-in-95 duration-100">
                <span className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-1 block">
                  Workspaces
                </span>
                {WORKSPACE_OPTIONS.map((ws) => (
                  <button
                    key={ws}
                    onClick={() => handleSelectWorkspace(ws)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-xs transition-colors"
                  >
                    <span>{ws}</span>
                    {activeWorkspace === ws && (
                      <Check className="w-3.5 h-3.5 text-sky-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Zoom controls strip */}
          <div className="flex items-center gap-0.5 bg-zinc-900/90 rounded-md border border-white/[0.08] p-0.5">
            <button
              onClick={onZoomOut}
              title="Zoom Out (Cmd -)"
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onResetZoom}
              title="Reset Zoom to 100% (Cmd 0)"
              className="px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition-colors min-w-[50px] text-center cursor-pointer"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={onZoomIn}
              title="Zoom In (Cmd +)"
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onResetZoom}
              title="Reset Canvas Center"
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors border-l border-white/5 ml-0.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. ILLUSTRATOR-STYLE DOCUMENT TAB BAR                         */}
      {/* ------------------------------------------------------------- */}
      <div className="h-8 bg-[#18181b] flex items-center justify-between px-2 text-xs select-none">
        {/* Left: Document Tabs List */}
        <div className="flex items-center h-full">
          {/* Active Document Tab */}
          <div
            className="group relative flex items-center gap-2 px-3 h-full bg-[#232328] text-zinc-200 border-r border-[#2d2d2d] border-t-2 border-t-sky-500 font-medium text-[11px] cursor-default shadow-sm"
          >
            {/* Active status indicator dot */}
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isModified ? 'bg-amber-400' : 'bg-sky-400'
              }`}
            />

            {/* Document Name @ Zoom % (RGB/Preview) */}
            <span className="font-mono text-zinc-200 tracking-tight">
              {documentTitle} @ {Math.round(zoom * 100)}% (RGB/Preview)
            </span>

            {/* Close Tab Button */}
            <button
              onClick={handleCloseTab}
              type="button"
              className="p-0.5 ml-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Close Document"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* New Tab (+) Button */}
          <button
            onClick={onNewDocument}
            type="button"
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded transition-colors ml-1 cursor-pointer"
            title="New Document Tab (Cmd+N)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Preview mode / document stats badge */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono pr-2">
          <span className="text-zinc-400">GPU Preview</span>
          <span className="text-zinc-600">•</span>
          <span>
            {elementCount} {elementCount === 1 ? 'shape' : 'shapes'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
