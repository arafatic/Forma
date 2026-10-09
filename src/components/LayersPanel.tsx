import React, { useState } from 'react';
import {
  VectorElement,
  GroupElement,
} from '../types/vector';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Folder,
  Square,
  Circle,
  PenTool,
  ChevronRight,
  ChevronDown,
  Layers,
  Ungroup,
  GripVertical,
  X,
  Type,
  Image as ImageIcon,
} from 'lucide-react';
import { getLayerDisplayName } from '../engine/layers';

interface LayersPanelProps {
  elements: VectorElement[];
  selectedIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSelectLayer: (id: string, isShift: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRenameLayer: (id: string, newName: string) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  selectedIds,
  isOpen,
  onClose,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onRenameLayer,
  onReorderLayers,
  onGroupSelected,
  onUngroupSelected,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleGroupExpand = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(currentName);
  };

  const handleFinishRename = (id: string) => {
    if (editingId === id && editName.trim()) {
      onRenameLayer(id, editName.trim());
    }
    setEditingId(null);
  };

  const getElementIcon = (type: VectorElement['type']) => {
    switch (type) {
      case 'group':
        return <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'rectangle':
        return <Square className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'ellipse':
        return <Circle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
      case 'path':
        return <PenTool className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
    }
  };

  // Layers are rendered in reverse scene order:
  // Top layer on screen is elements[elements.length - 1], so it appears first in the panel.
  const reversedElements = [...elements].map((el, originalIdx) => ({
    el,
    originalIdx,
  })).reverse();

  const handleDragStart = (e: React.DragEvent, originalIdx: number) => {
    setDraggedIndex(originalIdx);
    e.dataTransfer.setData('text/plain', originalIdx.toString());
  };

  const handleDragOver = (e: React.DragEvent, originalIdx: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== originalIdx) {
      setDragOverIndex(originalIdx);
    }
  };

  const handleDrop = (e: React.DragEvent, targetOriginalIdx: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetOriginalIdx) {
      onReorderLayers(draggedIndex, targetOriginalIdx);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <aside className="w-64 bg-[#18181b]/95 backdrop-blur border-r border-white/[0.08] flex flex-col h-full z-20 select-none overflow-hidden animate-in slide-in-from-left-4 duration-150">
      {/* Panel Header */}
      <div className="h-10 px-3 border-b border-white/[0.08] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-zinc-200">Layers</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-400 rounded-full font-mono border border-white/5">
            {elements.length}
          </span>
        </div>

        {/* Quick layer actions */}
        <div className="flex items-center gap-1">
          {selectedIds.length > 1 && (
            <button
              onClick={onGroupSelected}
              title="Group Selected (Cmd+G)"
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            >
              <Folder className="w-3.5 h-3.5" />
            </button>
          )}

          {selectedIds.length === 1 &&
            elements.find((el) => el.id === selectedIds[0])?.type === 'group' && (
              <button
                onClick={onUngroupSelected}
                title="Ungroup (Cmd+Shift+G)"
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              >
                <Ungroup className="w-3.5 h-3.5" />
              </button>
            )}

          <button
            onClick={onClose}
            title="Collapse Layers Panel"
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors ml-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Layer Tree List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {elements.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500 text-xs gap-2">
            <Layers className="w-8 h-8 stroke-1 text-zinc-600" />
            <p>No layers on canvas</p>
            <span className="text-[10px] text-zinc-600">Draw with Pen, Rectangle, or Ellipse</span>
          </div>
        ) : (
          reversedElements.map(({ el, originalIdx }) => {
            const isSelected = selectedIds.includes(el.id);
            const isVisible = el.visible !== false;
            const isLocked = el.locked === true;
            const isGroup = el.type === 'group';
            const isExpanded = isGroup && expandedGroupIds.has(el.id);
            const isDragOver = dragOverIndex === originalIdx;

            return (
              <div key={el.id} className="relative">
                {/* Drag drop insertion guide line */}
                {isDragOver && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-sky-500 z-30" />
                )}

                <div
                  draggable={editingId !== el.id}
                  onDragStart={(e) => handleDragStart(e, originalIdx)}
                  onDragOver={(e) => handleDragOver(e, originalIdx)}
                  onDrop={(e) => handleDrop(e, originalIdx)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => onSelectLayer(el.id, e.shiftKey)}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-500/20 text-white border border-sky-500/40'
                      : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                  } ${!isVisible ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Drag handle grip */}
                    <GripVertical className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab" />

                    {/* Group expand toggle */}
                    {isGroup ? (
                      <button
                        onClick={(e) => toggleGroupExpand(el.id, e)}
                        className="p-0.5 text-zinc-400 hover:text-white shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>
                    ) : (
                      <div className="w-1" />
                    )}

                    {/* Element Type Icon */}
                    {getElementIcon(el.type)}

                    {/* Name or inline rename input */}
                    {editingId === el.id ? (
                      <input
                        type="text"
                        value={editName}
                        autoFocus
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleFinishRename(el.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(el.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-zinc-900 border border-sky-500 text-white rounded px-1.5 py-0.5 text-xs font-medium focus:outline-none"
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => handleStartRename(el.id, getLayerDisplayName(el), e)}
                        title="Double click to rename"
                        className="truncate text-xs font-medium flex-1 text-left select-none"
                      >
                        {getLayerDisplayName(el)}
                      </span>
                    )}
                  </div>

                  {/* Inline controls: Visibility (Eye) & Lock */}
                  <div className="flex items-center gap-1 shrink-0 ml-1.5">
                    {/* Lock toggle button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(el.id);
                      }}
                      title={isLocked ? 'Unlock layer' : 'Lock layer'}
                      className={`p-1 rounded transition-colors ${
                        isLocked
                          ? 'text-amber-400 bg-amber-400/10'
                          : 'text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                    </button>

                    {/* Visibility toggle button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(el.id);
                      }}
                      title={isVisible ? 'Hide layer' : 'Show layer'}
                      className={`p-1 rounded transition-colors ${
                        isVisible
                          ? 'text-zinc-500 hover:text-zinc-200 opacity-0 group-hover:opacity-100'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {isVisible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Sub-layers for expanded group */}
                {isGroup && isExpanded && (
                  <div className="pl-6 border-l border-white/5 ml-3 my-0.5 space-y-0.5">
                    {(el as GroupElement).children.map((child) => (
                      <div
                        key={child.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLayer(child.id, e.shiftKey);
                        }}
                        className={`flex items-center justify-between px-2 py-1 rounded text-[11px] cursor-pointer transition-colors ${
                          selectedIds.includes(child.id)
                            ? 'bg-sky-500/20 text-white border border-sky-500/30'
                            : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {getElementIcon(child.type)}
                          <span className="truncate">{getLayerDisplayName(child)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleVisibility(child.id);
                            }}
                            className="p-0.5 text-zinc-500 hover:text-zinc-300"
                          >
                            {child.visible !== false ? (
                              <Eye className="w-2.5 h-2.5" />
                            ) : (
                              <EyeOff className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
