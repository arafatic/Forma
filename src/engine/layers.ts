import { VectorElement, GroupElement, ElementType } from '../types/vector';

/**
 * Generates an automatic friendly name for a layer if not explicitly named
 */
export function getLayerDisplayName(el: VectorElement, index?: number): string {
  if (el.name && el.name.trim()) return el.name;
  switch (el.type) {
    case 'rectangle':
      return 'Rectangle';
    case 'ellipse':
      return 'Ellipse';
    case 'path':
      return 'Vector Path';
    case 'group':
      return 'Group';
    case 'text':
      return el.text ? `Text "${el.text.slice(0, 16)}${el.text.length > 16 ? '…' : ''}"` : 'Text';
    case 'image':
      return 'Image';
  }
}

/**
 * Groups multiple elements specified by targetIds into a single GroupElement
 */
export function groupElements(
  elements: VectorElement[],
  targetIds: string[]
): { newElements: VectorElement[]; newGroupId: string | null } {
  if (targetIds.length < 1) return { newElements: elements, newGroupId: null };

  const idSet = new Set(targetIds);
  const itemsToGroup: VectorElement[] = [];
  let firstIndex = -1;

  elements.forEach((el, idx) => {
    if (idSet.has(el.id)) {
      itemsToGroup.push(el);
      if (firstIndex === -1) firstIndex = idx;
    }
  });

  if (itemsToGroup.length === 0) return { newElements: elements, newGroupId: null };

  const newGroupId = `group_${Date.now()}`;
  const newGroup: GroupElement = {
    id: newGroupId,
    name: `Group (${itemsToGroup.length})`,
    type: 'group',
    fill: 'none',
    stroke: 'none',
    strokeWidth: 0,
    opacity: 1,
    visible: true,
    locked: false,
    children: itemsToGroup,
    collapsed: false,
  };

  const remaining = elements.filter((el) => !idSet.has(el.id));
  const newElements = [...remaining];
  const insertAt = Math.min(Math.max(0, firstIndex), newElements.length);
  newElements.splice(insertAt, 0, newGroup);

  return { newElements, newGroupId };
}

/**
 * Dissolves a group back into its individual child elements
 */
export function ungroupElement(
  elements: VectorElement[],
  groupId: string
): { newElements: VectorElement[]; ungroundIds: string[] } {
  const groupIdx = elements.findIndex((el) => el.id === groupId);
  if (groupIdx === -1) return { newElements: elements, ungroundIds: [] };

  const target = elements[groupIdx];
  if (target.type !== 'group') return { newElements: elements, ungroundIds: [] };

  const ungroundIds = target.children.map((c) => c.id);
  const next = [...elements];
  next.splice(groupIdx, 1, ...target.children);

  return { newElements: next, ungroundIds };
}

/**
 * Moves an element 1 step higher in the Z-index stack
 */
export function bringForward(elements: VectorElement[], id: string): VectorElement[] {
  const idx = elements.findIndex((el) => el.id === id);
  if (idx === -1 || idx >= elements.length - 1) return elements;

  const next = [...elements];
  const item = next[idx];
  next[idx] = next[idx + 1];
  next[idx + 1] = item;
  return next;
}

/**
 * Moves an element to the very top of the Z-index stack
 */
export function bringToFront(elements: VectorElement[], id: string): VectorElement[] {
  const idx = elements.findIndex((el) => el.id === id);
  if (idx === -1 || idx === elements.length - 1) return elements;

  const next = [...elements];
  const [item] = next.splice(idx, 1);
  next.push(item);
  return next;
}

/**
 * Moves an element 1 step lower in the Z-index stack
 */
export function sendBackward(elements: VectorElement[], id: string): VectorElement[] {
  const idx = elements.findIndex((el) => el.id === id);
  if (idx <= 0) return elements;

  const next = [...elements];
  const item = next[idx];
  next[idx] = next[idx - 1];
  next[idx - 1] = item;
  return next;
}

/**
 * Moves an element to the very bottom of the Z-index stack
 */
export function sendToBack(elements: VectorElement[], id: string): VectorElement[] {
  const idx = elements.findIndex((el) => el.id === id);
  if (idx <= 0) return elements;

  const next = [...elements];
  const [item] = next.splice(idx, 1);
  next.unshift(item);
  return next;
}

/**
 * Reorders elements by moving an element from sourceIndex to targetIndex in the layer tree
 * In the tree, top item = index (elements.length - 1), bottom item = index 0.
 */
export function reorderLayers(
  elements: VectorElement[],
  fromIndex: number,
  toIndex: number
): VectorElement[] {
  if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= elements.length || toIndex < 0 || toIndex >= elements.length) {
    return elements;
  }

  const next = [...elements];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Recursively toggles visibility on an element or child
 */
export function toggleLayerVisibility(elements: VectorElement[], id: string): VectorElement[] {
  return elements.map((el) => {
    if (el.id === id) {
      return { ...el, visible: el.visible !== false ? false : true };
    }
    if (el.type === 'group') {
      return { ...el, children: toggleLayerVisibility(el.children, id) };
    }
    return el;
  });
}

/**
 * Recursively toggles locked state on an element or child
 */
export function toggleLayerLock(elements: VectorElement[], id: string): VectorElement[] {
  return elements.map((el) => {
    if (el.id === id) {
      return { ...el, locked: !el.locked };
    }
    if (el.type === 'group') {
      return { ...el, children: toggleLayerLock(el.children, id) };
    }
    return el;
  });
}

/**
 * Renames an element by ID
 */
export function renameLayer(elements: VectorElement[], id: string, newName: string): VectorElement[] {
  return elements.map((el) => {
    if (el.id === id) {
      return { ...el, name: newName };
    }
    if (el.type === 'group') {
      return { ...el, children: renameLayer(el.children, id, newName) };
    }
    return el;
  });
}
