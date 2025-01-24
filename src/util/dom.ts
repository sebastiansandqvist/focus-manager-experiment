export function isTextEditable(el: Element): el is HTMLTextAreaElement | HTMLInputElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return ['text', 'password', 'email', 'number', 'search', 'tel', 'url'].includes(el.type);
}

const focusableElementsSelector = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function getActiveElement() {
  return document.activeElement === document.body ? null : document.activeElement;
}

// TODO:
// 1. this needs to ignore off-screen items and
// 2. have a max off-axis distance bound
//      - maybe the other item needs some overlap with the focus target?
export function findClosest(
  rect: DOMRect,
  elements: { el: Element; rect: DOMRect }[],
  direction: 'up' | 'down' | 'left' | 'right',
) {
  // TODO: we might want some heuristic to determine whether to use the left edge, right edge, or midpoint of the focus target
  const distanceCalculators = {
    up: (candidate: { rect: DOMRect }) => ({
      xDistance: Math.abs(rect.left - (candidate.rect.left + candidate.rect.width / 2)),
      yDistance: Math.abs(rect.top - candidate.rect.bottom),
    }),
    down: (candidate: { rect: DOMRect }) => ({
      xDistance: Math.abs(rect.left - (candidate.rect.left + candidate.rect.width / 2)),
      yDistance: Math.abs(rect.bottom - candidate.rect.top),
    }),
    left: (candidate: { rect: DOMRect }) => {
      const rectMidpointY = (rect.bottom + rect.top) / 2;
      const candidateMidpointY = (candidate.rect.bottom + candidate.rect.top) / 2;
      return {
        xDistance: Math.abs(rect.left - candidate.rect.right),
        yDistance: Math.abs(rectMidpointY - candidateMidpointY),
      };
    },
    right: (candidate: { rect: DOMRect }) => {
      const rectMidpointY = (rect.bottom + rect.top) / 2;
      const candidateMidpointY = (candidate.rect.bottom + candidate.rect.top) / 2;
      return {
        xDistance: Math.abs(rect.right - candidate.rect.left),
        yDistance: Math.abs(rectMidpointY - candidateMidpointY),
      };
    },
  };

  const calculateDistance = distanceCalculators[direction];

  return elements
    .filter((input): input is { el: HTMLElement; rect: DOMRect } => {
      return input.el instanceof HTMLElement;
    })
    .map((candidate) => ({
      ...calculateDistance(candidate),
      el: candidate.el,
    }))
    .sort((a, b) => {
      const yDiff = a.yDistance - b.yDistance;
      return yDiff === 0 ? a.xDistance - b.xDistance : yDiff;
    })[0]?.el;
}

export function isChildOfFocusable(root: Element, element: Element) {
  let parent = element.parentElement;
  while (parent && parent !== root) {
    if (parent.matches(focusableElementsSelector)) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

export function queryFocusableChildren(root: Element | null) {
  if (!root) return [];
  const allFocusableElements = root.querySelectorAll(focusableElementsSelector);
  return Array.from(allFocusableElements).filter((element) => !isChildOfFocusable(root, element));
}

export function nearestFocusableAncestor(el: Element | null) {
  if (!el) return document.body;
  let parent = el.parentElement;
  while (parent) {
    if (parent.matches(focusableElementsSelector)) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.body;
}
