import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
  type Accessor,
  type ParentComponent,
} from 'solid-js';
import { makeTimer } from '@solid-primitives/timer';
import { createElementBounds } from '@solid-primitives/bounds';
import { createScrollPosition } from '@solid-primitives/scroll';
import { makeEventListener } from '@solid-primitives/event-listener';
import {
  findClosest,
  getActiveElement,
  isTextEditable,
  nearestFocusableAncestor,
  queryFocusableChildren,
} from './util/dom';
import { createPreviousMemo } from './util/signals';

// TODO:
// maybe expose a way to steal focus on a stack and then release
// focus control by popping off the stack

// TODO: decide what would be useful to expose via context
const FocusContext = createContext<{}>({});

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

  // after the focus has settled, set `previousFocusedElement` to the current focused element
  createEffect(() => {
    const el = focusedElement(); // run this effect when focusedElement changes
    makeTimer(
      () => {
        overrideSetPreviousFocusedElement(el);
      },
      opacityTransitionDuration,
      setTimeout,
    );
  });

  createEffect(() => {
    const ring = focusRing();
    if (!ring) return;

    const focus = focusedElement();
    if (!focus) {
      ring.style.opacity = '0';
      return;
    }

    ring.style.opacity = '1';
    ring.style.borderRadius = focusedElementStyle()?.borderRadius ?? '';
    ring.style.transform = `translate(${(focusedRect.left ?? 0) + scroll.x}px, ${(focusedRect.top ?? 0) + scroll.y}px)`;
    ring.style.height = `${focusedRect.height ?? 0}px`;
    ring.style.width = `${focusedRect.width ?? 0}px`;

    const previous = previousFocusedElement();
    ring.style.transition = previous
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
    <FocusContext.Provider value={{}}>
      <div class="relative">
        {props.children}
        <div
          ref={setFocusRing}
          aria-hidden="true"
          role="presentation"
          class="pointer-events-none absolute top-0 left-0 z-10 outline-2 outline-offset-2 outline-sky-400"
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
