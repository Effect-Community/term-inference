import * as Derive from "../derivation"

/**
 * Refinement<A, A> => use identity
 * Refinement<A, B> => find Refinement<X, B> and resolve Refinement<A, X>, use compose else void resolution
 * Refinement<A, B & C> => resolve Refinement<A, A & B> and Refinement<A & B, A & B & C>, use compose
 * Refinement<A, A & Brand<X>> => find BrandIdentifier<Z, X>
 */

export const refinementRules: Derive.Rule[] = []

refinementRules.push(
  /**
   * Refinement<A, A> => use identity
   */
  (context, type) => {
    if (
      type.ref._tag === "TypeReference" &&
      type.ref.name === "Refinement" &&
      type.ref.params[0].ref.isAssignableTo(type.ref.params[1].ref)
    ) {
      const isAlwaysTrue = context.findInScope(
        (_) =>
          _.ref._tag === "UnsupportedTsType" &&
          _.ref.typeStr ===
            "<A, K extends string>() => BrandIdentifier<Branded<A, K>, K>"
      )
      if (isAlwaysTrue) {
        return context.providing({
          type,
          compute: () =>
            context.factory.createCallExpression(isAlwaysTrue.compute(), [], [])
        })
      }
    }
    return void 0
  }
)

refinementRules.push(
  /**
   * Refinement<A, B> => find Refinement<X, B> and resolve Refinement<A, X>, use compose else void resolution
   */
  (context, type) => {
    if (type.ref._tag === "TypeReference" && type.ref.name === "Refinement") {
      const origin = type.ref.params[0]
      const target = type.ref.params[1]

      const compose = context.findInScope(
        (_) =>
          _.ref._tag === "UnsupportedTsType" &&
          _.ref.typeStr ===
            `<A, B extends A, C extends B>(left: Refinement<A, B>, right: Refinement<B, C>) => Refinement<A, C>`
      )

      if (!compose) {
        return void 0
      }

      const inScope = context.findInScope(
        (_) =>
          _.ref._tag === "TypeReference" &&
          _.ref.name === "Refinement" &&
          Derive.equal(_.ref.params[1], target) &&
          !Derive.equal(_.ref.params[0], origin)
      )

      if (inScope && inScope.type.ref._tag === "TypeReference") {
        const intermediate = inScope.type.ref.params[0]

        const ab = Derive.ref(type.ref.copy([origin, intermediate]))
        const bc = Derive.ref(type.ref.copy([intermediate, target]))

        const resolveAB = context.resolve(ab)
        const resolveBC = context.resolve(bc)

        if (resolveAB && resolveBC) {
          return context.providing({
            type,
            compute: () =>
              context.factory.createCallExpression(
                compose.compute(),
                [],
                [resolveAB.compute(), resolveBC.compute()]
              )
          })
        }
      }
    }
    return void 0
  }
)

refinementRules.push(
  /**
   * Refinement<A, B & C> => Refinement<A, A & B> + Refinement<A & B, A & B & C>
   */
  (context, type) => {
    if (
      type.ref._tag === "TypeReference" &&
      type.ref.name === "Refinement" &&
      type.ref.params[1].ref._tag === "IntersectionType"
    ) {
      const compose = context.findInScope(
        (_) =>
          _.ref._tag === "UnsupportedTsType" &&
          _.ref.typeStr ===
            `<A, B extends A, C extends B>(left: Refinement<A, B>, right: Refinement<B, C>) => Refinement<A, C>`
      )

      if (!compose) {
        return void 0
      }

      const A = type.ref.params[0]
      const target = type.ref.params[1] as Derive.TypeNodeRef<Derive.IntersectionType>
      const B = target.ref.members[0]

      const AB = Derive.ref(
        type.ref.copy([A, Derive.ref(Derive.intersectionType([A, B]))])
      )

      const ABC = Derive.ref(
        type.ref.copy([
          Derive.ref(Derive.intersectionType([A, B])),
          Derive.ref(Derive.intersectionType([A, ...target.ref.members.slice(1)]))
        ])
      )

      if (Derive.equal(type, AB) || Derive.equal(type, ABC)) {
        return void 0
      }

      if (Derive.equal(AB.ref.params[0], AB.ref.params[1])) {
        return context.resolve(ABC)
      }

      if (Derive.equal(ABC.ref.params[0], ABC.ref.params[1])) {
        return context.resolve(AB)
      }

      const resolveAB = context.resolve(AB)
      const resolveABC = context.resolve(ABC)

      if (resolveAB && resolveABC) {
        return context.providing({
          type,
          compute: () =>
            context.factory.createCallExpression(
              compose.compute(),
              [],
              [resolveAB.compute(), resolveABC.compute()]
            )
        })
      }
    }
    return void 0
  }
)

