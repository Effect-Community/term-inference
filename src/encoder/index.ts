import { interpreter } from "../register.js"

declare module "../register.js" {
  interface Register<A> {
    Encoder: Encoder<A>
  }
}

/**
 * @ets_typeclass
 */
export interface Encoder<T> {
  (a: T): unknown
}

export const {
  /**
   * @ets_implicit
   */
  EncoderNumber,
  /**
   * @ets_implicit
   */
  EncoderRefined,
  /**
   * @ets_implicit
   */
  EncoderString,
  /**
   * @ets_implicit
   */
  EncoderStruct
} = interpreter("Encoder")({
  String: (x) => x,
  Number: (x) => x,
  Refined: (child) => () => (x) => child(x),
  Struct: (fields) => (u) => {
    const encoded = {} as Record<string, unknown>
    for (const field of Object.keys(u)) {
      encoded[field] = fields[field as keyof typeof fields](u[field as keyof typeof u])
    }
    return encoded
  }
})
