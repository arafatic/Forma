export interface Point {
  x: number;
  y: number;
}

export interface AnchorPoint {
  point: Point;
  handleIn: Point | null;
  handleOut: Point | null;
  // If true, handles are decoupled (not kept on a straight line)
  isCorner?: boolean;
}

export type ElementType = 'path' | 'rectangle' | 'ellipse' | 'group' | 'text' | 'image';

export type FillType = 'solid' | 'linear' | 'radial';

export interface ColorStop {
  id: string;
  offset: number; // 0 to 1
  color: string;
}

export interface GradientFill {
  type: 'linear' | 'radial';
  stops: ColorStop[];
  startX: number; // 0 to 1 relative to bounding box
  startY: number; // 0 to 1 relative to bounding box
  endX: number;   // 0 to 1 relative to bounding box
  endY: number;   // 0 to 1 relative to bounding box
}

export type StrokeCap = 'butt' | 'round' | 'square';
export type StrokeJoin = 'miter' | 'round' | 'bevel';
export type PathfinderOp = 'unite' | 'subtract' | 'intersect' | 'exclude';

export interface BaseVectorElement {
  id: string;
  name?: string;
  type: ElementType;
  fill: string;
  fillType?: FillType;
  gradient?: GradientFill;
  stroke: string;
  strokeWidth: number;
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  strokeDashArray?: number[];
  opacity: number;
  visible?: boolean;
  locked?: boolean;
  selected?: boolean;
}

export interface PathElement extends BaseVectorElement {
  type: 'path';
  points: AnchorPoint[];
  closed: boolean;
}

export interface RectElement extends BaseVectorElement {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseElement extends BaseVectorElement {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface GroupElement extends BaseVectorElement {
  type: 'group';
  children: VectorElement[];
  collapsed?: boolean;
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface TextElement extends BaseVectorElement {
  type: 'text';
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle?: 'normal' | 'italic';
  textAlign: TextAlign;
  letterSpacing?: number;
  lineHeight?: number;
}

export interface ImageElement extends BaseVectorElement {
  type: 'image';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

export type VectorElement =
  | PathElement
  | RectElement
  | EllipseElement
  | GroupElement
  | TextElement
  | ImageElement;

export type ToolType = 'select' | 'pen' | 'rectangle' | 'ellipse' | 'text';

export interface ViewTransform {
  pan: Point;
  zoom: number;
}

export interface DragHandleState {
  elementId: string;
  anchorIndex: number;
  handleType: 'anchor' | 'handleIn' | 'handleOut';
}

export type UnitType = 'px' | 'in' | 'mm' | 'pt';

export interface Artboard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string; // '#ffffff' | 'transparent' | '#18181b'
  unit?: UnitType;
}

export type ExportMode = 'artboard' | 'design';
