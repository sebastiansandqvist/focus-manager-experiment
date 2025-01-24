import { createSignal, type Component, For } from 'solid-js';
import { Motion } from 'solid-motionone';

export const Coverflow: Component = () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
  const [activeIndex, setActiveIndex] = createSignal(0);

  const cardWidth = 300;
  const cardHeight = 280;

  const spacing = 280;
  const anglePerStep = 10;
  const maxRotation = 60;
  const scaleStep = 0.07;
  const minScale = 0.4;

  function transformFor(index: number) {
    const offset = index - activeIndex();
    const absOffset = Math.abs(offset);

    let rotateY = -offset * anglePerStep;
    if (rotateY > maxRotation) rotateY = maxRotation;
    if (rotateY < -maxRotation) rotateY = -maxRotation;

    let scale = 1 - absOffset * scaleStep;
    if (scale < minScale) scale = minScale;

    const x = offset * spacing;
    const zIndex = 1000 - absOffset;

    return { x, rotateY, scale, zIndex };
  }

  return (
    <div class="relative h-screen w-screen overflow-hidden bg-black" style={{ perspective: '1200px' }}>
      {/* This “track” is absolutely positioned at the center of the screen */}
      <Motion.div
        class="absolute"
        style={{
          'top': '50%',
          'left': '50%',
          'transform-style': 'preserve-3d',
        }}
        // Move this div so offset=0 is exactly at screen center
        animate={{
          x: '-50%',
          y: '-50%',
        }}
      >
        <For each={items}>
          {(item, i) => (
            <Motion.button
              class="absolute rounded-lg bg-gray-700 text-white shadow-xl"
              style={{
                'width': `${cardWidth}px`,
                'height': `${cardHeight}px`,
                'transform-origin': 'center center',
                'backface-visibility': 'hidden',
              }}
              animate={transformFor(i())}
              transition={{ duration: 0.3, easing: 'ease-in-out' }}
              onClick={() => setActiveIndex(i())}
            >
              {item}
            </Motion.button>
          )}
        </For>
      </Motion.div>
    </div>
  );
};
