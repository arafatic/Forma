import React, { useState, useMemo } from 'react';
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
  Search,
  Plus,
  Trash2,
  FolderPlus,
  Scissors,
  Check,
} from 'lucide-react';
import { getLayerDisplayName } from '../engine/layers';

export interface LayersPanelProps {
  elements: VectorElement[];
  selectedIds: string[];
  isOpen?: boolean;
  onClose?: () => void;
  onSelectLayer: (id: string, isShift: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRenameLayer: (id: string, newName: string) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;
  onNewLayer?: () => void;
  onCreateSublayer?: () => void;
  onMakeClippingMask?: () => void;
  onDeleteLayer?: (id?: string) => void;
}

const LAYER_ACCENT_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  selectedIds,
  isOpen = true,
  onClose,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onRenameLayer,
  onReorderLayers,
  onGroupSelected,
  onUngroupSelected,
  onNewLayer,
  onCreateSublayer,
  onMakeClippingMask,
  onDeleteLayer,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(true);
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

  const getElementThumbnail = (el: VectorElement) => {
    const fill = el.fill === 'none' ? 'transparent' : el.fill;
    const stroke = el.stroke === 'none' ? 'transparent' : el.stroke;

    switch (el.type) {
      case 'rectangle':
        return (
          <div
            className="w-4 h-3.5 rounded-[2px] border border-white/20 shrink-0 shadow-inner flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: fill, borderColor: stroke !== 'transparent' ? stroke : undefined }}
          />
        );
      case 'ellipse':
        return (
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-inner overflow-hidden"
            style={{ backgroundColor: fill, borderColor: stroke !== 'transparent' ? stroke : undefined }}
          />
        );
      case 'path':
        return (
          <div className="w-4 h-3.5 rounded-[2px] bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
            <PenTool className="w-2.5 h-2.5 text-emerald-400" />
          </div>
        );
      case 'text':
        return (
          <div className="w-4 h-3.5 rounded-[2px] bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-purple-400">T</span>
          </div>
        );
      case 'image':
        return (
          <div className="w-4 h-3.5 rounded-[2px] bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
            <ImageIcon className="w-2.5 h-2.5 text-pink-400" />
          </div>
        );
      case 'group':
        return (
          <div className="w-4 h-3.5 rounded-[2px] bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
            <Folder className="w-2.5 h-2.5 text-amber-400" />
          </div>
        );
      default:
        return <div className="w-3.5 h-3.5 rounded bg-zinc-700 shrink-0" />;
    }
  };

  // Layers in reverse scene order (top layer at top of tree)
  const reversedElements = useMemo(() => {
    return [...elements]
      .map((el, originalIdx) => ({ el, originalIdx }))
      .reverse();
  }, [elements]);

