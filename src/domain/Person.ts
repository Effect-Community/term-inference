import type { Between, Branded, Int, Refinement } from "../prelude.js"

export type FirstName = Branded<Between<string, 0, 255>, "FirstName">
export type LastName = Branded<Between<string, 0, 255>, "LastName">
export type Age = Branded<Between<Int, 0, 255>, "Age">

export const isAge = implicitly<Refinement<unknown, Age>>()
export const isFirstName = implicitly<Refinement<unknown, FirstName>>()
export const isLastName = implicitly<Refinement<unknown, LastName>>()
