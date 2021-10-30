import * as Enc from "../encoder/index.js"
import * as Eq from "../equal/index.js"
import * as G from "../guard/index.js"
import { interpreter } from "../register.js"
import { mapRecord } from "../utils.js"

declare module "../register.js" {
  interface Register<A> {
    Codec: Codec<A>
  }
}

/**
 * @ets_typeclass
 */
export class Codec<T> {
  constructor(
    readonly is: G.Guard<T>,
    readonly encoder: Enc.Encoder<T>,
    readonly equal: Eq.Equal<T>
  ) {}

  readonly toJson = (a: T) => JSON.stringify(this.encoder(a))
}

export const {
  /**
   * @ets_implicit
   */
  CodecNumber,
  /**
   * @ets_implicit
   */
  CodecRefined,
  /**
   * @ets_implicit
   */
  CodecString,
  /**
   * @ets_implicit
   */
  CodecStruct
} = interpreter("Codec")({
  String: new Codec(G.GuardString, Enc.EncoderString, Eq.EqualString),
  Number: new Codec(G.GuardNumber, Enc.EncoderNumber, Eq.EqualNumber),
  Refined: (child) => (ref) =>
    new Codec(
      G.GuardRefined(child.is)(ref),
      Enc.EncoderRefined(child.encoder)(ref),
      Eq.EqualRefined(child.equal)(ref)
    ),
  Struct: (fields) =>
    new Codec(
      G.GuardStruct(mapRecord(fields, (_) => _.is)),
      Enc.EncoderStruct(mapRecord(fields, (_) => _.encoder)),
      Eq.EqualStruct(mapRecord(fields, (_) => _.equal))
    )
})
