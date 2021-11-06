import type * as P from "../prelude.js"

export type FirstName = P.Branded<P.Between<string, 1, 255>, "FirstName">
export type LastName = P.Branded<P.Between<string, 1, 255>, "LastName">
export type Age = P.Branded<P.Between<P.Int, 0, 255>, "Age">

export const Age = implicitly<P.Refinement<unknown, Age>>()
export const FirstName = implicitly<P.Refinement<unknown, FirstName>>()
export const LastName = implicitly<P.Refinement<unknown, LastName>>()
