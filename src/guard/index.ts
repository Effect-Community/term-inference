import type { Refinement } from "../refined.js"
import { interpreter } from "../register.js"

declare module "../register.js" {
  interface Register<A> {
    Guard: Guard<A>
  }
}

/**
 * @ets_typeclass
 */
export interface Guard<T> {
  (u: unknown): u is T
}

export const {
  /**
   * @ets_implicit
   */
  GuardNumber,
  /**
   * @ets_implicit
   */
  GuardRefined,
  /**
   * @ets_implicit
   */
  GuardString,
  /**
   * @ets_implicit
   */
  GuardStruct
} = interpreter("Guard")({
  String: (u): u is string => typeof u === "string",
  Number: (u): u is number => typeof u === "number",
  Refined:
    <A>(child: Guard<A>) =>
    <B extends A>(ref: Refinement<A, B>) =>
    (u): u is B =>
      child(u) && ref.is(u),
  Struct:
    (fields) =>
    (u): u is Record<string, unknown> => {
      if (typeof u !== "object" || u === null) {
        return false
      }
      for (const field of Object.keys(fields)) {
        if (
          !(field in u) ||
          !fields[field as keyof typeof fields](u[field as keyof typeof u])
        ) {
          return false
        }
      }
      return true
    }
})
