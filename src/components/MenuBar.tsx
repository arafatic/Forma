import React, { useState, useEffect, useRef } from 'react';
import {
  FilePlus,
  FolderOpen,
  Download,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  CheckSquare,
  Layers,
  Ungroup,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  Check,
} from 'lucide-react';

export interface MenuBarProps {
  onNew: () => void;
  onOpenSvg: () => void;
  onPlaceAsset?: () => void;
  onExportSvg: (mode?: 'artboard' | 'design') => void;
  onExportPng: (mode?: 'artboard' | 'design') => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  hasSelection: boolean;
  onSelectAll: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onBringForward: () => void;
  onBringToFront: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showLayers?: boolean;
  onToggleLayers?: () => void;
  canPathfinder?: boolean;
  onPathfinderUnion?: () => void;
  onPathfinderSubtract?: () => void;
  onPathfinderIntersect?: () => void;
  onPathfinderExclude?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
  checked?: boolean;
}

interface MenuCategory {
  id: string;
  label: string;
  items: MenuItem[];
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onNew,
  onOpenSvg,
  onPlaceAsset,
  onExportSvg,
  onExportPng,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onDuplicate,
  onDelete,
  hasSelection,
  onSelectAll,
  onGroup,
  onUngroup,
  onBringForward,
  onBringToFront,
  onSendBackward,
  onSendToBack,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  showGrid,
  onToggleGrid,
  showLayers,
  onToggleLayers,
  canPathfinder,
  onPathfinderUnion,
  onPathfinderSubtract,
  onPathfinderIntersect,
  onPathfinderExclude,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const menus: MenuCategory[] = [
    {
      id: 'file',
      label: 'File',
      items: [
        {
          id: 'new',
          label: 'New Canvas',
          shortcut: '⌘N',
          icon: FilePlus,
          action: onNew,
        },
        {
          id: 'open',
          label: 'Open SVG…',
          shortcut: '⌘O',
          icon: FolderOpen,
          action: onOpenSvg,
        },
        {
          id: 'place',
          label: 'Place Asset…',
          shortcut: '⇧⌘P',
          icon: FolderOpen,
          action: onPlaceAsset,
        },
        { id: 'div-file-1', label: '', divider: true },
        {
          id: 'export-svg',
          label: 'Export SVG (Artboard)',
          shortcut: '⌘S',
          icon: Download,
          action: () => onExportSvg('artboard'),
        },
        {
          id: 'export-svg-design',
          label: 'Export SVG (Design Bounds)',
          shortcut: '⌥⌘S',
          icon: Download,
          action: () => onExportSvg('design'),
        },
        {
          id: 'export-png',
          label: 'Export PNG (Artboard)…',
          shortcut: '⇧⌘S',
          icon: ImageIcon,
          action: () => onExportPng('artboard'),
        },
        {
          id: 'export-png-design',
          label: 'Export PNG (Design Bounds)…',
          shortcut: '⌥⇧⌘S',
          icon: ImageIcon,
          action: () => onExportPng('design'),
        },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        {
          id: 'undo',
          label: 'Undo',
          shortcut: '⌘Z',
          icon: Undo2,
          action: onUndo,
          disabled: !canUndo,
        },
        {
          id: 'redo',
          label: 'Redo',
          shortcut: '⇧⌘Z',
          icon: Redo2,
          action: onRedo,
          disabled: !canRedo,
        },
        { id: 'div-edit-1', label: '', divider: true },
        {
          id: 'duplicate',
          label: 'Duplicate',
          shortcut: '⌘D',
          icon: Copy,
          action: onDuplicate,
          disabled: !hasSelection,
        },
        {
          id: 'delete',
          label: 'Delete Selection',
          shortcut: '⌫',
          icon: Trash2,
          action: onDelete,
          disabled: !hasSelection,
        },
        {
          id: 'select-all',
          label: 'Select All',
          shortcut: '⌘A',
          icon: CheckSquare,
          action: onSelectAll,
        },
      ],
    },
    {
      id: 'object',
      label: 'Object',
      items: [
        {
          id: 'group',
          label: 'Group',
          shortcut: '⌘G',
          icon: Layers,
          action: onGroup,
          disabled: !hasSelection,
        },
        {
          id: 'ungroup',
          label: 'Ungroup',
          shortcut: '⇧⌘G',
          icon: Ungroup,
          action: onUngroup,
          disabled: !hasSelection,
        },
        { id: 'div-obj-1', label: '', divider: true },
        {
          id: 'bring-forward',
          label: 'Bring Forward',
          shortcut: '⌘]',
          icon: ArrowUp,
          action: onBringForward,
          disabled: !hasSelection,
        },
        {
          id: 'bring-to-front',
          label: 'Bring to Front',
          shortcut: '⇧⌘]',
          icon: ArrowUp,
          action: onBringToFront,
          disabled: !hasSelection,
        },
        {
          id: 'send-backward',
          label: 'Send Backward',
          shortcut: '⌘[',
          icon: ArrowDown,
          action: onSendBackward,
          disabled: !hasSelection,
        },
        {
          id: 'send-to-back',
          label: 'Send to Back',
          shortcut: '⇧⌘[',
          icon: ArrowDown,
          action: onSendToBack,
          disabled: !hasSelection,
        },
        { id: 'div-obj-pathfinder', label: '', divider: true },
        {
          id: 'pathfinder-unite',
          label: 'Pathfinder: Unite',
          shortcut: '⌥⌘U',
          action: onPathfinderUnion,
          disabled: !canPathfinder,
        },
        {
          id: 'pathfinder-subtract',
          label: 'Pathfinder: Minus Front',
          shortcut: '⌥⌘-',
          action: onPathfinderSubtract,
          disabled: !canPathfinder,
        },
        {
          id: 'pathfinder-intersect',
          label: 'Pathfinder: Intersect',
          shortcut: '⌥⌘I',
          action: onPathfinderIntersect,
          disabled: !canPathfinder,
        },
        {
          id: 'pathfinder-exclude',
          label: 'Pathfinder: Exclude',
          shortcut: '⌥⌘X',
          action: onPathfinderExclude,
          disabled: !canPathfinder,
        },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          id: 'zoom-in',
          label: 'Zoom In',
          shortcut: '⌘=',
          icon: ZoomIn,
          action: onZoomIn,
        },
        {
          id: 'zoom-out',
          label: 'Zoom Out',
          shortcut: '⌘-',
          icon: ZoomOut,
          action: onZoomOut,
        },
        {
          id: 'reset-zoom',
          label: 'Reset Zoom (100%)',
          shortcut: '⌘0',
          icon: RotateCcw,
          action: onResetZoom,
        },
        { id: 'div-view-1', label: '', divider: true },
        {
          id: 'toggle-grid',
          label: 'Grid Lines',
          icon: Grid,
          action: onToggleGrid,
          checked: showGrid,
        },
        {
          id: 'toggle-layers',
          label: 'Layers Panel',
          shortcut: '⌘L',
          icon: Layers,
          action: onToggleLayers,
          checked: showLayers,
        },
      ],
    },
  ];

  const handleMenuClick = (menuId: string) => {
    setActiveMenuId((prev) => (prev === menuId ? null : menuId));
  };

  const handleMenuMouseEnter = (menuId: string) => {
    // If any menu dropdown is already open, hover switches automatically
    if (activeMenuId !== null) {
      setActiveMenuId(menuId);
    }
  };

  const executeItemAction = (item: MenuItem) => {
    if (item.disabled || item.divider) return;
    setActiveMenuId(null);
    item.action?.();
  };

  return (
    <nav
      ref={containerRef}
      className="flex items-center gap-0.5 select-none"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {menus.map((menu) => {
        const isOpen = activeMenuId === menu.id;

        return (
          <div key={menu.id} className="relative">
            <button
              type="button"
              onClick={() => handleMenuClick(menu.id)}
              onMouseEnter={() => handleMenuMouseEnter(menu.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                isOpen
                  ? 'bg-zinc-700/80 text-white shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80 active:bg-zinc-700/60'
              }`}
            >
              {menu.label}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl bg-[#1c1c20] border border-white/10 shadow-2xl shadow-black/90 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-75">
                {menu.items.map((item, idx) => {
                  if (item.divider) {
                    return <div key={`div-${idx}`} className="h-px bg-white/[0.08] my-1" />;
                  }

                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => executeItemAction(item)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                        item.disabled
                          ? 'text-zinc-600 cursor-not-allowed opacity-60'
                          : 'text-zinc-200 hover:text-white hover:bg-sky-600/90 active:bg-sky-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {Icon ? (
                          <Icon className="w-3.5 h-3.5 opacity-80" />
                        ) : (
                          <div className="w-3.5 h-3.5" />
                        )}
                        <span>{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.checked !== undefined && (
                          <Check
                            className={`w-3.5 h-3.5 ${
                              item.checked ? 'text-sky-400' : 'opacity-0'
                            }`}
                          />
                        )}
                        {item.shortcut && (
                          <kbd className="text-[10px] font-mono tracking-wider opacity-60">
                            {item.shortcut}
                          </kbd>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};
