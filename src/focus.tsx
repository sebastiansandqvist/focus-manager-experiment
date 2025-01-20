import {
  createContext,
  createSignal,
  onCleanup,
  createEffect,
  useContext,
  type Accessor,
  type ParentComponent,
  Show,
  untrack,
  on,
  batch,
  createMemo,
  type Setter,
} from 'solid-js';
import { makeTimer, type TimeoutSource } from '@solid-primitives/timer';
import { createElementBounds, type NullableBounds } from '@solid-primitives/bounds';
import { createScrollPosition, type Position } from '@solid-primitives/scroll';
import {
  DocumentEventListener,
  makeEventListener,
  WindowEventListener,
  type E,
} from '@solid-primitives/event-listener';

function isTextEditable(el: Element): el is HTMLTextAreaElement | HTMLInputElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return ['text', 'password', 'email', 'number', 'search', 'tel', 'url'].includes(el.type);
}

function createPreviousMemo<T>(get: Accessor<T>) {
  let currValue: T | undefined = undefined;
  const [prev, setPrev] = createSignal<T | undefined>();
  createEffect(() => {
    const nextValue = currValue;
    setPrev(() => nextValue);
    currValue = get();
  });
  return [prev, setPrev] as const;
}

// TODO: probably remove context and just use a component.
const FocusContext = createContext<{
  focusedElement: Accessor<Element | null>;
  focusableParent: Accessor<Element | null>;
  focusableSiblings: Accessor<Element[]>;
  focusableChildren: Accessor<Element[]>;
}>({
  focusedElement: createSignal(null)[0],
  focusableParent: createSignal(null)[0],
  focusableSiblings: createSignal([])[0],
  focusableChildren: createSignal([])[0],
});

const focusableElementsSelector = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getActiveElement() {
  return document.activeElement === document.body ? null : document.activeElement;
}

// if focusing from nothing:
// - set size/position immediately
// - transition opacity to 1
// - then set transition property to all

// if focusing from other focused element:
// - default behaviors

// if losing focus:
// - maintain prior size/position
// - transition opacity to 0
const opacityTransitionDuration = 300;

function createFocusedElement() {
  const [focusedElement, setFocusedElement] = createSignal(getActiveElement());

  let timeout: number | undefined = undefined;

  makeEventListener(document, 'focusin', () => {
    clearTimeout(timeout);
    setFocusedElement(getActiveElement());
  });

  makeEventListener(document, 'focusout', () => {
    timeout = setTimeout(() => {
      setFocusedElement(null);
    }, 0);
  });

  onCleanup(() => clearTimeout(timeout));

  return focusedElement;
}

function createFocusRingManager(focusedElement: Accessor<Element | null>) {
  const [focusRing, setFocusRing] = createSignal<HTMLDivElement>();
  const focusedRect = createElementBounds(focusedElement);
  const scroll = createScrollPosition();
  const focusedElementStyle = createMemo(() => {
    const el = focusedElement();
    if (el) return getComputedStyle(el);
  });

  const [previousFocusedElement, overrideSetPreviousFocusedElement] = createPreviousMemo(focusedElement);

  createEffect(() => {
    const el = focusedElement(); // run this effect when focusedElement changes
    makeTimer(
      () => {
        console.log('timer', el);
        overrideSetPreviousFocusedElement(el);
      },
      opacityTransitionDuration,
      setTimeout,
    );
  });

  createEffect(() => {
    const el = focusRing();
    if (!el) return;
    const current = focusedElement();

    if (!current) {
      el.style.opacity = '0';
      return;
    }

    el.style.opacity = '1';
    el.style.borderRadius = focusedElementStyle()?.borderRadius ?? '';
    el.style.transform = `translate(${(focusedRect.left ?? 0) + scroll.x}px, ${(focusedRect.top ?? 0) + scroll.y}px)`;
    el.style.height = `${focusedRect.height ?? 0}px`;
    el.style.width = `${focusedRect.width ?? 0}px`;

    const previous = previousFocusedElement();
    el.style.transition = previous
      ? `border-radius 150ms, opacity ${opacityTransitionDuration}ms, transform 150ms, height 150ms, width 150ms`
      : `opacity ${opacityTransitionDuration}ms`;
  });

  return setFocusRing;
}

