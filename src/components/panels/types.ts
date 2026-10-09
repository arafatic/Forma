import React from 'react';
import {
  VectorElement,
  ToolType,
  ViewTransform,
  PathfinderOp,
  FillType,
  GradientFill,
  StrokeCap,
  StrokeJoin,
  Artboard,
  ExportMode,
  TextAlign,
  UnitType,
} from '../../types/vector';

export type PanelId =
  | 'properties'
  | 'layers'
  | 'libraries'
  | 'brushes'
  | 'color'
  | 'gradient'
  | 'history'
  | 'image_trace'
  | 'attributes';

export interface PanelMetadata {
  id: PanelId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey?: string;
  category: 'core' | 'design' | 'utility';
  description?: string;
}

export interface PanelProps {
  // Elements & Selection
  elements: VectorElement[];
  selectedElement: VectorElement | null;
  selectedIds: string[];
  selectedCount: number;

  // Active Tool
  currentTool?: ToolType;
  onSelectTool?: (tool: ToolType) => void;

  // Defaults
  defaultFill: string;
  defaultStroke: string;
  defaultStrokeWidth: number;
  defaultOpacity: number;

  // Property Change Handlers
  onChangeProperties: (props: {
    fill?: string;
    fillType?: FillType;
    gradient?: GradientFill;
    stroke?: string;
    strokeWidth?: number;
    strokeCap?: StrokeCap;
    strokeJoin?: StrokeJoin;
    strokeDashArray?: number[];
    opacity?: number;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number | string;
    fontStyle?: 'normal' | 'italic';
    textAlign?: TextAlign;
    letterSpacing?: number;
    lineHeight?: number;
    text?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    cornerRadius?: number;
    rx?: number;
    ry?: number;
    src?: string;
    name?: string;
  }) => void;
  onDeleteSelected: () => void;
  onClosePath?: () => void;
  onApplyPathfinder: (op: PathfinderOp) => void;

  // Transform Actions
  onTransformRotate?: (deg: number) => void;
  onTransformReflect?: (axis: 'horizontal' | 'vertical') => void;
  onAlign?: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onLockSelected?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onMakeClippingMask?: () => void;

  // Document & Artboard
  artboard?: Artboard | null;
  onUpdateArtboard?: (ab: Artboard) => void;
  onEditArtboard?: () => void;
  onNewArtboard?: () => void;
  onDeleteArtboard?: () => void;
  showRulers?: boolean;
  onToggleRulers?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  showTransparencyGrid?: boolean;
  onToggleTransparencyGrid?: () => void;
  transform?: ViewTransform;
  onResetZoom?: () => void;
  onExportSvg?: (mode?: ExportMode) => void;
  onExportPng?: (mode?: ExportMode) => void;
  onNewDocument?: () => void;
  onPreferences?: () => void;

  // Layers Integration
  onSelectElement?: (id: string, isShift?: boolean) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onRenameLayer?: (id: string, newName: string) => void;
  onReorderLayers?: (fromIndex: number, toIndex: number) => void;
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;
  onNewLayer?: () => void;
  onCreateSublayer?: () => void;

  // Libraries / Assets
  onPlaceAsset?: () => void;

  // History / Undo Stack
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  historyLength?: number;
  historyIndex?: number;

  // Panel Control
  onSwitchPanel?: (panelId: PanelId) => void;
}
