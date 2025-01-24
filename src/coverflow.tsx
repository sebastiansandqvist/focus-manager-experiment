import { createSignal, type Component, For } from 'solid-js';
import { Motion } from 'solid-motionone';

export const Coverflow: Component = () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
  const [activeIndex, setActiveIndex] = createSignal(5); // Start in the middle for demo

  const cardWidth = 200;
  const cardHeight = 280;

  // Tweak to taste
  const anglePerStep = 10;
  const maxRotation = 70;
  const scaleStep = 0.07;
  const spacing = 180;

  function transformFor(i: number) {
    const offset = i - activeIndex();
    const absOffset = Math.abs(offset);

    // Invert rotation so left side angles toward center
    let rotateY = -offset * anglePerStep;
    if (rotateY > maxRotation) rotateY = maxRotation;
    if (rotateY < -maxRotation) rotateY = -maxRotation;

    // Scale
    let scale = 1 - absOffset * scaleStep;
    if (scale < 0.4) scale = 0.4;

    // X offset: factor scale if desired
    const rotateYRad = (rotateY * Math.PI) / 180;
    const x = offset * spacing * scale * Math.cos(rotateYRad);

    // Align bottoms, center item on screen
    const y = (1 - scale) * cardHeight;
    const zIndex = 1000 - absOffset;

    return {
      x,
      y: -y, // shift upward for stable baseline
      rotateY,
      scale,
      zIndex,
    };
  }

  return (
    <div class="relative h-screen w-full overflow-hidden bg-black" style={{ perspective: '1200px' }}>
      <Motion.div
        class="absolute"
        style={{
          'top': '50%',
          'left': '50%',
          'transform-style': 'preserve-3d',
        }}
        animate={{ x: '-50%', y: '-50%' }}
      >
        <For each={items}>
          {(item, i) => (
            <Motion.button
              class="absolute rounded-xl bg-gray-700 text-white shadow-lg"
              style={{
                'width': `${cardWidth}px`,
                'height': `${cardHeight}px`,
                'transform-origin': 'center bottom',
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
