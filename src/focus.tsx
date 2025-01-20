import {
  createContext,
  createSignal,
  onCleanup,
  createEffect,
  useContext,
  type Accessor,
  type ParentComponent,
  Show,
} from 'solid-js';
import { focus, createActiveElement } from '@solid-primitives/active-element';
import { createElementBounds } from '@solid-primitives/bounds';
import { createScrollPosition } from '@solid-primitives/scroll';

// maybe instead of storing the whole tree, store just the:
// - focused element
// - its focusable children
// - its focusable parent

/*
type FocusTree =
  | {
      id: 'root';
      rect: {
        top: number;
        left: number;
        width: number;
        height: number;
      };
      parent?: undefined;
      children: FocusTree[];
      focus: () => void;
      element: HTMLElement;
    }
  | {
      id: string;
      rect: {
        top: number;
        left: number;
        width: number;
        height: number;
      };
      parent: FocusTree;
      children: FocusTree[];
      focus: () => void;
      element: HTMLElement;
    };

const FocusContext = createContext<{
  tree: FocusTree;
}>({
  tree: {
    id: 'root',
    rect: document.body.getBoundingClientRect(), // should probably be a signal
    children: [],
    focus: () => {},
    element: document.body,
  },
});

// intended to be used like `ref={focusable}`
function focusable(el: Element) {
  // register into tree

  onCleanup(() => {
    // remove from tree
  });
}

const [isFocused, setIsFocused] = createSignal(false)
<div use:focus={setIsFocused}></div>

*/

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

export const FocusManager: ParentComponent = (props) => {
  const [focusRing, setFocusRing] = createSignal<HTMLDivElement>();
  const focusedElement = createActiveElement();
  const focusableParent = () => nearestFocusableAncestor(focusedElement());
  const focusableSiblings = () => queryFocusableChildren(focusableParent());
  const focusableChildren = () => queryFocusableChildren(focusedElement());

  const focusedRect = createElementBounds(focusedElement);
  const scroll = createScrollPosition();

  createEffect(() => {
    if (!focusedRect) return;
    console.log({
      bottom: focusedRect.bottom,
      left: focusedRect.left,
      right: focusedRect.right,
      top: focusedRect.top,
      height: focusedRect.height,
      width: focusedRect.width,
    });
  });
  // const controller = new AbortController();
  // onCleanup(() => {
  //   controller.abort();
  // });

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
        {/* transition:
        border-radius 0.1s,
        opacity 0.3s,
        transform 0.1s,
        width 0.1s,
        height 0.1s;
      will-change: border-radius, opacity, transform, width, height; */}
        <Show when={focusedRect} keyed>
          {(rect) => (
            <div
              ref={setFocusRing}
              aria-hidden="true"
              role="presentation"
              class="top-0 left-0 pointer-events-none absolute z-10 border border-solid border-sky-400"
              classList={{
                'opacity-0': !focusedElement(),
              }}
              style={{
                height: `${rect.height ?? 0}px`,
                width: `${rect.width ?? 0}px`,
                transform: `translate(${(rect.left ?? 0) + scroll.x}px, ${(rect.top ?? 0) + scroll.y}px)`,
              }}
            />
          )}
        </Show>
      </div>
    </FocusContext.Provider>
  );
};
/*
  const appPadding = 20;
  const borderPx = 2;
  const rect = target.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  const translateX = rect.left + scrollX - appPadding - borderPx;
  const translateY = rect.top + scrollY - appPadding - borderPx;
  const computedStyle = window.getComputedStyle(target);
  const borderRadius = parseFloat(computedStyle.borderRadius) || 0;
  const adjustedRadius = borderRadius + borderPx; // increase radius to account for focus ring
  focusRing.style.width = `${rect.width}px`;
  focusRing.style.height = `${rect.height}px`;
  focusRing.style.transform = `translate(${translateX}px, ${translateY}px)`;
  focusRing.style.opacity = '1';
  focusRing.style.borderRadius = `${adjustedRadius}px`;
*/

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