  // Filtered layers based on search query
  const filteredElements = useMemo(() => {
    if (!searchQuery.trim()) return reversedElements;
    const q = searchQuery.toLowerCase();
    return reversedElements.filter(({ el }) => {
      const name = (el.name || getLayerDisplayName(el)).toLowerCase();
      const type = el.type.toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [reversedElements, searchQuery]);

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
    <div className="flex flex-col h-full bg-[#161619] select-none text-xs">
      {/* 1. TOP SEARCH BAR ("Search All") */}
      {showSearch && (
        <div className="px-2.5 py-2 border-b border-white/[0.06] bg-[#121214]/60">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-white/10 text-zinc-300">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Search All Layers…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. LAYER TREE LIST */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
        {filteredElements.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center p-4 text-center text-zinc-500 text-xs gap-1.5">
            <Layers className="w-7 h-7 stroke-1 text-zinc-600" />
            <p>{searchQuery ? 'No matching layers' : 'No layers on canvas'}</p>
            <span className="text-[10px] text-zinc-600">
              {searchQuery ? 'Try another keyword' : 'Create shapes with Pen, Rectangle, or Type'}
            </span>
          </div>
        ) : (
          filteredElements.map(({ el, originalIdx }, displayIdx) => {
            const isSelected = selectedIds.includes(el.id);
            const isVisible = el.visible !== false;
            const isLocked = el.locked === true;
            const isGroup = el.type === 'group';
            const isExpanded = isGroup && expandedGroupIds.has(el.id);
            const isDragOver = dragOverIndex === originalIdx;
            const accentColor = LAYER_ACCENT_COLORS[originalIdx % LAYER_ACCENT_COLORS.length];

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
                  className={`group flex items-center justify-between px-1.5 py-1 rounded-md text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-500/20 text-white border border-sky-400/30'
                      : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white border border-transparent'
                  } ${!isVisible ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Layer color accent bar */}
                    <div
                      className="w-1 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: accentColor }}
                      title={`Layer Accent: ${accentColor}`}
                    />

                    {/* Eye Visibility slot */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(el.id);
                      }}
                      title={isVisible ? 'Hide Layer' : 'Show Layer'}
                      className={`p-0.5 rounded transition-colors ${
                        isVisible
                          ? 'text-zinc-400 hover:text-white'
                          : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      {isVisible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Lock slot */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(el.id);
                      }}
                      title={isLocked ? 'Unlock Layer' : 'Lock Layer'}
                      className={`p-0.5 rounded transition-colors ${
                        isLocked
                          ? 'text-amber-400'
                          : 'text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300'
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Expand/Collapse Chevron (for groups) */}
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
                      <div className="w-2" />
                    )}

                    {/* Thumbnail Preview */}
                    {getElementThumbnail(el)}

                    {/* Layer Name or Inline Rename */}
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
                        className="flex-1 bg-zinc-900 border border-sky-400 text-white rounded px-1.5 py-0.5 text-xs font-medium focus:outline-none"
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => handleStartRename(el.id, el.name || getLayerDisplayName(el), e)}
                        title="Double-click to rename"
                        className="truncate text-xs font-medium flex-1 text-left select-none ml-0.5"
                      >
                        {el.name || getLayerDisplayName(el)}
                      </span>
                    )}
                  </div>

                  {/* Target Selection Circle (Iconic Illustrator Target Button) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLayer(el.id, e.shiftKey);
                    }}
                    title={isSelected ? 'Targeted' : 'Click to Target'}
                    className="p-1 shrink-0 ml-1.5 flex items-center justify-center cursor-pointer"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-sky-400 bg-sky-950/40'
                          : 'border-zinc-600 group-hover:border-zinc-400'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      )}
                    </div>
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
                          {getElementThumbnail(child)}
                          <span className="truncate">{child.name || getLayerDisplayName(child)}</span>
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

      {/* 3. BOTTOM TOOLBAR FOOTER */}
      <div className="h-9 px-2.5 border-t border-white/[0.08] bg-[#121214] flex items-center justify-between text-zinc-400">
        {/* Layer count */}
        <span className="text-[11px] font-mono text-zinc-400">
          {elements.length} {elements.length === 1 ? 'Layer' : 'Layers'}
        </span>

        {/* Footer action icons */}
        <div className="flex items-center gap-0.5">
          {/* Toggle search */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Toggle Search (Search All)"
            className={`p-1 rounded hover:bg-zinc-800 transition-colors ${
              showSearch ? 'text-sky-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Make / Release Clipping Mask */}
          {onMakeClippingMask && (
            <button
              onClick={onMakeClippingMask}
              title="Make / Release Clipping Mask (Cmd+7)"
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Create Sublayer (+) */}
          {onCreateSublayer && (
            <button
              onClick={onCreateSublayer}
              title="Create Sublayer / Group"
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* New Layer (+) */}
          {onNewLayer && (
            <button
              onClick={onNewLayer}
              title="Create New Layer"
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete Layer (Trash) */}
          {onDeleteLayer && (
            <button
              onClick={() => onDeleteLayer()}
              title="Delete Selected Layer"
              className="p-1 rounded hover:bg-red-950 text-zinc-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayersPanel;
