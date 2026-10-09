import React, { useState } from 'react';
import { PanelProps } from './types';
import { Tag, Link2, EyeOff, FileCode } from 'lucide-react';

export const AttributesPanel: React.FC<PanelProps> = ({
  selectedElement,
  selectedIds,
  onChangeProperties,
}) => {
  const [overprintFill, setOverprintFill] = useState<boolean>(false);
  const [overprintStroke, setOverprintStroke] = useState<boolean>(false);
  const [nonPrinting, setNonPrinting] = useState<boolean>(false);
  const [elementId, setElementId] = useState<string>(selectedElement?.id || '');
  const [cssClass, setCssClass] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [target, setTarget] = useState<string>('_blank');

  return (
    <div className="flex flex-col h-full bg-[#262626] text-neutral-300 text-xs overflow-y-auto select-none p-3 space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-2 border-b border-[#333]">
        <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
          <Tag className="w-3.5 h-3.5 text-blue-400" />
          <span>Attributes</span>
        </div>
        <span className="text-[10px] text-neutral-500 font-mono">SVG DOM</span>
      </div>

      {!selectedElement && (
        <div className="bg-[#1f1f1f] border border-[#333] rounded p-2.5 text-[11px] text-neutral-400">
          Select an object to inspect and modify its SVG DOM attributes, printing options, and hyperlinks.
        </div>
      )}

      {/* Overprint Options */}
      <div className="space-y-2 bg-[#1e1e1e] p-2.5 rounded border border-[#333]">
        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
          Print & Output
        </span>
        <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
          <input
            type="checkbox"
            checked={overprintFill}
            onChange={(e) => setOverprintFill(e.target.checked)}
            disabled={!selectedElement}
            className="rounded border-[#444] bg-[#1a1a1a] text-blue-500 focus:ring-0 disabled:opacity-40"
          />
          <span>Overprint Fill</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
          <input
            type="checkbox"
            checked={overprintStroke}
            onChange={(e) => setOverprintStroke(e.target.checked)}
            disabled={!selectedElement}
            className="rounded border-[#444] bg-[#1a1a1a] text-blue-500 focus:ring-0 disabled:opacity-40"
          />
          <span>Overprint Stroke</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
          <input
            type="checkbox"
            checked={nonPrinting}
            onChange={(e) => setNonPrinting(e.target.checked)}
            disabled={!selectedElement}
            className="rounded border-[#444] bg-[#1a1a1a] text-blue-500 focus:ring-0 disabled:opacity-40"
          />
          <span className="flex items-center gap-1.5">
            <EyeOff className="w-3 h-3 text-neutral-500" /> Non-Printing Object
          </span>
        </label>
      </div>

      {/* SVG ID & Class */}
      <div className="space-y-2.5 bg-[#1e1e1e] p-2.5 rounded border border-[#333]">
        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
          <FileCode className="w-3 h-3 text-emerald-400" />
          <span>SVG Identifiers</span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-neutral-400">ID / Selector</span>
          <input
            type="text"
            value={elementId}
            onChange={(e) => setElementId(e.target.value)}
            disabled={!selectedElement}
            placeholder={selectedElement ? selectedElement.id : "No selection"}
            className="w-full bg-[#141414] border border-[#383838] rounded px-2 py-1 text-xs text-neutral-200 font-mono focus:outline-none focus:border-blue-500 disabled:opacity-40"
          />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-neutral-400">Class Name</span>
          <input
            type="text"
            value={cssClass}
            onChange={(e) => setCssClass(e.target.value)}
            disabled={!selectedElement}
            placeholder="e.g. hero-icon accent"
            className="w-full bg-[#141414] border border-[#383838] rounded px-2 py-1 text-xs text-neutral-200 font-mono focus:outline-none focus:border-blue-500 disabled:opacity-40"
          />
        </div>
      </div>

      {/* Interactive Link / URL */}
      <div className="space-y-2.5 bg-[#1e1e1e] p-2.5 rounded border border-[#333]">
        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
          <Link2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Image Map / Hyperlink</span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-neutral-400">Target URL (href)</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!selectedElement}
            placeholder="https://example.com"
            className="w-full bg-[#141414] border border-[#383838] rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none border-neutral-700 disabled:opacity-40"
          />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-neutral-400">Window Target</span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={!selectedElement}
            className="w-full bg-[#141414] border border-[#383838] rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 disabled:opacity-40"
          >
            <option value="_blank">_blank (New Window)</option>
            <option value="_self">_self (Same Frame)</option>
            <option value="_parent">_parent (Parent Frame)</option>
            <option value="_top">_top (Full Body)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
