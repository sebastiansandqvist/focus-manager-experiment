export function includes<T, A extends T>(array: ReadonlyArray<A>, item: T): item is A {
  return array.includes(item as A);
}
