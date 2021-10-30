/**
 * @ets_macro guard
 */
export function guard<T>(_?: "ignore_custom"): Guard<T> {
  throw new Error("you can't call a macro")
}

export interface Guard<T> {
  (u: unknown): u is T
}
