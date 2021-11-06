import type { Between, Branded, Int, Refinement } from "../prelude.js"

export type FirstName = Branded<Between<string, 1, 255>, "FirstName">
export type LastName = Branded<Between<string, 1, 255>, "LastName">
export type Age = Branded<Between<Int, 0, 255>, "Age">

export const Age = implicitly<Refinement<unknown, Age>>()
export const FirstName = implicitly<Refinement<unknown, FirstName>>()
export const LastName = implicitly<Refinement<unknown, LastName>>()
