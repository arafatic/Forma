import React, { useState } from 'react';
import { Artboard, UnitType } from '../types/vector';
import {
  Monitor,
  Share2,
  Printer,
  Sparkles,
  X,
  Smartphone,
  CreditCard,
  FileText,
} from 'lucide-react';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (artboard: Artboard) => void;
  currentElementCount: number;
}

interface PresetItem {
  id: string;
  name: string;
  category: 'web' | 'social' | 'print';
  width: number;
  height: number;
  unit: UnitType;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const PRESETS: PresetItem[] = [
  // Web Presets
  {
    id: 'fhd',
    name: 'FHD Desktop',
    category: 'web',
    width: 1920,
    height: 1080,
    unit: 'px',
    description: '1920 × 1080 px',
    icon: Monitor,
  },
  {
    id: 'macbook',
    name: 'MacBook Pro',
    category: 'web',
    width: 1440,
    height: 900,
    unit: 'px',
    description: '1440 × 900 px',
    icon: Monitor,
  },
  {
    id: 'hd',
    name: 'HD Display',
    category: 'web',
    width: 1280,
    height: 720,
    unit: 'px',
    description: '1280 × 720 px',
    icon: Monitor,
  },

  // Social Presets
  {
    id: 'ig-post',
    name: 'Instagram Post',
    category: 'social',
    width: 1080,
    height: 1080,
    unit: 'px',
    description: '1080 × 1080 px (1:1)',
    icon: Share2,
  },
  {
    id: 'ig-story',
    name: 'Story / Reel / TikTok',
    category: 'social',
    width: 1080,
    height: 1920,
    unit: 'px',
    description: '1080 × 1920 px (9:16)',
    icon: Smartphone,
  },
  {
    id: 'banner',
    name: 'Social Banner',
    category: 'social',
    width: 1200,
    height: 630,
    unit: 'px',
    description: '1200 × 630 px (1.91:1)',
    icon: Share2,
  },

  // Print Presets
  {
    id: 'a4',
    name: 'A4 Document',
    category: 'print',
    width: 210,
    height: 297,
    unit: 'mm',
    description: '210 × 297 mm (ISO 216)',
    icon: FileText,
  },
  {
    id: 'letter',
    name: 'Letter',
    category: 'print',
    width: 8.5,
    height: 11,
    unit: 'in',
    description: '8.5 × 11 in (US Standard)',
    icon: Printer,
  },
  {
    id: 'business-card',
    name: 'Business Card',
    category: 'print',
    width: 3.5,
    height: 2,
    unit: 'in',
    description: '3.5 × 2 in (Standard)',
    icon: CreditCard,
  },
];

export const UNIT_CONVERSIONS = {
  toPx: (val: number, unit: UnitType): number => {
    switch (unit) {
      case 'in':
        return Math.round(val * 96);
      case 'mm':
        return Math.round(val * (96 / 25.4));
      case 'pt':
        return Math.round(val * (96 / 72));
      case 'px':
      default:
        return Math.round(val);
    }
  },
  fromPx: (px: number, unit: UnitType): number => {
    switch (unit) {
      case 'in':
        return Math.round((px / 96) * 100) / 100;
      case 'mm':
        return Math.round((px / (96 / 25.4)) * 10) / 10;
      case 'pt':
        return Math.round((px / (96 / 72)) * 10) / 10;
      case 'px':
      default:
        return Math.round(px);
    }
  },
};

export const NewDocumentModal: React.FC<NewDocumentModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  currentElementCount,
}) => {
  const [activeTab, setActiveTab] = useState<'web' | 'social' | 'print'>('web');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('fhd');
  const [docName, setDocName] = useState<string>('Artboard 1');
  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);
  const [unit, setUnit] = useState<UnitType>('px');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [bgColor, setBgColor] = useState<string>('#ffffff');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PresetItem) => {
    setSelectedPresetId(preset.id);
    setWidth(preset.width);
    setHeight(preset.height);
    setUnit(preset.unit);
    setOrientation(preset.width >= preset.height ? 'landscape' : 'portrait');
  };

  const handleOrientationChange = (newOrientation: 'landscape' | 'portrait') => {
    if (newOrientation === orientation) return;
    setOrientation(newOrientation);
    // Swap width and height to reflect orientation
    const minVal = Math.min(width, height);
    const maxVal = Math.max(width, height);
    if (newOrientation === 'portrait') {
      setWidth(minVal);
      setHeight(maxVal);
    } else {
      setWidth(maxVal);
      setHeight(minVal);
    }
  };

  const handleUnitChange = (newUnit: UnitType) => {
    if (newUnit === unit) return;
    // Convert current width and height to new unit
    const pxW = UNIT_CONVERSIONS.toPx(width, unit);
    const pxH = UNIT_CONVERSIONS.toPx(height, unit);
    setUnit(newUnit);
    setWidth(UNIT_CONVERSIONS.fromPx(pxW, newUnit));
    setHeight(UNIT_CONVERSIONS.fromPx(pxH, newUnit));
  };

  const handleCreate = () => {
    const finalWidthPx = Math.max(50, UNIT_CONVERSIONS.toPx(width, unit));
    const finalHeightPx = Math.max(50, UNIT_CONVERSIONS.toPx(height, unit));

    const newArtboard: Artboard = {
      id: `artboard_${Date.now()}`,
      name: docName.trim() || 'Artboard 1',
      x: 0,
      y: 0,
      width: finalWidthPx,
      height: finalHeightPx,
      backgroundColor: bgColor,
      unit,
    };

    onCreate(newArtboard);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-3xl bg-[#1e1e24] border border-white/10 rounded-2xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden text-zinc-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">New Document</h2>
              <p className="text-[11px] text-zinc-400">Choose a preset or configure custom canvas artboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Left Presets + Right Properties */}
        <div className="flex flex-1 min-h-[380px] divide-x divide-white/[0.08]">
          {/* Left Column: Category Tabs & Preset Cards */}
          <div className="flex-1 p-5 flex flex-col gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 p-1 bg-zinc-900 rounded-lg border border-white/5">
              <button
                onClick={() => setActiveTab('web')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'web'
                    ? 'bg-zinc-800 text-sky-400 shadow-sm border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Web
              </button>
              <button
                onClick={() => setActiveTab('social')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'social'
                    ? 'bg-zinc-800 text-sky-400 shadow-sm border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                Social
              </button>
              <button
                onClick={() => setActiveTab('print')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'print'
                    ? 'bg-zinc-800 text-sky-400 shadow-sm border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-3 flex-1 auto-rows-max">
              {PRESETS.filter((p) => p.category === activeTab).map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const Icon = preset.icon || Monitor;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500/80 ring-1 ring-sky-500/50 shadow-lg shadow-sky-500/10'
                        : 'bg-zinc-900/60 border-white/5 hover:border-white/20 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${
                        isSelected
                          ? 'bg-sky-500 text-white'
                          : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-zinc-200 leading-tight mb-1">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Custom Settings Inspector */}
          <div className="w-72 p-5 flex flex-col justify-between bg-zinc-900/30">
            <div className="space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Artboard Details
              </span>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Name</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Width & Height */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">Width</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">Height</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Unit Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Units</label>
                <div className="grid grid-cols-4 gap-1 bg-zinc-900 p-0.5 rounded-lg border border-white/5">
                  {(['px', 'in', 'mm', 'pt'] as UnitType[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => handleUnitChange(u)}
                      className={`py-1 text-[11px] font-mono rounded transition-colors ${
                        unit === u
                          ? 'bg-zinc-800 text-sky-400 border border-white/10 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Orientation</label>
                <div className="grid grid-cols-2 gap-1.5 bg-zinc-900 p-1 rounded-lg border border-white/5">
                  <button
                    onClick={() => handleOrientationChange('portrait')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 text-xs rounded transition-colors ${
                      orientation === 'portrait'
                        ? 'bg-zinc-800 text-sky-400 border border-white/10 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="w-2.5 h-3.5 border border-current rounded-xs" />
                    Portrait
                  </button>
                  <button
                    onClick={() => handleOrientationChange('landscape')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 text-xs rounded transition-colors ${
                      orientation === 'landscape'
                        ? 'bg-zinc-800 text-sky-400 border border-white/10 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="w-3.5 h-2.5 border border-current rounded-xs" />
                    Landscape
                  </button>
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Background</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBgColor('#ffffff')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs transition-colors ${
                      bgColor === '#ffffff'
                        ? 'bg-zinc-800 border-sky-500 text-white'
                        : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full bg-white border border-black/20" />
                    White
                  </button>
                  <button
                    onClick={() => setBgColor('transparent')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs transition-colors ${
                      bgColor === 'transparent'
                        ? 'bg-zinc-800 border-sky-500 text-white'
                        : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full border border-white/40 bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-[size:4px_4px]" />
                    Transparent
                  </button>
                </div>
              </div>

              {/* Warning if elements exist */}
              {currentElementCount > 0 && (
                <p className="text-[10px] text-amber-400/90 leading-tight pt-1">
                  Creating will clear current {currentElementCount} element{currentElementCount > 1 ? 's' : ''}.
                </p>
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition-colors border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-400 active:bg-sky-600 rounded-lg transition-colors shadow-md shadow-sky-500/25 cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
