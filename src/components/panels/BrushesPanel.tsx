import React, { useState } from 'react';
import { Paintbrush, Plus, Sliders, Sparkles, Check } from 'lucide-react';
import { PanelProps } from './types';
import { StrokeCap, StrokeJoin } from '../../types/vector';

interface BrushPreset {
  id: string;
  name: string;
  type: 'calligraphic' | 'art' | 'scatter' | 'bristle';
  width: number;
  cap: StrokeCap;
  join: StrokeJoin;
  dashArray?: number[];
  previewSvg: string;
}

const BRUSH_PRESETS: BrushPreset[] = [
  {
    id: 'round-5pt',
    name: '5pt Round Calligraphic',
    type: 'calligraphic',
    width: 5,
    cap: 'round',
    join: 'round',
    previewSvg: 'M 2 10 Q 40 4 80 10 Q 120 16 160 10',
  },
  {
    id: 'chisel-calligraphic',
    name: '3pt Flat Chisel',
    type: 'calligraphic',
    width: 3.5,
    cap: 'square',
    join: 'miter',
    previewSvg: 'M 2 10 L 160 10',
  },
  {
    id: 'charcoal-art',
    name: 'Charcoal Feathered',
    type: 'art',
    width: 4,
    cap: 'round',
    join: 'round',
    dashArray: [1, 2],
    previewSvg: 'M 2 10 Q 50 14 100 8 T 160 10',
  },
  {
    id: 'technical-pen',
    name: '0.75pt Technical Pen',
    type: 'calligraphic',
    width: 1.5,
    cap: 'round',
    join: 'round',
    previewSvg: 'M 2 10 L 160 10',
  },
  {
    id: 'stipple-scatter',
    name: 'Stipple Dot Scatter',
    type: 'scatter',
    width: 3,
    cap: 'round',
    join: 'round',
    dashArray: [2, 6],
    previewSvg: 'M 2 10 L 160 10',
  },
  {
    id: 'bristle-fan',
    name: 'Bristle Fan Stroke',
    type: 'bristle',
    width: 7,
    cap: 'round',
    join: 'round',
    dashArray: [12, 3, 2, 3],
    previewSvg: 'M 2 10 Q 40 16 80 8 Q 120 4 160 10',
  },
];

export const BrushesPanel: React.FC<PanelProps> = ({
  selectedElement,
  defaultStrokeWidth,
  defaultStroke,
  onChangeProperties,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'calligraphic' | 'art' | 'scatter' | 'bristle'>('all');
  const [activeBrushId, setActiveBrushId] = useState<string>('round-5pt');

  const currentWidth = selectedElement?.strokeWidth || defaultStrokeWidth;
  const currentStroke = selectedElement?.stroke || defaultStroke;

  const filtered = BRUSH_PRESETS.filter((b) => filterType === 'all' || b.type === filterType);

  const applyBrush = (brush: BrushPreset) => {
    setActiveBrushId(brush.id);
    onChangeProperties({
      strokeWidth: brush.width,
      strokeCap: brush.cap,
      strokeJoin: brush.join,
      strokeDashArray: brush.dashArray || [],
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs animate-in fade-in duration-100 select-none custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
        <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Paintbrush className="w-3.5 h-3.5 text-sky-400" />
          Brushes (F5)
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">
          {BRUSH_PRESETS.length} presets
        </span>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
        {(['all', 'calligraphic', 'art', 'scatter', 'bristle'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterType(cat)}
            className={`px-2 py-1 rounded text-[10px] font-medium capitalize whitespace-nowrap cursor-pointer transition-colors ${
              filterType === cat
                ? 'bg-sky-500 text-white font-semibold shadow-sm'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Brush Presets List */}
      <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-white/5 space-y-1.5">
        <span className="text-[11px] font-medium text-zinc-400 px-1 block mb-1">
          Brush Library
        </span>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
          {filtered.map((brush) => {
            const isSelected = activeBrushId === brush.id;
            return (
              <button
                key={brush.id}
                onClick={() => applyBrush(brush)}
                className={`w-full p-2 rounded-lg border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500/15 border-sky-500/50 text-white'
                    : 'bg-zinc-850 hover:bg-zinc-800 border-white/5 text-zinc-300'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-medium truncate">{brush.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{brush.width}px</span>
                  </div>
                  {/* SVG Stroke Preview */}
                  <svg className="w-full h-4 overflow-visible" viewBox="0 0 160 20">
                    <path
                      d={brush.previewSvg}
                      fill="none"
                      stroke={currentStroke === 'none' ? '#38bdf8' : currentStroke}
                      strokeWidth={brush.width}
                      strokeLinecap={brush.cap}
                      strokeLinejoin={brush.join}
                      strokeDasharray={brush.dashArray ? brush.dashArray.join(',') : undefined}
                    />
                  </svg>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stroke Weight Modifier */}
      <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-300">Stroke Weight</span>
          <span className="text-[11px] font-mono text-sky-400">{currentWidth} px</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="24"
          step="0.5"
          value={currentWidth}
          onChange={(e) => onChangeProperties({ strokeWidth: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
        <div className="flex items-center justify-between gap-1 pt-1">
          {[1, 2, 4, 8, 12, 16].map((w) => (
            <button
              key={w}
              onClick={() => onChangeProperties({ strokeWidth: w })}
              className={`flex-1 py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                currentWidth === w
                  ? 'bg-sky-500/20 text-sky-400 border-sky-400/40'
                  : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-400 border-white/5'
              }`}
            >
              {w}pt
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
