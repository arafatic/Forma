import React from 'react';
import {
  SlidersHorizontal,
  Layers,
  Library,
  Paintbrush,
  Palette,
  Sparkles,
  History,
  Wand2,
  Tag,
} from 'lucide-react';
import { PanelId, PanelMetadata, PanelProps } from './types';

// Core panels
import { PropertiesPanel } from '../PropertiesPanel';
import { LayersPanel } from '../LayersPanel';

// Modular panels
import { LibrariesPanel } from './LibrariesPanel';
import { BrushesPanel } from './BrushesPanel';
import { ColorPickerPanel } from './ColorPickerPanel';
import { GradientPanel } from './GradientPanel';
import { HistoryPanel } from './HistoryPanel';
import { ImageTracePanel } from './ImageTracePanel';
import { AttributesPanel } from './AttributesPanel';

// Wrap PropertiesPanel to ensure full signature compatibility with PanelProps
const WrappedPropertiesPanel: React.FC<PanelProps> = (props) => {
  return <PropertiesPanel hideTabBar {...props} />;
};

// Wrap LayersPanel to adapt its handler prop names
const WrappedLayersPanel: React.FC<PanelProps> = (props) => {
  return (
    <LayersPanel
      elements={props.elements}
      selectedIds={props.selectedIds}
      isOpen={true}
      onSelectLayer={(id, isShift) => props.onSelectElement?.(id, isShift)}
      onToggleVisibility={props.onToggleVisibility || (() => {})}
      onToggleLock={props.onToggleLock || (() => {})}
      onRenameLayer={props.onRenameLayer || (() => {})}
      onReorderLayers={props.onReorderLayers || (() => {})}
      onGroupSelected={props.onGroupSelected}
      onUngroupSelected={props.onUngroupSelected}
      onNewLayer={props.onNewLayer}
      onCreateSublayer={props.onCreateSublayer}
      onMakeClippingMask={props.onMakeClippingMask}
      onDeleteLayer={props.onDeleteSelected}
    />
  );
};

export const PANEL_REGISTRY: Record<PanelId, React.ComponentType<PanelProps>> = {
  properties: WrappedPropertiesPanel,
  layers: WrappedLayersPanel,
  libraries: LibrariesPanel,
  brushes: BrushesPanel,
  color: ColorPickerPanel,
  gradient: GradientPanel,
  history: HistoryPanel,
  image_trace: ImageTracePanel,
  attributes: AttributesPanel,
};

export const PANEL_METADATA: Record<PanelId, PanelMetadata> = {
  properties: {
    id: 'properties',
    name: 'Properties',
    icon: SlidersHorizontal,
    category: 'core',
    description: 'Transform, appearance, alignment, and contextual tool properties',
  },
  layers: {
    id: 'layers',
    name: 'Layers',
    icon: Layers,
    hotkey: 'F7',
    category: 'core',
    description: 'Layer tree, ordering, locking, visibility, and sublayers',
  },
  libraries: {
    id: 'libraries',
    name: 'Libraries',
    icon: Library,
    category: 'core',
    description: 'Color palettes, document swatches, and placed assets',
  },
  brushes: {
    id: 'brushes',
    name: 'Brushes',
    icon: Paintbrush,
    hotkey: 'F5',
    category: 'design',
    description: 'Calligraphic, art, scatter, and bristle brush presets',
  },
  color: {
    id: 'color',
    name: 'Color',
    icon: Palette,
    hotkey: 'F6',
    category: 'design',
    description: 'Hex & RGB color picker, fill & stroke targets, and swatch grid',
  },
  gradient: {
    id: 'gradient',
    name: 'Gradient',
    icon: Sparkles,
    hotkey: '⌘F9',
    category: 'design',
    description: 'Linear and radial gradient editor with color stops and angle',
  },
  history: {
    id: 'history',
    name: 'History',
    icon: History,
    category: 'utility',
    description: 'Undo/redo revision history and document metrics',
  },
  image_trace: {
    id: 'image_trace',
    name: 'Image Trace',
    icon: Wand2,
    category: 'design',
    description: 'Raster-to-vector tracing engine with threshold and path controls',
  },
  attributes: {
    id: 'attributes',
    name: 'Attributes',
    icon: Tag,
    category: 'utility',
    description: 'SVG DOM IDs, classes, hyperlinks, and overprint output options',
  },
};

export function getPanelComponent(panelId: PanelId): React.ComponentType<PanelProps> {
  return PANEL_REGISTRY[panelId] || PANEL_REGISTRY.properties;
}

export function getPanelMetadata(panelId: PanelId): PanelMetadata {
  return PANEL_METADATA[panelId] || PANEL_METADATA.properties;
}
