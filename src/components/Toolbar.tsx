import React from 'react';
import { MousePointer, PenTool, Square, Circle, Type } from 'lucide-react';
import { ToolType } from '../types/vector';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  className?: string;
}

interface ToolItem {
  id: ToolType;
  name: string;
  hotkey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolItem[] = [
  { id: 'select', name: 'Select Tool', hotkey: 'V', icon: MousePointer },
  { id: 'pen', name: 'Pen Tool', hotkey: 'P', icon: PenTool },
  { id: 'rectangle', name: 'Rectangle Tool', hotkey: 'M', icon: Square },
  { id: 'ellipse', name: 'Ellipse Tool', hotkey: 'L', icon: Circle },
  { id: 'text', name: 'Text Tool', hotkey: 'T', icon: Type },
];

export const Toolbar: React.FC<ToolbarProps> = ({ currentTool, onSelectTool, className = '' }) => {
  return (
    <aside className={`absolute top-16 z-20 flex flex-col gap-1.5 p-1.5 bg-[#18181b]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl shadow-black/60 select-none transition-all duration-150 ${className || 'left-4'}`}>
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = currentTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
              isActive
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80 active:bg-zinc-700/60'
            }`}
            title={`${tool.name} (${tool.hotkey})`}
          >
            <Icon className="w-5 h-5 transition-transform group-hover:scale-105" />

            {/* Hover Tooltip */}
            <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-white/10 text-white text-xs rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 flex items-center gap-1.5">
              <span className="font-medium">{tool.name}</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300 rounded border border-white/10">
                {tool.hotkey}
              </kbd>
            </div>
          </button>
        );
      })}
    </aside>
  );
};
