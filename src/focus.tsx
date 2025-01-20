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
import { DocumentEventListener, makeEventListener, WindowEventListener } from '@solid-primitives/event-listener';

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
    console.log('prev', previousFocusedElement());
  });

  const transitionDuration = 300;

  createEffect(() => {
    const el = focusedElement(); // run this effect when focusedElement changes
    makeTimer(
      () => {
        console.log('timer', el);
        overrideSetPreviousFocusedElement(el);
      },
      transitionDuration,
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
      ? `border-radius 150ms, opacity ${transitionDuration}ms, transform 150ms, height 150ms, width 150ms`
      : `opacity ${transitionDuration}ms`;
  });

  return setFocusRing;
}

export const FocusManager: ParentComponent = (props) => {
  const focusedElement = createFocusedElement();
  const focusableParent = () => nearestFocusableAncestor(focusedElement());
  const focusableSiblings = () => queryFocusableChildren(focusableParent());
  const focusableChildren = () => queryFocusableChildren(focusedElement());
  const setFocusRing = createFocusRingManager(focusedElement);

  createEffect(() => {
    console.log('focused', focusedElement());
  });

  makeEventListener(window, 'keydown', (e) => {
    if (e.key === 'Enter') {
      const child = focusableChildren()[0];
      if (child instanceof HTMLElement) {
        child.focus();
        e.preventDefault();
      }
    }

    if (e.key === 'Escape') {
      const parent = focusableParent();
      parent.focus();
      e.preventDefault();
    }

    // TODO: traversal stuff
    // if (e.key === 'Down') { }
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
            'will-change': 'border-radius, opacity, transform, width, height',
            'transition': 'opacity 300ms',
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