refinementRules.push(
  /**
   * Refinement<A, A & Brand<X>>
   */
  (context, type) => {
    if (
      type.ref._tag === "TypeReference" &&
      type.ref.name === "Refinement" &&
      type.ref.params[1].ref._tag === "IntersectionType"
    ) {
      const typeFrom = type.ref.params[0]
      const typeTo = type.ref.params[1] as Derive.TypeNodeRef<Derive.IntersectionType>

      if (
        typeTo.ref.members[typeTo.ref.members.length - 1].ref._tag === "TypeReference"
      ) {
        const brand = typeTo.ref.members[
          typeTo.ref.members.length - 1
        ] as Derive.TypeNodeRef<Derive.TypeReference>

        if (brand.ref.name === "Brand") {
          const composeRefinement = context.findInScope(
            (_) =>
              _.ref._tag === "UnsupportedTsType" &&
              _.ref.typeStr ===
                `<A, B extends A, C extends B>(left: Refinement<A, B>, right: Refinement<B, C>) => Refinement<A, C>`
          )

          if (!composeRefinement) {
            return void 0
          }

          const remainingMembers = Array.from(typeTo.ref.members)
          remainingMembers.pop()
          const brandFrom = Derive.ref(Derive.intersectionType(remainingMembers))

          let bridgeBetweenTypeFromAndBrandFrom: Derive.ResolutionResult

          if (!typeFrom.ref.isAssignableTo(brandFrom.ref)) {
            const resolveBridge = context.resolve(
              Derive.ref(type.ref.copy([typeFrom, brandFrom]))
            )

            if (!resolveBridge) {
              return void 0
            }

            bridgeBetweenTypeFromAndBrandFrom = resolveBridge
          }

          const brandValidation = (() => {
            const brandIdentifier = context.findInScope(
              (_) =>
                _.ref._tag === "TypeReference" &&
                _.ref.name === "BrandIdentifier" &&
                Derive.equal(_.ref.params[1], brand.ref.params[0])
            )

            if (brandIdentifier && brandIdentifier.type.ref._tag === "TypeReference") {
              const brandTarget = brandIdentifier.type.ref
                .params[0] as Derive.TypeNodeRef<Derive.IntersectionType>

              const brandIdentifierFrom = Derive.ref(
                Derive.intersectionType(
                  brandTarget.ref.members.filter((_) => !Derive.equal(_, brand))
                )
              )

              let bridgeBetweenBrandFromAndBrandIdentifierFrom: Derive.ResolutionResult

              if (!brandFrom.ref.isAssignableTo(brandIdentifierFrom.ref)) {
                const resolveBridge = context.resolve(
                  Derive.ref(type.ref.copy([typeFrom, brandFrom]))
                )

                if (!resolveBridge) {
                  return void 0
                }

                bridgeBetweenBrandFromAndBrandIdentifierFrom = resolveBridge
              }

              if (bridgeBetweenBrandFromAndBrandIdentifierFrom) {
                const bridgeConst = bridgeBetweenBrandFromAndBrandIdentifierFrom
                return context.providing({
                  type: Derive.ref(
                    type.ref.copy([typeFrom, brandIdentifier.type.ref.params[1]])
                  ),
                  compute: () =>
                    context.factory.createCallExpression(
                      composeRefinement.compute(),
                      [],
                      [bridgeConst.compute(), brandIdentifier.compute()]
                    )
                })
              } else {
                return brandIdentifier
              }
            } else {
              const brandTarget = brand.ref.params[0]

              if (brandTarget.ref._tag === "StringLiteralType") {
                const matches = brandTarget.ref.value.match(/^(.*?)\((-?\d+\.?\d*)\)$/)

                if (matches && (matches[1] === "Min" || matches[1] === "Max")) {
                  const fn = context.findInScope(
                    (_) =>
                      _.ref._tag === "UnsupportedTsType" &&
                      _.ref.typeStr ===
                        (matches[1] === "Min"
                          ? "<K extends number | { readonly length: number; }, X extends number>(x: X) => Refinement<K, Min<K, X>>"
                          : "<K extends number | { readonly length: number; }, X extends number>(x: X) => Refinement<K, Max<K, X>>")
                  )

                  if (fn) {
                    const widenedMinMax = Derive.ref(
                      type.ref.copy([Derive.ref(Derive.unknownType), brand])
                    )
                    const resolved = context.findInScope((_) =>
                      _.ref.isAssignableTo(widenedMinMax.ref)
                    )
                    if (resolved) {
                      return resolved
                    }
                    return context.providing({
                      type: widenedMinMax,
                      compute: () =>
                        context.factory.createCallExpression(
                          fn.compute(),
                          [],
                          [context.factory.createNumericLiteral(matches[2])]
                        )
                    })
                  }

                  return void 0
                }
              }

              const isAlwaysTrue = context.findInScope(
                (_) =>
                  _.ref._tag === "UnsupportedTsType" &&
                  _.ref.typeStr ===
                    "<A, K extends string>() => BrandIdentifier<Branded<A, K>, K>"
              )

              if (isAlwaysTrue) {
                return context.providing({
                  type: bridgeBetweenTypeFromAndBrandFrom
                    ? Derive.ref(type.ref.copy([brandFrom, typeTo]))
                    : type,
                  compute: () =>
                    context.factory.createCallExpression(isAlwaysTrue.compute(), [], [])
                })
              }
            }
          })()

          if (bridgeBetweenTypeFromAndBrandFrom && brandValidation) {
            const bridgeConst = bridgeBetweenTypeFromAndBrandFrom
            return context.providing({
              type,
              compute: () =>
                context.factory.createCallExpression(
                  composeRefinement.compute(),
                  [],
                  [bridgeConst.compute(), brandValidation.compute()]
                )
            })
          } else {
            return brandValidation
          }
        }
      }
    }
    return void 0
  }
)
