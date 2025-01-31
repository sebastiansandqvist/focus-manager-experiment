import { createSignal, type Component, For } from 'solid-js';
import { Motion } from 'solid-motionone';

function colorForIndex(i: number) {
  const hue = (i * 35) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

// new strategy instead of this:
// - use activeIndex() to set the x offset of the track, which is transitioned smoothly
// - use activeIndex() to set the rotation, opacity, and scale of each item.
// - individual items somehow also need an additional x offset to account for their scale and rotation

// additional considerations:
// - when rotating, avoid x axis stretch
// - avoid overlap if possible
// - make the active item considerably bigger so we can add metadata below it
// - if this is a list of recent games, having the oldest game visible to the left of the active item isn't ideal
// - hover should scale centered vertically and horizontally, and cast a growing shadow, and make the reflection farther away
// - either use some solid primitive for hover, or just use the motionone hover prop
//   - interesting: https://primitives.solidjs.community/package/mouse#createpositiontoelement
// - hover isn't super important since this is keyboard/gamepad driven. but nice to have.

export const Coverflow: Component = () => {
  const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [hoverIndex, setHoverIndex] = createSignal<number | null>(null);

  // Card sizing
  const cardWidth = 300;
  const cardHeight = 200;

  const hoverScaleFactor = 1.15;

  // Tweak these to taste
  const spacing = 320;
  const anglePerStep = 10;
  const maxRotation = 40;
  const scaleStep = 0.06;
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
      scale *= hoverScaleFactor; // small pop
      opacity = 1; // fully opaque
      zIndex = 2000; // ensure hovered item is on top
      return { x, y: 0, rotateY, scale, opacity, zIndex };
    }

    // Otherwise, default transform
    return { x, rotateY, scale, opacity, zIndex };
  }

  return (
    <div
      class="relative h-80 w-screen overflow-x-hidden"
      style={{
        'perspective': '1200px',
        'perspective-origin': '50% 50%',
      }}
    >
      <Motion.div
        class="transform-3d"
        style={{
          'padding-top': `${10 + cardHeight * hoverScaleFactor - cardHeight}px`,
          'padding-left': `${cardWidth * hoverScaleFactor - cardWidth}px`,
        }}
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
                  // instead of this, clone and mirror.
                  // that way the reflection can be offset on hover.
                  '-webkit-box-reflect': 'below 0 linear-gradient(transparent, transparent 50%, rgba(0,0,0,0.1) 100%)',
                }}
                hover={
                  {
                    // doesn't work with transition:
                    // '-webkit-box-reflect': 'below 10px linear-gradient(transparent, transparent 50%, rgba(0,0,0,0.1) 100%)',
                  }
                }
                // Track hover enter/leave
                onPointerEnter={() => setHoverIndex(i())}
                onPointerLeave={() => setHoverIndex(null)}
                // Animate transforms
                animate={transformFor(i())}
                // Snappy transitions
                transition={{
                  duration: 0.4,
                  // easing: [0.22, 1, 0.36, 1],
                  // pop:
                  easing: [0.34, 1.56, 0.64, 1], // cubic-bezier(0.34, 1.56, 0.64, 1)
                }}
                onFocus={() => setActiveIndex(i())}
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
