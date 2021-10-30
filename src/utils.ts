export function mapRecord<K extends string, A, B>(
  x: Record<K, A>,
  f: (a: A, k: K) => B
): Record<K, B> {
  const mapped = {} as Record<K, B>
  for (const k of Object.keys(x)) {
    mapped[k as K] = f(x[k as K], k as K)
  }
  return mapped
}

export * from "./utils/lazy.js"
