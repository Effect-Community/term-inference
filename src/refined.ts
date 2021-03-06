import { lazyRef } from "./utils.js"

export declare const BrandSymbol: unique symbol
export declare const VarianceSymbol: unique symbol

export interface Brand<K extends string> {
  [BrandSymbol]: {
    [k in K]: true
  }
}

export type Branded<X, TypeName extends string> = X & Brand<TypeName>

export interface BrandIdentifier<
  X extends Brand<any>,
  K extends keyof X[typeof BrandSymbol] & string
> extends Refinement<
    X extends infer Y & Brand<K> ? Y : never,
    X extends (X extends infer Y & Brand<K> ? Y : never) ? X : never
  > {}

export function branded<
  X extends Brand<any>,
  K extends keyof X[typeof BrandSymbol] & string
>(f: (_: X extends infer Y & Brand<K> ? Y : never) => boolean): BrandIdentifier<X, K> {
  return refinement(f)
}

export class Refinement<A, B extends A> {
  readonly [VarianceSymbol]: {
    _A: (_: A) => void
    _B: (_: B) => B
  }

  constructor(readonly predicate: (a: A) => boolean) {}

  readonly is = (a: A): a is B => this.predicate(a)
}

export function refinement<A, B extends A>(f: (a: A) => a is B): Refinement<A, B>
export function refinement<A, B extends A>(f: (a: A) => boolean): Refinement<A, B>
export function refinement<A, B extends A>(f: (a: A) => boolean): Refinement<A, B> {
  return new Refinement(f)
}

export const composeRefinement = <A, B extends A, C extends B>(
  left: Refinement<A, B>,
  right: Refinement<B, C>
): Refinement<A, C> => refinement((u) => left.is(u) && right.is(u))

export const lazyRefinement = <A, B extends A>(
  getRefinement: () => Refinement<A, B>
): Refinement<A, A> => {
  const ref = lazyRef(getRefinement)
  return refinement((a: A) => ref.value.predicate(a))
}

export const isUnknown = refinement<unknown, unknown>(() => true)

export const isNumber = refinement<unknown, number>((u) => typeof u === "number")

export const isString = refinement<unknown, string>((u) => typeof u === "string")

export const isObject = refinement<unknown, object>((u) => typeof u === "object")

export const isFunction = refinement<unknown, Function>((u) => typeof u === "function")

export const isNotNull = refinement<object, {}>((u) => u != null)

export const isAlwaysTrue = <A, K extends string>() =>
  branded<Branded<A, K>, K>(() => true)

export type Min<
  K extends number | { readonly length: number },
  X extends number
> = Branded<K, `Min(${X})`>

export const isMin = <K extends number | { readonly length: number }, X extends number>(
  x: X
): Refinement<K, Min<K, X>> => refinement((_) => (isNumber.is(_) ? _ : _.length) >= x)

export type Max<
  K extends number | { readonly length: number },
  X extends number
> = Branded<K, `Max(${X})`>

export const isMax = <K extends number | { readonly length: number }, X extends number>(
  x: X
): Refinement<K, Max<K, X>> => refinement((_) => (isNumber.is(_) ? _ : _.length) <= x)

export type Between<
  K extends number | { readonly length: number },
  X extends number,
  Y extends number
> = Min<K, X> & Max<K, Y>

export type Int = Branded<number, "Int">

export const isInt = branded<Int, "Int">((u) => Number.isInteger(u))

export type Even = Branded<Int, "Even">

export const isEven = branded<Even, "Even">((u) => u % 2 == 0)
