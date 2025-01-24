import { createSignal, type Component, For } from 'solid-js';
import { Motion } from 'solid-motionone';

function colorForIndex(i: number) {
  const hue = (i * 35) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export const Coverflow: Component = () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
  const [activeIndex, setActiveIndex] = createSignal(4);
  const [hoverIndex, setHoverIndex] = createSignal<number | null>(null);

  // Card sizing
  const cardWidth = 200;
  const cardHeight = 280;

  // Tweak these to taste
  const spacing = 220;
  const anglePerStep = 5;
  const maxRotation = 30;
  const scaleStep = 0.07;
  const minScale = 0.4;

  function transformFor(i: number) {
    const offset = i - activeIndex();
    const absOffset = Math.abs(offset);

    // Base rotation
    let rotateY = -offset * anglePerStep;
    if (rotateY > maxRotation) rotateY = maxRotation;
    if (rotateY < -maxRotation) rotateY = -maxRotation;

    // Base scale
    let scale = 1 - absOffset * scaleStep;
    if (scale < minScale) scale = minScale;

    // Base x shift
    const x = offset * spacing;

    // Distance-based opacity
    let opacity = 1 - absOffset * 0.15;
    if (opacity < 0.2) opacity = 0.2;

    // zIndex so the center item is on top by default
    let zIndex = 1000 - absOffset;

    // If hovered, override some transforms:
    if (hoverIndex() === i) {
      scale *= 1.15; // small pop
      opacity = 1; // fully opaque
      zIndex = 2000; // ensure hovered item is on top
      return { x, y: -20, rotateY, scale, opacity, zIndex };
    }

    // Otherwise, default transform
    return { x, rotateY, scale, opacity, zIndex };
  }

  return (
    <div
      class="relative h-screen w-screen overflow-hidden bg-black"
      style={{
        'perspective': '1200px',
        'perspective-origin': '50% 50%',
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
            const bg = colorForIndex(i());
            return (
              <Motion.button
                class="absolute rounded-xl text-white shadow-xl"
                style={{
                  'width': `${cardWidth}px`,
                  'height': `${cardHeight}px`,
                  'transform-origin': 'center center',
                  'backface-visibility': 'hidden',
                  'background-color': bg,
                  '-webkit-box-reflect': 'below 0 linear-gradient(transparent, rgba(0,0,0,0.2))',
                }}
                // Track hover enter/leave
                onPointerEnter={() => setHoverIndex(i())}
                onPointerLeave={() => setHoverIndex(null)}
                // Animate transforms
                animate={transformFor(i())}
                // Snappy transitions
                transition={{ duration: 0.2, easing: 'ease-in-out' }}
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
