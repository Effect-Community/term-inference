import { guard } from "./guard.js"

/**
 * @ets_macro guard isPerson from "@app/Person"
 */
export interface Person {
  readonly first: string
  readonly last: string
}

export const isPerson = guard<Person>("ignore_custom")
