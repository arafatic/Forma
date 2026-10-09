import React, { useState } from 'react';
import { Palette, Check, ArrowLeftRight, Slash } from 'lucide-react';
import { PanelProps } from './types';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 56, g: 189, b: 248 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const SWATCH_PALETTE = [
  '#000000', '#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#ffffff',
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
  '#f43f5e', '#fb7185', '#fdba74', '#fef08a', '#a7f3d0', '#67e8f9',
];

export const ColorPickerPanel: React.FC<PanelProps> = ({
  selectedElement,
  defaultFill,
  defaultStroke,
  defaultOpacity,
  onChangeProperties,
}) => {
  const [target, setTarget] = useState<'fill' | 'stroke'>('fill');
  const [colorModel, setColorModel] = useState<'rgb' | 'hex'>('rgb');

  const activeColor = target === 'fill'
    ? (selectedElement ? selectedElement.fill : defaultFill)
    : (selectedElement ? selectedElement.stroke : defaultStroke);

  const isNone = activeColor === 'none';
  const effectiveHex = isNone ? '#ffffff' : activeColor;
  const rgb = hexToRgb(effectiveHex);
  const opacity = Math.round((selectedElement?.opacity ?? defaultOpacity) * 100);

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const updated = { ...rgb, [channel]: val };
    const newHex = rgbToHex(updated.r, updated.g, updated.b);
    if (target === 'fill') {
      onChangeProperties({ fill: newHex, fillType: 'solid' });
    } else {
      onChangeProperties({ stroke: newHex });
    }
  };

  const handleHexInput = (val: string) => {
    const clean = val.startsWith('#') ? val : `#${val}`;
    if (target === 'fill') {
      onChangeProperties({ fill: clean, fillType: 'solid' });
    } else {
      onChangeProperties({ stroke: clean });
    }
  };

  const setNone = () => {
    if (target === 'fill') {
      onChangeProperties({ fill: 'none' });
    } else {
      onChangeProperties({ stroke: 'none' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs animate-in fade-in duration-100 select-none custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
        <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-sky-400" />
          Color Mixer (F6)
        </span>
        {/* Fill / Stroke Target Selector */}
        <div className="flex items-center gap-1 p-0.5 bg-zinc-900 rounded-lg border border-white/5">
          <button
            onClick={() => setTarget('fill')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              target === 'fill'
                ? 'bg-sky-500 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Fill
          </button>
          <button
            onClick={() => setTarget('stroke')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              target === 'stroke'
                ? 'bg-sky-500 text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Stroke
          </button>
        </div>
      </div>

      {/* Active Color Swatch Card */}
      <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl border-2 border-white/20 shadow-md relative overflow-hidden shrink-0 flex items-center justify-center"
          style={{ backgroundColor: isNone ? '#18181b' : effectiveHex }}
        >
          {isNone && <Slash className="w-8 h-8 text-red-500 rotate-45" />}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">
              {target === 'fill' ? 'Fill Color' : 'Stroke Color'}
            </span>
            <button
              onClick={setNone}
              className="text-[10px] text-red-400 hover:text-red-300 font-medium px-1.5 py-0.5 bg-red-500/10 rounded border border-red-500/20"
            >
              Set None (/)
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-white text-xs font-semibold">
              {isNone ? 'None' : effectiveHex.toUpperCase()}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              RGB({rgb.r}, {rgb.g}, {rgb.b})
            </span>
          </div>
        </div>
      </div>

      {/* RGB Sliders Card */}
      <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-300">RGB Channels</span>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={effectiveHex}
              onChange={(e) => handleHexInput(e.target.value)}
              className="w-20 bg-zinc-800 border border-white/10 rounded px-2 py-0.5 text-[11px] text-white font-mono text-center focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* R Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
            <span className="text-red-400 font-semibold">R</span>
            <span>{rgb.r}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={rgb.r}
            onChange={(e) => handleRgbChange('r', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>

        {/* G Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
            <span className="text-emerald-400 font-semibold">G</span>
            <span>{rgb.g}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={rgb.g}
            onChange={(e) => handleRgbChange('g', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* B Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
            <span className="text-sky-400 font-semibold">B</span>
            <span>{rgb.b}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={rgb.b}
            onChange={(e) => handleRgbChange('b', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Opacity */}
        <div className="space-y-1 pt-1 border-t border-white/5">
          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
            <span>Opacity</span>
            <span>{opacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => onChangeProperties({ opacity: parseInt(e.target.value, 10) / 100 })}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>
      </div>

      {/* Swatches Grid */}
      <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
        <span className="font-medium text-zinc-300 block">Quick Swatches</span>
        <div className="grid grid-cols-6 gap-2">
          {SWATCH_PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => {
                if (target === 'fill') {
                  onChangeProperties({ fill: color, fillType: 'solid' });
                } else {
                  onChangeProperties({ stroke: color });
                }
              }}
              className="w-8 h-8 rounded-lg border border-white/10 hover:scale-105 active:scale-95 transition-transform shadow-sm relative group cursor-pointer"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
