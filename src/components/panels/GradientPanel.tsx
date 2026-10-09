import React, { useState } from 'react';
import { Blend, ArrowLeftRight, Trash2, Plus, Check } from 'lucide-react';
import { PanelProps } from './types';
import { GradientFill, ColorStop } from '../../types/vector';

const GRADIENT_PRESETS: Array<{ name: string; gradient: GradientFill }> = [
  {
    name: 'Forma Sky',
    gradient: {
      type: 'linear',
      startX: 0,
      startY: 0,
      endX: 1,
      endY: 1,
      stops: [
        { id: '1', offset: 0, color: '#38bdf8' },
        { id: '2', offset: 1, color: '#6366f1' },
      ],
    },
  },
  {
    name: 'Neon Sunset',
    gradient: {
      type: 'linear',
      startX: 0,
      startY: 0,
      endX: 1,
      endY: 0,
      stops: [
        { id: '1', offset: 0, color: '#f59e0b' },
        { id: '2', offset: 0.5, color: '#ec4899' },
        { id: '3', offset: 1, color: '#8b5cf6' },
      ],
    },
  },
  {
    name: 'Midnight Teal',
    gradient: {
      type: 'linear',
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 1,
      stops: [
        { id: '1', offset: 0, color: '#0f172a' },
        { id: '2', offset: 1, color: '#0d9488' },
      ],
    },
  },
  {
    name: 'Radial Glow',
    gradient: {
      type: 'radial',
      startX: 0.5,
      startY: 0.5,
      endX: 1,
      endY: 1,
      stops: [
        { id: '1', offset: 0, color: '#38bdf8' },
        { id: '2', offset: 1, color: '#0f172a' },
      ],
    },
  },
];

export const GradientPanel: React.FC<PanelProps> = ({
  selectedElement,
  onChangeProperties,
}) => {
  const currentGradient: GradientFill = selectedElement?.gradient || {
    type: 'linear',
    startX: 0,
    startY: 0,
    endX: 1,
    endY: 0,
    stops: [
      { id: 'stop-1', offset: 0, color: '#ffffff' },
      { id: 'stop-2', offset: 1, color: '#000000' },
    ],
  };

  const [activeStopIdx, setActiveStopIdx] = useState<number>(0);

  const stops = currentGradient.stops;
  const activeStop = stops[activeStopIdx] || stops[0];

  const updateGradient = (partial: Partial<GradientFill>) => {
    const updated: GradientFill = { ...currentGradient, ...partial };
    onChangeProperties({
      gradient: updated,
      fillType: updated.type,
      fill: `linear-gradient(${stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`,
    });
  };

  const handleTypeChange = (type: 'linear' | 'radial') => {
    updateGradient({ type });
  };

  const handleReverse = () => {
    const reversed = stops.map((s) => ({
      ...s,
      offset: 1 - s.offset,
    })).sort((a, b) => a.offset - b.offset);
    updateGradient({ stops: reversed });
  };

  const handleStopColorChange = (color: string) => {
    const nextStops = stops.map((s, idx) => (idx === activeStopIdx ? { ...s, color } : s));
    updateGradient({ stops: nextStops });
  };

  const handleStopOffsetChange = (offset: number) => {
    const nextStops = stops.map((s, idx) => (idx === activeStopIdx ? { ...s, offset } : s));
    updateGradient({ stops: nextStops });
  };

  const addStop = () => {
    const newStop: ColorStop = {
      id: `stop-${Date.now()}`,
      offset: 0.5,
      color: '#38bdf8',
    };
    const nextStops = [...stops, newStop].sort((a, b) => a.offset - b.offset);
    updateGradient({ stops: nextStops });
    setActiveStopIdx(nextStops.findIndex((s) => s.id === newStop.id));
  };

  const removeStop = (idx: number) => {
    if (stops.length <= 2) return;
    const nextStops = stops.filter((_, i) => i !== idx);
    updateGradient({ stops: nextStops });
    setActiveStopIdx(Math.max(0, activeStopIdx - 1));
  };

  const cssGradientPreview = currentGradient.type === 'linear'
    ? `linear-gradient(to right, ${stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`
    : `radial-gradient(circle, ${stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`;

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs animate-in fade-in duration-100 select-none custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
        <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Blend className="w-3.5 h-3.5 text-sky-400" />
          Gradient (⌘F9)
        </span>
        <button
          onClick={handleReverse}
          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
          title="Reverse Gradient Stops"
        >
          <ArrowLeftRight className="w-3 h-3" />
          <span>Reverse</span>
        </button>
      </div>

      {/* Type Selector (Linear / Radial) */}
      <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-300">Gradient Type</span>
          <div className="flex items-center gap-1 bg-zinc-850 p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => handleTypeChange('linear')}
              className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                currentGradient.type === 'linear'
                  ? 'bg-sky-500 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Linear
            </button>
            <button
              onClick={() => handleTypeChange('radial')}
              className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                currentGradient.type === 'radial'
                  ? 'bg-sky-500 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Radial
            </button>
          </div>
        </div>

        {/* Gradient Ramp Visual Bar */}
        <div className="space-y-2">
          <div
            className="w-full h-8 rounded-lg border border-white/20 shadow-inner relative"
            style={{ background: cssGradientPreview }}
          />

          {/* Draggable/Selectable Stops Strip */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              {stops.map((stop, idx) => (
                <button
                  key={stop.id || idx}
                  onClick={() => setActiveStopIdx(idx)}
                  className={`w-6 h-6 rounded-md border-2 transition-transform cursor-pointer shadow-md flex items-center justify-center ${
                    activeStopIdx === idx
                      ? 'border-sky-400 ring-2 ring-sky-500/40 scale-110'
                      : 'border-white/30 hover:scale-105'
                  }`}
                  style={{ backgroundColor: stop.color }}
                  title={`Stop ${idx + 1}: ${Math.round(stop.offset * 100)}%`}
                >
                  {activeStopIdx === idx && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={addStop}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
                title="Add Gradient Stop"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {stops.length > 2 && (
                <button
                  onClick={() => removeStop(activeStopIdx)}
                  className="p-1 rounded bg-zinc-800 hover:bg-red-900 text-red-400 hover:text-red-200 cursor-pointer"
                  title="Remove Selected Stop"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Stop Inspector */}
      {activeStop && (
        <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-300">
              Stop {activeStopIdx + 1} Properties
            </span>
            <span className="text-[10px] font-mono text-sky-400">
              {Math.round(activeStop.offset * 100)}% Position
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Color Hex</label>
              <input
                type="text"
                value={activeStop.color}
                onChange={(e) => handleStopColorChange(e.target.value)}
                className="w-full bg-zinc-850 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Position Slider</label>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(activeStop.offset * 100)}
                onChange={(e) => handleStopOffsetChange(parseInt(e.target.value, 10) / 100)}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500 mt-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Gradient Presets */}
      <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
        <span className="font-medium text-zinc-300 block">Gradient Presets</span>
        <div className="grid grid-cols-2 gap-2">
          {GRADIENT_PRESETS.map((p) => {
            const preview = p.gradient.type === 'linear'
              ? `linear-gradient(to right, ${p.gradient.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`
              : `radial-gradient(circle, ${p.gradient.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`;

            return (
              <button
                key={p.name}
                onClick={() => updateGradient(p.gradient)}
                className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-white/5 flex items-center gap-2 text-left cursor-pointer transition-colors"
              >
                <div
                  className="w-6 h-6 rounded-md border border-white/10 shrink-0"
                  style={{ background: preview }}
                />
                <span className="text-[11px] text-zinc-300 truncate">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
