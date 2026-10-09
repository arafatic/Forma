import React, { useMemo } from 'react';
import { Library, Plus, Image as ImageIcon, Palette, FolderPlus, Download } from 'lucide-react';
import { PanelProps } from './types';

const PRESET_PALETTES = [
  {
    name: 'Forma Brand',
    colors: ['#0ea5e9', '#38bdf8', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'],
  },
  {
    name: 'Vibrant Neon',
    colors: ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f59e0b'],
  },
  {
    name: 'Neutral Dark',
    colors: ['#09090b', '#18181b', '#27272a', '#3f3f46', '#71717a', '#a1a1aa'],
  },
  {
    name: 'Pastel Dream',
    colors: ['#fecdd3', '#fed7aa', '#fef08a', '#bbf7d0', '#bae6fd', '#ddd6fe'],
  },
];

export const LibrariesPanel: React.FC<PanelProps> = ({
  elements,
  onChangeProperties,
  onPlaceAsset,
  onSelectElement,
}) => {
  // Extract all unique colors in document
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

  // Placed image and vector assets
  const placedAssets = useMemo(() => {
    return elements.filter(
      (el) =>
        el.type === 'image' ||
        (el.name && el.name.toLowerCase().includes('imported')) ||
        (el.name && el.name.toLowerCase().includes('svg'))
    );
  }, [elements]);

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs animate-in fade-in duration-100 select-none custom-scrollbar">
      {/* 1. Document Swatches Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
          <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            Document Swatches
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            {documentColors.length} colors
          </span>
        </div>

        <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-300">Active Document Palette</span>
            <span className="text-[10px] text-zinc-500">Click to apply fill</span>
          </div>

          {documentColors.length === 0 ? (
            <p className="text-zinc-500 text-xs py-1">No custom colors detected yet.</p>
          ) : (
            <div className="grid grid-cols-6 gap-2">
              {documentColors.map((color) => (
                <button
                  key={color}
                  onClick={() => onChangeProperties({ fill: color })}
                  className="w-8 h-8 rounded-lg border border-white/10 hover:scale-105 active:scale-95 transition-transform shadow-sm relative group cursor-pointer"
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  <span className="sr-only">{color}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Color Palettes Library Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
          <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Library className="w-3.5 h-3.5 text-emerald-400" />
            Preset Libraries
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">4 Themes</span>
        </div>

        <div className="space-y-2">
          {PRESET_PALETTES.map((palette) => (
            <div
              key={palette.name}
              className="p-2.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px] text-zinc-300 font-medium">
                <span>{palette.name}</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {palette.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => onChangeProperties({ fill: c })}
                    className="h-6 rounded-md border border-white/10 hover:scale-105 transition-transform cursor-pointer"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Placed Media Assets Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
          <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            Placed Assets
          </span>
          {onPlaceAsset && (
            <button
              onClick={onPlaceAsset}
              className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              <Plus className="w-3 h-3" />
              <span>Place File</span>
            </button>
          )}
        </div>

        <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
          {placedAssets.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-zinc-500 text-xs">No media or vector assets placed.</p>
              {onPlaceAsset && (
                <button
                  onClick={onPlaceAsset}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-white/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-400" />
                  <span>Import SVG or Image</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {placedAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => onSelectElement?.(asset.id)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-white/5 cursor-pointer text-xs transition-colors group"
                >
                  <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate flex-1 text-zinc-200 font-medium">
                    {asset.name || asset.type}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">
                    {asset.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
