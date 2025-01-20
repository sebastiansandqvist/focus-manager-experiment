import { createEffect, createSignal, type Accessor } from 'solid-js';

export function createPreviousMemo<T>(get: Accessor<T>) {
  let currValue: T | undefined = undefined;
  const [prev, setPrev] = createSignal<T | undefined>();
  createEffect(() => {
    const nextValue = currValue;
    setPrev(() => nextValue);
    currValue = get();
  });
  return [prev, setPrev] as const;
}
