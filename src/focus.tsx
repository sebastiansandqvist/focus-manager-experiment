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
} from 'solid-js';
import { focus, createActiveElement, makeActiveElementListener } from '@solid-primitives/active-element';
import { createElementBounds } from '@solid-primitives/bounds';
import { createScrollPosition } from '@solid-primitives/scroll';
import { DocumentEventListener, makeEventListener, WindowEventListener } from '@solid-primitives/event-listener';
import { createTimer } from '@solid-primitives/timer';

function createPreviousMemo<T>(get: Accessor<T>): Accessor<T | undefined> {
  let currValue: T | undefined = undefined;
  const [prev, setPrev] = createSignal<T | undefined>();
  createEffect(() => {
    const nextValue = currValue;
    setPrev(() => nextValue);
    currValue = get();
  });
  return prev;
}

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

export const FocusManager: ParentComponent = (props) => {
  const [focusRing, setFocusRing] = createSignal<HTMLDivElement>();
  // const focusedElement = createActiveElement();
  const [focusedElement, setFocusedElement] = createSignal<Element | null>(getActiveElement());
  const focusableParent = () => nearestFocusableAncestor(focusedElement());
  const focusableSiblings = () => queryFocusableChildren(focusableParent());
  const focusableChildren = () => queryFocusableChildren(focusedElement());

  const focusedRect = createElementBounds(focusedElement);
  const scroll = createScrollPosition();
  const focusedElementStyle = () => {
    const el = focusedElement();
    if (el) return getComputedStyle(el);
  };

  const previousFocusedElement = createPreviousMemo(focusedElement);

  createEffect(() => {
    console.log('focused', focusedElement());
  });
  createEffect(() => {
    console.log('prev', previousFocusedElement());
  });

  const [timerPaused, setTimerPaused] = createSignal(true);
  createEffect(() => {
    timerPaused();
    createTimer(
      () => {
        console.log('setting null');
        setFocusedElement(null);
      },
      () => !timerPaused() && 0,
      setTimeout,
    );
  });

  // TODO: only fade in when there was no previously focused element
  makeEventListener(document, 'focusin', (e) => {
    setTimerPaused(true);
    setFocusedElement(getActiveElement());
  });

  makeEventListener(document, 'focusout', (e) => {
    setTimerPaused(false);
    console.log('focusout');
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
          class="top-0 left-0 pointer-events-none absolute z-10 border border-solid border-sky-400"
          classList={{
            'opacity-0': !focusedElement(),
          }}
          style={{
            'border-radius': focusedElementStyle()?.borderRadius,
            'height': `${focusedRect.height ?? 0}px`,
            'width': `${focusedRect.width ?? 0}px`,
            'transform': `translate(${(focusedRect.left ?? 0) + scroll.x}px, ${(focusedRect.top ?? 0) + scroll.y}px)`,
            'transition':
              previousFocusedElement() && focusedElement()
                ? `border-radius 0.1s, opacity 0.3s, transform 1s, width 0.1s, height 0.1s`
                : `opacity 0.3s`,
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