function createKeyboardFocusHandler({
  focusedElement,
  focusableParent,
  focusableSiblings,
  focusableChildren,
}: {
  focusedElement: Accessor<Element | null>;
  focusableParent: Accessor<HTMLElement>;
  focusableSiblings: Accessor<Element[]>;
  focusableChildren: Accessor<Element[]>;
}) {
  makeEventListener(window, 'keydown', (e) => {
    const traverseIn = () => {
      const child = focusableChildren()[0];
      if (child instanceof HTMLElement) {
        child.focus();
        e.preventDefault();
      }
    };

    const traverseOut = () => {
      const parent = focusableParent();
      parent.focus();
      e.preventDefault();
    };

    if (e.key === 'Enter') return traverseIn();
    if (e.key === 'Escape') return traverseOut();

    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (!arrowKeys.includes(e.key)) return;

    const target = focusedElement();
    if (!target) return; // TODO: consider removing this condition

    const focusedRect = target.getBoundingClientRect();

    const candidates = focusableSiblings()
      .filter((candidate) => candidate !== target)
      .map((el) => ({
        el,
        rect: el.getBoundingClientRect(),
      }));

    if (e.key === 'ArrowUp') {
      const upCandidates = candidates.filter(({ rect }) => rect.bottom <= focusedRect.top);
      const closest = findClosest(focusedRect, upCandidates, 'up');
      if (closest) {
        closest.focus();
        e.preventDefault();
      } else {
        traverseOut();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      const downCandidates = candidates.filter(({ rect }) => rect.top >= focusedRect.bottom);
      const closest = findClosest(focusedRect, downCandidates, 'down');
      if (closest) {
        closest.focus();
        e.preventDefault();
      } else {
        traverseOut();
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      // don't override default input arrow key behavior unless the cursor is at the beginning
      if (isTextEditable(target)) {
        const cursorPosition = target.selectionStart;
        if (cursorPosition !== 0) return;
      }
      const leftCandidates = candidates.filter(({ rect }) => rect.right <= focusedRect.left);
      const closest = findClosest(focusedRect, leftCandidates, 'left');
      if (closest && 'focus' in closest) {
        closest.focus();
        e.preventDefault();
      } else {
        traverseOut();
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      // don't override default input arrow key behavior unless the cursor is at the end
      if (isTextEditable(target)) {
        const cursorPosition = target.selectionEnd;
        if (cursorPosition !== target.value.length) return;
      }
      const rightCandidates = candidates.filter(({ rect }) => rect.left >= focusedRect.right);
      const closest = findClosest(focusedRect, rightCandidates, 'right');
      if (closest && 'focus' in closest) {
        closest.focus();
        e.preventDefault();
      } else {
        traverseOut();
      }
      return;
    }
  });
}

export const FocusManager: ParentComponent = (props) => {
  const focusedElement = createFocusedElement();
  const focusableParent = () => nearestFocusableAncestor(focusedElement());
  const focusableSiblings = () => queryFocusableChildren(focusableParent());
  const focusableChildren = () => queryFocusableChildren(focusedElement());
  const setFocusRing = createFocusRingManager(focusedElement);

  createKeyboardFocusHandler({
    focusedElement,
    focusableParent,
    focusableSiblings,
    focusableChildren,
  });

  createEffect(() => {
    console.log('focused', focusedElement());
  });

  return (
    <FocusContext.Provider
      value={{
        focusedElement,
        focusableParent,
        focusableSiblings,
        focusableChildren,
      }}
    >
      <div class="relative">
        {props.children}
        <div
          ref={setFocusRing}
          aria-hidden="true"
          role="presentation"
          class="top-0 left-0 pointer-events-none absolute z-10 outline outline-2 outline-offset-2 outline-sky-400"
          style={{
            'transition': `opacity ${opacityTransitionDuration}ms`,
            'will-change': 'border-radius, opacity, transform, width, height',
          }}
        />
      </div>
    </FocusContext.Provider>
  );
};

export const useFocus = useContext(FocusContext);

function isChildOfFocusable(root: Element, element: Element) {
  let parent = element.parentElement;
  while (parent && parent !== root) {
    if (parent.matches(focusableElementsSelector)) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

function queryFocusableChildren(root: Element | null) {
  if (!root) return [];
  const allFocusableElements = root.querySelectorAll(focusableElementsSelector);
  return Array.from(allFocusableElements).filter((element) => !isChildOfFocusable(root, element));
}

function nearestFocusableAncestor(el: Element | null) {
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

function findClosest(
  rect: DOMRect,
  elements: { el: Element; rect: DOMRect }[],
  direction: 'up' | 'down' | 'left' | 'right',
) {
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
