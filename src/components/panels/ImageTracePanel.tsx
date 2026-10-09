import React, { useState } from 'react';
import { PanelProps } from './types';
import { Wand2, Sliders, CheckCircle2, RefreshCw } from 'lucide-react';

export const ImageTracePanel: React.FC<PanelProps> = ({
  selectedElement,
  selectedIds,
  onChangeProperties,
}) => {
  const [preset, setPreset] = useState<'default' | 'high_color' | 'low_color' | 'grayscale' | 'bw' | 'silhouette'>('default');
  const [threshold, setThreshold] = useState<number>(128);
  const [paths, setPaths] = useState<number>(50);
  const [corners, setCorners] = useState<number>(50);
  const [noise, setNoise] = useState<number>(25);
  const [preview, setPreview] = useState<boolean>(true);
  const [isTracing, setIsTracing] = useState<boolean>(false);

  const hasSelection = selectedElement !== null || (selectedIds && selectedIds.length > 0);

  const handleTrace = () => {
    if (!hasSelection) return;
    setIsTracing(true);
    setTimeout(() => {
      setIsTracing(false);
      // In practice, this converts raster image to vector path shapes
    }, 600);
  };

  const handleExpand = () => {
    // Expands traced result into editable vector paths
  };

  return (
    <div className="flex flex-col h-full bg-[#262626] text-neutral-300 text-xs overflow-y-auto select-none p-3 space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-2 border-b border-[#333]">
        <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Image Trace</span>
        </div>
        <span className="text-[10px] text-neutral-500 font-mono">Vectorcraft Engine</span>
      </div>

      {!hasSelection && (
        <div className="bg-[#1f1f1f] border border-[#333] rounded p-2.5 text-[11px] text-neutral-400 flex flex-col gap-1">
          <span className="text-neutral-300 font-medium">No Raster Selected</span>
          <span>Select an image or placed raster graphic on the canvas to trace into vector paths.</span>
        </div>
      )}

      {/* Preset Selection */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Preset</label>
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as any)}
          className="w-full bg-[#1a1a1a] border border-[#383838] rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
        >
          <option value="default">Default</option>
          <option value="high_color">High Fidelity Photo</option>
          <option value="low_color">16 Colors</option>
          <option value="grayscale">Grayscale</option>
          <option value="bw">Black and White Logo</option>
          <option value="silhouette">Silhouettes</option>
        </select>
      </div>

      {/* Sliders */}
      <div className="space-y-3 bg-[#1e1e1e] p-2.5 rounded border border-[#333]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-400 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-neutral-400" /> Threshold
          </span>
          <span className="font-mono text-neutral-300">{threshold}</span>
        </div>
        <input
          type="range"
          min="1"
          max="255"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-blue-500 h-1 bg-[#333] rounded cursor-pointer"
        />

        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-neutral-400">Paths Fitting</span>
          <span className="font-mono text-neutral-300">{paths}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={paths}
          onChange={(e) => setPaths(Number(e.target.value))}
          className="w-full accent-blue-500 h-1 bg-[#333] rounded cursor-pointer"
        />

        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-neutral-400">Corners</span>
          <span className="font-mono text-neutral-300">{corners}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={corners}
          onChange={(e) => setCorners(Number(e.target.value))}
          className="w-full accent-blue-500 h-1 bg-[#333] rounded cursor-pointer"
        />

        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-neutral-400">Noise Filter</span>
          <span className="font-mono text-neutral-300">{noise} px</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={noise}
          onChange={(e) => setNoise(Number(e.target.value))}
          className="w-full accent-blue-500 h-1 bg-[#333] rounded cursor-pointer"
        />
      </div>

      {/* Options */}
      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
          <input
            type="checkbox"
            checked={preview}
            onChange={(e) => setPreview(e.target.checked)}
            className="rounded border-[#444] bg-[#1a1a1a] text-blue-500 focus:ring-0"
          />
          <span>Preview vector outlines</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
          <input
            type="checkbox"
            defaultChecked
            className="rounded border-[#444] bg-[#1a1a1a] text-blue-500 focus:ring-0"
          />
          <span>Ignore White Background</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          onClick={handleTrace}
          disabled={!hasSelection || isTracing}
          className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none rounded text-white font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          {isTracing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Tracing Path Vectors...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5" />
              <span>Trace Image</span>
            </>
          )}
        </button>

        <button
          onClick={handleExpand}
          disabled={!hasSelection}
          className="w-full py-1.5 px-3 bg-[#333] hover:bg-[#3d3d3d] disabled:opacity-50 disabled:pointer-events-none border border-[#444] rounded text-neutral-200 font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Expand to Vector Paths</span>
        </button>
      </div>
    </div>
  );
};
