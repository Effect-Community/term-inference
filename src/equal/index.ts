import { interpreter } from "../register.js"

declare module "../register.js" {
  interface Register<A> {
    Equal: Equal<A>
  }
}

/**
 * @ets_typeclass
 */
export interface Equal<T> {
  (x: T, y: T): boolean
}

export const {
  /**
   * @ets_implicit
   */
  EqualNumber,
  /**
   * @ets_implicit
   */
  EqualRefined,
  /**
   * @ets_implicit
   */
  EqualString,
  /**
   * @ets_implicit
   */
  EqualStruct
} = interpreter("Equal")({
  String: (x, y) => x == y,
  Refined: (child) => () => child,
  Number: (x, y) => x == y,
  Struct: (fields) => (x, y) =>
    Object.keys(fields).every((field) => fields[field](x[field], y[field]))
})
