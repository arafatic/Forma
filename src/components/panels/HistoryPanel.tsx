import React from 'react';
import { History, RotateCcw, RotateCw, CheckCircle2, Circle } from 'lucide-react';
import { PanelProps } from './types';

export const HistoryPanel: React.FC<PanelProps> = ({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  historyIndex = 0,
  elements,
}) => {
  // Generate visual history steps representation based on current historyIndex
  const totalRevisions = Math.max(historyIndex + 1, 5);
  const steps = Array.from({ length: totalRevisions }, (_, i) => {
    let actionName = 'Initial Document Setup';
    if (i === 1) actionName = 'Create Vector Path';
    else if (i === 2) actionName = 'Apply Fill & Stroke Color';
    else if (i === 3) actionName = 'Transform & Nudge Shape';
    else if (i === 4) actionName = 'Group Elements';
    else if (i > 4) actionName = `State Change #${i}`;

    return {
      index: i,
      name: actionName,
      isCurrent: i === historyIndex,
      isPast: i < historyIndex,
    };
  });

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs animate-in fade-in duration-100 select-none custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
        <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-sky-400" />
          Document History
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">
          State {historyIndex}
        </span>
      </div>

      {/* Undo / Redo Actions Toolbar */}
      <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-750 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-200 font-medium text-xs flex items-center justify-between border border-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              <span>Undo</span>
            </div>
            <kbd className="font-mono text-[10px] text-zinc-500">⌘Z</kbd>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-750 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-200 font-medium text-xs flex items-center justify-between border border-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Redo</span>
            </div>
            <kbd className="font-mono text-[10px] text-zinc-500">⇧⌘Z</kbd>
          </button>
        </div>
      </div>

      {/* History States Stack */}
      <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-2">
        <span className="text-[11px] font-medium text-zinc-400 block mb-1">
          Recent Action Steps
        </span>
        <div className="space-y-1">
          {steps.map((step) => (
            <div
              key={step.index}
              className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                step.isCurrent
                  ? 'bg-sky-500/15 border-sky-500/40 text-white font-medium shadow-sm'
                  : step.isPast
                  ? 'bg-zinc-850/60 border-white/5 text-zinc-300'
                  : 'bg-zinc-900/40 border-transparent text-zinc-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                {step.isCurrent ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                )}
                <span>{step.name}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                #{step.index}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Document Stats */}
      <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-1.5 text-[11px] text-zinc-400">
        <div className="flex justify-between">
          <span>Active Elements</span>
          <span className="font-mono text-white">{elements.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Undo Stack Available</span>
          <span className="font-mono text-emerald-400">{canUndo ? 'Yes' : 'At Base'}</span>
        </div>
        <div className="flex justify-between">
          <span>Redo Stack Available</span>
          <span className="font-mono text-sky-400">{canRedo ? 'Yes' : 'Latest'}</span>
        </div>
      </div>
    </div>
  );
};
