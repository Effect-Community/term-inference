import type { Refinement } from "./refined.js"

export type URI = keyof Register<any>
export type Interpreter<K extends URI, A> = Register<A>[K]

export interface Register<A> {}

export type Prefix<P extends URI, A> = {
  [k in keyof A & string as `${P}${k}`]: A[k]
} extends infer Z
  ? Z
  : never

export interface RelaxedDSL<K extends URI> {
  String: Interpreter<K, string>
  Number: Interpreter<K, number>
  Refined: <A>(
    child: Interpreter<K, A>
  ) => <B extends A>(refinement: Refinement<A, B>) => Interpreter<K, B>
  Struct: (
    fields: Record<string, Interpreter<K, unknown>>
  ) => Interpreter<K, Record<string, unknown>>
}

export interface DSL<K extends URI> {
  String: Interpreter<K, string>
  Number: Interpreter<K, number>
  Refined: <A>(
    child: Interpreter<K, A>
  ) => <B extends A>(refinement: Refinement<A, B>) => Interpreter<K, B>
  Struct: <Fields extends Record<string, Interpreter<K, any>>>(
    fields: Fields
  ) => Interpreter<
    K,
    { [k in keyof Fields]: [Fields[k]] extends [Interpreter<K, infer A>] ? A : never }
  >
}

export function interpreter<K extends URI>(
  prefix: K
): (_: RelaxedDSL<K>) => Prefix<K, DSL<K>> {
  return (x) => {
    const z = {}
    for (const k of Object.keys(x)) {
      // @ts-expect-error
      z[`${prefix}${k}`] = x[k]
    }
    return z
  }
}
