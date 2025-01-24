import { createSignal, type Component, For } from 'solid-js';
import { Motion } from 'solid-motionone';

export const Carousel: Component = () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
  const [activeIndex, setActiveIndex] = createSignal(0);
  const itemWidth = 200;

  function transformFor(index: number) {
    const offset = index - activeIndex();
    const absOffset = Math.abs(offset);
    const baseAngle = 50; // Adjust for more or less tilt
    const baseScale = 1 - absOffset * 0.1;
    return {
      x: offset * itemWidth * 1.2,
      rotateY: offset * -baseAngle,
      scale: baseScale > 0 ? baseScale : 0.1,
      zIndex: 10 - absOffset,
    };
  }

  return (
    <div
      class="relative flex h-96 w-screen items-center justify-center overflow-hidden bg-gray-100"
      style={{ perspective: '1000px' }}
    >
      <For each={items}>
        {(item, i) => (
          <Motion.button
            class="absolute h-40 w-[200px] rounded-lg bg-white text-black shadow-lg hover:shadow-2xl"
            animate={transformFor(i())}
            transition={{ duration: 0.4 }}
            onClick={() => setActiveIndex(i())}
          >
            {item}
          </Motion.button>
        )}
      </For>
    </div>
  );
};
