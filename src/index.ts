import { guard } from "./guard.js"
import type { Person } from "./Person.js"

/**
 * @ets_macro guard getEither(guard(E), guard(A)) from "@effect-ts/macros/guards"
 */
export interface Either<E, A> {
  readonly _E: () => E
  readonly _A: () => A
}

export const isEitherStringOrPerson = guard<Either<string, Person>>()
