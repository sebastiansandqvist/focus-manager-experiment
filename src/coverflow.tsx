import { createSignal, type Component, For } from 'solid-js';
import { Motion } from 'solid-motionone';

// Simple helper to pick a stable "randomish" color for each item
function colorForIndex(i: number) {
  // e.g. offset the hue by i*35 for variety
  const hue = (i * 35) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export const Coverflow: Component = () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
  const [activeIndex, setActiveIndex] = createSignal(5);

  const cardWidth = 300;
  const cardHeight = 280;

  const spacing = 320;
  const anglePerStep = 40;
  const maxRotation = 60;
  const scaleStep = 0.07;
  const minScale = 0.4;

  function transformFor(index: number) {
    const offset = index - activeIndex();
    const absOffset = Math.abs(offset);

    // Inward rotation
    let rotateY = -offset * anglePerStep;
    if (rotateY > maxRotation) rotateY = maxRotation;
    if (rotateY < -maxRotation) rotateY = -maxRotation;

    // Shrink further from center
    let scale = 1 - absOffset * scaleStep;
    if (scale < minScale) scale = minScale;

    // Linear horizontal offset
    const x = offset * spacing;

    const zIndex = 1000 - absOffset;
    return { x, rotateY, scale, zIndex };
  }

  return (
    <div
      class="relative h-screen w-screen overflow-hidden bg-black"
      style={{
        'perspective': '1200px',
        'perspective-origin': '50% 60%', // can tweak to see if it looks more balanced
      }}
    >
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
          {(item, i) => {
            const color = colorForIndex(i());
            return (
              <Motion.button
                class="absolute rounded-lg text-white shadow-xl"
                style={{
                  'width': `${cardWidth}px`,
                  'height': `${cardHeight}px`,
                  'transform-origin': 'center center',
                  'backface-visibility': 'hidden',
                  // Use the color & reflection
                  'background-color': color,
                  '-webkit-box-reflect': 'below 0px linear-gradient(transparent, rgba(0,0,0,0.2))',
                }}
                animate={transformFor(i())}
                transition={{ duration: 0.3, easing: 'ease-in-out' }}
                onClick={() => setActiveIndex(i())}
              >
                {item}
              </Motion.button>
            );
          }}
        </For>
      </Motion.div>
    </div>
  );
};
