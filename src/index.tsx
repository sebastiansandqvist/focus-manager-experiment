/* @refresh reload */
import { render } from 'solid-js/web';
import { createEffect, createSignal, For, type Component } from 'solid-js';
import { autofocus } from '@solid-primitives/autofocus';
import { FocusManager, useFocus } from './focus';
import './main.css';

const Carousel: Component = () => {
  const { focusedElement, enableFocusChaser } = useFocus();
  const [container, setContainer] = createSignal<HTMLElement>();
  const [offset, setOffset] = createSignal(0);
  const carouselItems = [
    { id: 1, color: 'bg-red-400', ref: createSignal<HTMLElement>() },
    { id: 2, color: 'bg-blue-400', ref: createSignal<HTMLElement>() },
    { id: 3, color: 'bg-green-400', ref: createSignal<HTMLElement>() },
    { id: 4, color: 'bg-yellow-400', ref: createSignal<HTMLElement>() },
    { id: 5, color: 'bg-purple-400', ref: createSignal<HTMLElement>() },
    { id: 6, color: 'bg-pink-400', ref: createSignal<HTMLElement>() },
    { id: 7, color: 'bg-teal-400', ref: createSignal<HTMLElement>() },
  ];
  const [activeItem, setActiveItem] = createSignal<(typeof carouselItems)[number] | null>(null);

  createEffect(() => {
    const parent = container();
    const focus = focusedElement();
    for (const item of carouselItems) {
      const [el] = item.ref;
      if (el() === focus && parent) {
        setActiveItem(item);
        const element = el();
        if (element) {
          const elementRect = element.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          const offsetX = elementRect.left - parentRect.left + elementRect.width / 2 - parentRect.width / 2;
          parent.scrollBy({ left: offsetX, behavior: 'smooth' });
        }
        return;
      }
    }
    setActiveItem(null);
  });

  createEffect(() => {
    enableFocusChaser(!activeItem());
  });

  return (
    <div class="grid gap-2 bg-red-500/20">
      <h2 class="text-xl">recently played</h2>
      <div ref={setContainer} class="scroll-snap-x flex gap-4 overflow-x-auto">
        <For each={carouselItems}>
          {(item) => (
            <a
              ref={(el) => item.ref[1](el)}
              class="flex aspect-video h-32 shrink-0 items-center justify-center text-white transition-all"
              classList={{
                [item.color]: true,
              }}
              href="#"
              style={{
                'scroll-snap-align': 'center',
                'transform': `scale(${
                  item === activeItem()
                    ? 1
                    : Math.max(
                        0.75,
                        1 - Math.abs(carouselItems.indexOf(item) - carouselItems.indexOf(activeItem()!)) * 0.1,
                      )
                })`,
              }}
            >
              {item.id}
            </a>
          )}
        </For>
      </div>
    </div>
  );
};

const App: Component = () => {
  return (
    <FocusManager>
      <div class="flex flex-col gap-8 p-8">
        <Carousel />
        <Carousel />
        <div class="grid gap-8">
          <div class="grid grid-cols-4 gap-4">
            <button ref={autofocus} autofocus>
              1
            </button>
            <button>2</button>
            <button>3</button>
            <button>4</button>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <button>1</button>
            <button>2</button>
            <button>3</button>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <input type="text" />
            <input type="text" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <section tabIndex={0} class="border p-4">
              <h2>a focusable section</h2>
              <button>1</button>
              <button>2</button>
              <p>hi</p>
              <input type="text" />
            </section>
            <section tabIndex={0} class="border p-4">
              <h2>a focusable section</h2>
              <button>1</button>
              <button>2</button>
              <p>hi</p>
              <input type="text" />
              <section tabIndex={0} class="border p-4">
                <h2>a focusable section</h2>
                <button>1</button>
                <button>2</button>
                <p>hi</p>
                <input type="text" />
              </section>
            </section>
          </div>
          <section tabIndex={0} class="border p-4">
            <h2>a focusable section</h2>
            <button>1</button>
            <button>2</button>
            <p>hi</p>
            <input type="text" />
          </section>
          <div>
            <button>1</button>
          </div>
        </div>
      </div>
    </FocusManager>
  );
};

render(() => <App />, document.getElementById('app')!);
