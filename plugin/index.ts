/* eslint-disable no-inner-declarations */
import * as path from "path"
import type {} from "ts-expose-internals"
import * as ts from "typescript"

namespace Derive {
  export class StringType {
    readonly _tag = "StringType"

    isAssignableTo(type: Type): boolean {
      if (type._tag === "UnknownType") {
        return true
      }
      return type._tag === this._tag
    }
  }

  export class UnknownType {
    readonly _tag = "UnknownType"

    isAssignableTo(type: Type): boolean {
      return type._tag === this._tag
    }
  }

  export class ObjectType {
    readonly _tag = "ObjectType"

    isAssignableTo(type: Type): boolean {
      if (type._tag === "UnknownType") {
        return true
      }
      return type._tag === this._tag
    }
  }

  export class NumberType {
    readonly _tag = "NumberType"

    isAssignableTo(type: Type): boolean {
      if (type._tag === "UnknownType") {
        return true
      }
      return type._tag === this._tag
    }
  }

  export class StringLiteralType {
    readonly _tag = "StringLiteralType"
    constructor(readonly value: string) {}

    isAssignableTo(type: Type): boolean {
      if (type._tag === "UnknownType") {
        return true
      }
      if (type._tag === "StringType") {
        return true
      }
      return type._tag === this._tag && type.value === this.value
    }
  }

  export class NumberLiteralType {
    readonly _tag = "NumberLiteralType"
    constructor(readonly value: number) {}

    isAssignableTo(type: Type): boolean {
      if (type._tag === "UnknownType") {
        return true
      }
      if (type._tag === "NumberType") {
        return true
      }
      return type._tag === this._tag && type.value === this.value
    }
  }

  export class UnsupportedTsType {
    readonly _tag = "UnsupportedTsType"
    constructor(readonly typeStr: string) {}

    isAssignableTo(type: Type): boolean {
      return type._tag === this._tag && type.typeStr === this.typeStr
    }
  }

  export class InterfaceType {
    readonly _tag = "InterfaceType"

    constructor(
      readonly name: string,
      readonly members: { name: string; type: TypeNode }[]
    ) {}

    isAssignableTo(type: Type): boolean {
      if (type._tag === "UnknownType") {
        return true
      }
      return (
        type._tag === this._tag &&
        type.name === this.name &&
        type.members.length === this.members.length &&
        this.members.every((m, i) =>
          m.type.ref.isAssignableTo(type.members[i].type.ref)
        )
      )
    }
  }

  export class StructuralType {
    readonly _tag = "StructuralType"
    constructor(readonly members: { name: string; type: TypeNode }[]) {}

    isAssignableTo(type: Type): boolean {
      if (type._tag === "UnknownType") {
        return true
      }
      return (
        type._tag === this._tag &&
        type.members.length === this.members.length &&
        this.members.every((m, i) =>
          m.type.ref.isAssignableTo(type.members[i].type.ref)
        )
      )
    }
  }

  function eqArray<A, B>(
    a: A[] | undefined,
    b: B[] | undefined,
    eq: (a: A, b: B, i: number) => boolean
  ): boolean {
    if (!a && !b) {
      return true
    }
    if (!a) {
      return false
    }
    if (!b) {
      return false
    }
    if (a.length !== b.length) {
      return false
    }
    for (let i = 0; i < a.length; i++) {
      if (!eq(a[i], b[i], i)) {
        return false
      }
    }
    return true
  }

  export class TypeReference {
    readonly _tag = "TypeReference"

    constructor(
      readonly name: string,
      readonly params: TypeNode[],
      readonly tags: ts.JSDocTagInfo[],
      readonly variances: ts.VarianceFlags[] | undefined
    ) {}

    copy(params: TypeNode[]): TypeReference {
      return new TypeReference(this.name, params, this.tags, this.variances)
    }

    // Either<Error,string>

    isAssignableTo(type: Type): boolean {
      if (type._tag === "UnknownType") {
        return true
      }
      return (
        type._tag === this._tag &&
        this.name === type.name &&
        eqArray(this.tags, type.tags, (x, y) => x === y) &&
        eqArray(this.variances, type.variances, (x, y) => x === y) &&
        eqArray(this.params, type.params, (x, y, i) => {
          if (this.variances && this.variances.length === this.params.length) {
            if (this.variances[i] === ts.VarianceFlags.Contravariant) {
              return y.ref.isAssignableTo(x.ref)
            }
            if (this.variances[i] === ts.VarianceFlags.Covariant) {
              return x.ref.isAssignableTo(y.ref)
            }
          }
          return x.ref.isAssignableTo(y.ref) && y.ref.isAssignableTo(x.ref)
        })
      )
    }
  }

  export class IntersectionType {
    readonly _tag = "IntersectionType"
    constructor(readonly members: TypeNode[]) {}

    isAssignableTo(type: Type): boolean {
      if (type._tag === "UnknownType") {
        return true
      }

      if (type._tag === "IntersectionType") {
        return type.members.every(
          (typeMember) =>
            this.members.findIndex((thisMember) =>
              thisMember.ref.isAssignableTo(typeMember.ref)
            ) !== -1
        )
      }

      return (
        this.members.findIndex((thisMember) => thisMember.ref.isAssignableTo(type)) !==
        -1
      )
    }
  }

  export type TypeNode = TypeNodeRef<Type>

  export interface TypeNodeRef<T extends Type> {
    ref: T
  }

  export type Type =
    | StringType
    | NumberType
    | UnknownType
    | ObjectType
    | StringLiteralType
    | NumberLiteralType
    | UnsupportedTsType
    | InterfaceType
    | TypeReference
    | IntersectionType
    | StructuralType

  export const ref = <T extends Type>(_: T): TypeNodeRef<T> => ({ ref: _ })

  export const stringType: Type = new StringType()

  export const numberType: Type = new NumberType()

  export const unknownType: Type = new UnknownType()

  export const objectType: Type = new ObjectType()

  export const stringLiteralType = (value: string): Type => new StringLiteralType(value)

  export const numberLiteralType = (value: number): Type => new NumberLiteralType(value)

  export const unsupportedType = (typeStr: string): Type =>
    new UnsupportedTsType(typeStr)

  export const interfaceType = (
    name: string,
    members: {
      name: string
      type: TypeNode
    }[]
  ): Type => new InterfaceType(name, members)

  export const typeReferenceType = (
    name: string,
    args: TypeNode[],
    tags: ts.JSDocTagInfo[],
    variances: ts.VarianceFlags[] | undefined
  ): Type => new TypeReference(name, args, tags, variances)

  function normalizeMembers(members: TypeNode[]): TypeNode[] {
    let normalized: TypeNode[] = []
    for (let i = 0; i < members.length; i++) {
      const ref = members[i].ref
      if (ref._tag === "IntersectionType") {
        normalized = normalizeMembers([...normalized, ...ref.members])
      } else if (
        ref._tag !== "UnknownType" &&
        normalized.findIndex((_) => Derive.equal(members[i], _)) === -1
      ) {
        normalized.push(members[i])
      }
    }
    return normalized
  }

  export const intersectionType = (members: TypeNode[]): Type => {
    const normalized = normalizeMembers(members)
    if (normalized.length === 1) {
      return normalized[0].ref
    }
    if (normalized.length === 0) {
      return unknownType
    }
    return new IntersectionType(normalized)
  }

  export const structuralType = (
    members: {
      name: string
      type: TypeNode
    }[]
  ): Type => new StructuralType(members)

  export type ResolutionResult =
    | { type: TypeNode; compute: () => ts.Expression }
    | undefined

  export type Rule = (
    context: ResolutionContext,
    type: Derive.TypeNode
  ) => ResolutionResult

  export function equal(left: TypeNode, right: TypeNode): boolean {
    return left.ref.isAssignableTo(right.ref) && right.ref.isAssignableTo(left.ref)
  }

  export function stringify(type: TypeNode): string {
    switch (type.ref._tag) {
      case "UnknownType": {
        return "unknown"
      }
      case "StringType": {
        return "string"
      }
      case "NumberType": {
        return "number"
      }
      case "ObjectType": {
        return "object"
      }
      case "StringLiteralType": {
        return `"${type.ref.value}"`
      }
      case "NumberLiteralType": {
        return `${type.ref.value}`
      }
      case "UnsupportedTsType": {
        return `Unsupported(${type.ref.typeStr})`
      }
      case "InterfaceType": {
        return `${type.ref.name}`
      }
      case "TypeReference": {
        return (
          `${type.ref.name}` +
          (type.ref.params.length > 0
            ? `<${type.ref.params.map(stringify).join(", ")}>`
            : "")
        )
      }
      case "IntersectionType": {
        return type.ref.members.map(stringify).join(" & ")
      }
      case "StructuralType": {
        return type.ref.members.length > 0
          ? `{ ${type.ref.members
              .map((m) => `${m.name}: ${stringify(m.type)}`)
              .join("; ")} }`
          : `{}`
      }
    }
  }

  export function fromTs(type: ts.Type): TypeNode {
    return fromTsWithCache(type, new Map())
  }

  function fromTsWithCache(type: ts.Type, cache: Map<ts.Type, TypeNode>): TypeNode {
    if (cache.has(type)) {
      return cache.get(type)!
    }

    const node: TypeNode = {} as any

    cache.set(type, node)

    const typeStr = type.checker.typeToString(type)

    if (type.isClassOrInterface()) {
      node.ref = interfaceType(
        type.symbol.name,
        type.getProperties().flatMap((s) =>
          s.declarations
            ? s.declarations.map((d) => ({
                name: s.name,
                type: fromTsWithCache(type.checker.getTypeAtLocation(d), cache)
              }))
            : []
        )
      )

      return node
    }

    if (typeStr === "string") {
      node.ref = stringType
      return node
    }

    if (typeStr === "unknown") {
      node.ref = unknownType
      return node
    }

    if (typeStr === "object") {
      node.ref = objectType
      return node
    }

    if (typeStr === "number") {
      node.ref = numberType
      return node
    }

    if (typeStr.match(/^\d+$/)) {
      node.ref = numberLiteralType(Number.parseInt(typeStr))
      return node
    }

    if (typeStr.match(/^-?\d+\.?\d*$/)) {
      node.ref = numberLiteralType(Number.parseFloat(typeStr))
      return node
    }

    const stringLiteralMatch = typeStr.match(/^"(.*?)"$/)

    if (stringLiteralMatch) {
      node.ref = stringLiteralType(stringLiteralMatch[1])
      return node
    }

    if (type.isIntersection()) {
      node.ref = intersectionType(type.types.map((x) => fromTsWithCache(x, cache)))
      return node
    }

    if (type.symbol) {
      if (
        type.symbol.name === "__type" ||
        type.symbol.name === "__object" ||
        type.symbol.name === "__function"
      ) {
        if (type.getCallSignatures().length > 0) {
          node.ref = unsupportedType(typeStr)
          return node
        }
        node.ref = structuralType(
          type.getProperties().flatMap((s) =>
            s.declarations
              ? s.declarations.map((d) => ({
                  name: s.name,
                  type: fromTsWithCache(type.checker.getTypeAtLocation(d), cache)
                }))
              : []
          )
        )
        return node
      }

      node.ref = typeReferenceType(
        type.symbol.name,
        type.checker
          .getTypeArguments(type as ts.TypeReference)
          .map((x) => fromTsWithCache(x, cache)),
        type.symbol.getJsDocTags(),
        "target" in type &&
          "variances" in (type as any)["target"] &&
          (type as any)["target"]["variances"]
      )

      return node
    }

    node.ref = unsupportedType(typeStr)

    return node
  }
}

class ImportMap {
  readonly map = new Map<string, ts.Identifier>()

  constructor(readonly factory: ts.NodeFactory) {}

  moduleId(module: string) {
    let id: ts.Identifier
    if (this.map.has(module)) {
      id = this.map.get(module)!
    } else {
      id = this.factory.createUniqueName("module")
      this.map.set(module, id)
    }
    return id
  }
}

class InLocal {
  readonly _tag = "InLocal"
  constructor(readonly id: ts.Identifier) {}
}

class InDerivation {
  readonly _tag = "InDerivation"
  constructor(readonly id: ts.Identifier, readonly expr: () => ts.Expression) {}
  public used = false
}

class InModule {
  readonly _tag = "InModule"
  constructor(readonly modulePath: string, readonly id: ts.Identifier) {}
}

const rules: Derive.Rule[] = []

// Always True Refinement
rules.push((context, type) => {
  if (
    type.ref._tag === "TypeReference" &&
    type.ref.name === "Refinement" &&
    type.ref.params[0].ref.isAssignableTo(type.ref.params[1].ref)
  ) {
    const isAlwaysTrue = context.findInScope(
      (_) =>
        _.ref._tag === "UnsupportedTsType" &&
        _.ref.typeStr === "<A, K extends string>() => Refinement<A, Refined<A, K>>"
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
})

rules.push((context, type) => {
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

    const B = Derive.ref(
      Derive.intersectionType([type.ref.params[0], type.ref.params[1].ref.members[0]])
    )

    const C = type.ref.params[1]

    const typeAB = Derive.ref(type.ref.copy([A, B]))
    const typeBC = Derive.ref(type.ref.copy([B, C]))

    if (Derive.equal(type, typeAB) || Derive.equal(type, typeBC)) {
      return void 0
    }
    if (Derive.equal(A, B)) {
      return context.resolve(Derive.ref(type.ref.copy([B, C])))
    }

    if (Derive.equal(B, C)) {
      return context.resolve(Derive.ref(type.ref.copy([A, B])))
    }

    const AB = context.resolve(typeAB)
    const BC = context.resolve(typeBC)

    if (AB && BC) {
      return context.providing({
        type,
        compute: () =>
          context.factory.createCallExpression(
            compose.compute(),
            [],
            [AB.compute(), BC.compute()]
          )
      })
    }
  }

  return void 0
})

rules.push((context, type) => {
  if (
    type.ref._tag === "TypeReference" &&
    type.ref.name === "Refinement" &&
    type.ref.params[1].ref._tag === "IntersectionType"
  ) {
    const from = type.ref.params[0]

    const residual = type.ref.params[1].ref.members.filter(
      (_) => !from.ref.isAssignableTo(_.ref)
    )

    if (
      residual.length > 0 &&
      residual[0].ref._tag === "TypeReference" &&
      residual[0].ref.name === "Brand"
    ) {
      const brand = residual[0].ref.params[0]

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
          _.ref.params[1].ref._tag === "IntersectionType" &&
          Derive.equal(
            residual[0],
            _.ref.params[1].ref.members[_.ref.params[1].ref.members.length - 1]
          )
      )

      const validation: Derive.ResolutionResult = inScope
        ? inScope
        : (() => {
            if (brand.ref._tag === "StringLiteralType") {
              const matches = brand.ref.value.match(/^(.*?)\((-?\d+\.?\d*)\)$/)
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
                  const minMaxType = Derive.ref(
                    Derive.typeReferenceType(
                      type.ref.name,
                      [
                        Derive.ref(
                          Derive.intersectionType(
                            type.ref.params[1].ref.members.filter(
                              (_) =>
                                !(
                                  _.ref._tag === "TypeReference" &&
                                  _.ref.name === "Brand"
                                )
                            )
                          )
                        ),
                        Derive.ref(
                          Derive.intersectionType(
                            type.ref.params[1].ref.members.filter(
                              (_) =>
                                _.ref._tag !== "TypeReference" ||
                                _.ref.name !== "Brand" ||
                                _ === residual[0]
                            )
                          )
                        )
                      ],
                      type.ref.tags,
                      type.ref.variances
                    )
                  )

                  const existing = context.findInScope((_) =>
                    _.ref.isAssignableTo(minMaxType.ref)
                  )

                  if (existing) {
                    return existing
                  }

                  return context.providing({
                    type: minMaxType,
                    compute: () =>
                      context.factory.createCallExpression(
                        fn.compute(),
                        [],
                        [context.factory.createNumericLiteral(matches[2])]
                      )
                  })
                }
              }
            }
          })()

      if (residual.length === 1) {
        if (validation) {
          return validation
        }

        const isAlwaysTrue = context.findInScope(
          (_) =>
            _.ref._tag === "UnsupportedTsType" &&
            _.ref.typeStr === "<A, K extends string>() => Refinement<A, Refined<A, K>>"
        )
        if (isAlwaysTrue) {
          return context.providing({
            type,
            compute: () =>
              context.factory.createCallExpression(isAlwaysTrue.compute(), [], [])
          })
        }
      } else {
        const resFrom = Derive.ref(Derive.intersectionType([from, residual[0]]))

        if (Derive.equal(resFrom, type.ref.params[1])) {
          return validation
        }

        const res = Derive.ref(type.ref.copy([resFrom, type.ref.params[1]]))

        const resolvedResidual = context.resolve(res)

        if (!resolvedResidual) {
          return void 0
        }

        if (validation) {
          return context.providing({
            type,
            compute: () =>
              context.factory.createCallExpression(
                compose.compute(),
                [],
                [validation.compute(), resolvedResidual.compute()]
              )
          })
        }

        return resolvedResidual
      }
    }
  }
  return void 0
})

// Refinement for Min/Max
//rules.push((context, type) => {
//  if (
//    type.ref._tag === "TypeReference" &&
//    type.ref.name === "Refinement" &&
//    type.ref.arguments[1].ref._tag === "IntersectionType"
//  ) {
//    const fx = type.ref.arguments[1].ref.members.find(
//      (member) =>
//        member.ref._tag === "TypeReference" &&
//        member.ref.name === "Brand" &&
//        member.ref.arguments[0].ref._tag === "StringLiteralType" &&
//        member.ref.arguments[0].ref.value.match(/^(.*?)\(-?\d+\.?\d*\)$/)
//    )
//    if (fx && fx.ref._tag === "TypeReference") {
//      const brand = fx.ref.arguments[0]
//      const validation: Derive.ResolutionResult = (() => {
//        if (brand.ref._tag === "StringLiteralType") {
//          const matches = brand.ref.value.match(/^(.*?)\((-?\d+\.?\d*)\)$/)
//          if (matches && (matches[1] === "Min" || matches[1] === "Max")) {
//            const fn = context.findInScope(
//              (_) =>
//                _.ref._tag === "UnsupportedTsType" &&
//                _.ref.typeStr ===
//                  (matches[1] === "Min"
//                    ? "<K extends number | { readonly length: number; }, X extends number>(x: X) => Refinement<K, Min<K, X>>"
//                    : "<K extends number | { readonly length: number; }, X extends number>(x: X) => Refinement<K, Max<K, X>>")
//            )
//            if (fn) {
//              const minMaxType = Derive.ref(
//                Derive.typeReferenceType(
//                  type.ref.name,
//                  [
//                    Derive.ref(
//                      Derive.intersectionType(
//                        type.ref.arguments[1].ref.members.filter(
//                          (_) =>
//                            !(_.ref._tag === "TypeReference" && _.ref.name === "Brand")
//                        )
//                      )
//                    ),
//                    Derive.ref(
//                      Derive.intersectionType(
//                        type.ref.arguments[1].ref.members.filter(
//                          (_) =>
//                            _.ref._tag !== "TypeReference" ||
//                            _.ref.name !== "Brand" ||
//                            _ === fx
//                        )
//                      )
//                    )
//                  ],
//                  type.ref.tags,
//                  type.ref.variances
//                )
//              )
//
//              const existing = context.findInScope((_) =>
//                Derive.isAssignableTo(minMaxType, _)
//              )
//
//              if (existing) {
//                return existing
//              }
//
//              return {
//                type: minMaxType,
//                compute: () =>
//                  context.factory.createCallExpression(
//                    fn.compute(),
//                    [],
//                    [context.factory.createNumericLiteral(matches[2])]
//                  )
//              }
//            }
//          }
//        }
//      })()
//
//      const compose = context.findInScope(
//        (_) =>
//          _.ref._tag === "UnsupportedTsType" &&
//          _.ref.typeStr ===
//            `<A, B extends A, C extends B>(left: Refinement<A, B>, right: Refinement<B, C>) => Refinement<A, C>`
//      )
//
//      const residual = type.ref.arguments[1].ref.members.filter((_) => _ !== fx)
//
//      if (validation && compose) {
//        const resolved = context.resolve(
//          Derive.ref(
//            Derive.typeReferenceType(
//              type.ref.name,
//              [type.ref.arguments[0], Derive.ref(Derive.intersectionType(residual))],
//              type.ref.tags,
//              type.ref.variances
//            )
//          )
//        )
//
//        if (resolved) {
//          return context.providing({
//            type,
//            compute: () =>
//              context.factory.createCallExpression(
//                compose.compute(),
//                [],
//                [resolved.compute(), validation.compute()]
//              )
//          })
//        }
//      }
//    }
//  }
//  return void 0
//})

// Default Refinement For Branded Types
//rules.push((context, type) => {
//  if (
//    type.ref._tag === "TypeReference" &&
//    type.ref.name === "Refinement" &&
//    type.ref.arguments[1].ref._tag === "IntersectionType"
//  ) {
//    const target = type.ref.arguments[1].ref
//    const targetLastMember = target.members[target.members.length - 1]
//
//    if (
//      targetLastMember.ref._tag === "TypeReference" &&
//      targetLastMember.ref.name === "Brand"
//    ) {
//      const exists = context.findInScope(
//        (_) =>
//          _.ref._tag === "TypeReference" &&
//          _.ref.name === "Refinement" &&
//          _.ref.arguments[1].ref._tag === "IntersectionType" &&
//          _.ref.arguments[1].ref.members.findIndex((_) =>
//            Derive.equal(_, targetLastMember)
//          ) !== -1
//      )
//
//      if (exists) {
//        return void 0
//      }
//
//      const newMembers = [...target.members]
//
//      newMembers.pop()
//
//      return context.resolve(
//        Derive.ref(
//          Derive.typeReferenceType(
//            "Refinement",
//            [type.ref.arguments[0], Derive.ref(Derive.intersectionType(newMembers))],
//            type.ref.tags,
//            type.ref.variances
//          )
//        )
//      )
//    }
//  }
//  return void 0
//})

//rules.push((context, type) => {
//  if (type.ref._tag === "TypeReference" && type.ref.arguments.length === 2) {
//    const name = type.ref.name
//    const compose = context.findInScope(
//      (_) =>
//        _.ref._tag === "UnsupportedTsType" &&
//        _.ref.typeStr.match(
//          new RegExp(
//            `^<(?![(|)]).*>\\((.*?): ${name}<A, B>, (.*?): ${name}<B, C>\\) => ${name}<A, C>$`
//          )
//        ) != null
//    )
//    if (compose) {
//      const name = type.ref.name
//      const C = type.ref.arguments[1]
//
//      const right = context.findInScope(
//        (_) =>
//          _.ref._tag === "TypeReference" &&
//          _.ref.name === name &&
//          _.ref.arguments.length === 2 &&
//          Derive.equal(_.ref.arguments[1], C)
//      )
//
//      if (right && right.type.ref._tag === "TypeReference") {
//        const A = type.ref.arguments[0]
//        const B = right.type.ref.arguments[0]!
//        const aimToResolve: Derive.TypeNode = Derive.ref(
//          Derive.typeReferenceType(name, [A, B], type.ref.tags, type.ref.variances)
//        )
//
//        if (Derive.equal(type, aimToResolve)) {
//          return void 0
//        }
//
//        const left = context.resolve(aimToResolve)
//
//        if (left) {
//          return context.providing({
//            type,
//            compute: () =>
//              context.factory.createCallExpression(compose.compute(), undefined, [
//                left.compute(),
//                right.compute()
//              ])
//          })
//        }
//      }
//    }
//  }
//  return void 0
//})

class ResolutionContext {
  constructor(
    readonly scope: (
      | {
          type: Derive.TypeNode
          binding: InModule
        }
      | {
          type: Derive.TypeNode
          binding: InLocal
        }
      | {
          type: Derive.TypeNode
          binding: InDerivation
        }
    )[],
    readonly factory: ts.NodeFactory,
    readonly importMap: ImportMap,
    readonly statementsToAdd: ts.Statement[]
  ) {}

  providing(result: Derive.ResolutionResult): Derive.ResolutionResult {
    if (result) {
      const derivation = this.factory.createUniqueName("derivation")
      let added = false
      const inDerivation = new InDerivation(derivation, () => {
        inDerivation.used = true
        if (!added) {
          this.statementsToAdd.push(
            this.factory.createVariableStatement(
              undefined,
              this.factory.createVariableDeclarationList(
                [
                  this.factory.createVariableDeclaration(
                    derivation,
                    undefined,
                    undefined,
                    result.compute()
                  )
                ],
                ts.NodeFlags.Const
              )
            )
          )
          added = true
        }
        return derivation
      })
      this.scope.push({ type: result.type, binding: inDerivation })
      return {
        type: result.type,
        compute: inDerivation.expr
      }
    }
    return void 0
  }

  resolve(type: Derive.TypeNode): Derive.ResolutionResult {
    const inScope = this.findInScope((_) => _.ref.isAssignableTo(type.ref))
    if (inScope) {
      return inScope
    }
    for (let i = 0; i < rules.length; i++) {
      const impl = rules[i](this, type)
      if (impl) {
        return impl
      }
    }
  }

  findInScope(cond: (_: Derive.TypeNode) => boolean): Derive.ResolutionResult {
    for (let j = 0; j < this.scope.length; j++) {
      const entry = this.scope[j]
      if (entry && cond(entry.type)) {
        return {
          type: entry.type,
          compute: () =>
            entry.binding._tag === "InLocal" || entry.binding._tag === "InDerivation"
              ? entry.binding.id
              : this.factory.createPropertyAccessExpression(
                  this.importMap.moduleId(entry.binding.modulePath),
                  entry.binding.id
                )
        }
      }
    }
  }
}

interface AddedDerivation {
  type: Derive.TypeNode
  binding: InDerivation
}

class ImplicitScope {
  constructor(
    private importMap: ImportMap,
    private factory: ts.NodeFactory,
    private sourceFile: ts.SourceFile,
    private module: {
      type: Derive.TypeNode
      tags: ts.JSDocTagInfo[]
      binding: InModule
    }[] = [],
    public local: {
      type: Derive.TypeNode
      tags: ts.JSDocTagInfo[]
      binding: InLocal
    }[] = []
  ) {}

  child(): ImplicitScope {
    return new ImplicitScope(
      this.importMap,
      this.factory,
      this.sourceFile,
      this.module,
      Array.from(this.local)
    )
  }

  setInLocal(type: ts.Type, name: ts.Identifier) {
    this.local.push({
      type: Derive.fromTs(type),
      tags: type.symbol ? type.symbol.getJsDocTags() : [],
      binding: new InLocal(name)
    })
  }

  setInLocalFromType(type: Derive.TypeNode, name: ts.Identifier) {
    this.local.push({
      type,
      tags: [],
      binding: new InLocal(name)
    })
  }

  setInModule(
    type: ts.Type,
    tags: ts.JSDocTagInfo[],
    modulePath: string,
    exportName: ts.Identifier
  ) {
    this.module.push({
      type: Derive.fromTs(type),
      tags,
      binding: new InModule(modulePath, exportName)
    })
  }

  resolveImplementation(
    node: ts.Node,
    type: ts.Type,
    statementsToAdd: ts.Statement[]
  ): readonly [ts.Expression, AddedDerivation[]] {
    const impl = this.resolveImplementationSafe(Derive.fromTs(type), statementsToAdd)
    if (impl) {
      return impl
    }
    reportError(this.sourceFile, node, type)
  }

  resolveImplementationSafe(
    type: Derive.TypeNode,
    statementsToAdd: ts.Statement[]
  ): readonly [ts.Expression, AddedDerivation[]] | undefined {
    const scope: (
      | {
          type: Derive.TypeNode
          tags: ts.JSDocTagInfo[]
          binding: InLocal
        }
      | {
          type: Derive.TypeNode
          tags: ts.JSDocTagInfo[]
          binding: InModule
        }
      | AddedDerivation
    )[] = [...this.module, ...this.local]

    scope.reverse()
    const context = new ResolutionContext(
      scope,
      this.factory,
      this.importMap,
      statementsToAdd
    )
    const resolution = context.resolve(type)

    if (resolution) {
      const resolved = resolution.compute()

      return [
        resolved,
        scope.filter(
          (x): x is AddedDerivation =>
            x && x.binding._tag === "InDerivation" && x.binding.used
        )
      ] as const
    }
  }
}

export default function identity(_program: ts.Program) {
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const importMap = new ImportMap(factory)

        console.log("PROCESS", sourceFile.fileName)

        function scopedVisitor(
          implicitScope: ImplicitScope,
          statementsFromParent: ts.Statement[] | undefined
        ): (node: ts.Node) => ts.Node {
          return function (node: ts.Node): ts.Node {
            if (ts.isSourceFile(node)) {
              const statements: ts.Statement[] = []
              for (let i = 0; i < node.statements.length; i++) {
                const processed = ts.visitNode(
                  node.statements[i],
                  scopedVisitor(implicitScope, statements)
                )
                statements.push(processed)
              }
              return factory.updateSourceFile(
                node,
                statements,
                node.isDeclarationFile,
                node.referencedFiles,
                node.typeReferenceDirectives,
                node.hasNoDefaultLib,
                node.libReferenceDirectives
              )
            }

            if (ts.isBlock(node)) {
              const childScope = implicitScope.child()
              if (ts.isFunctionDeclaration(node.parent)) {
                node.parent.parameters.forEach((p) => {
                  if (ts.isIdentifier(p.name)) {
                    childScope.setInLocal(checker.getTypeAtLocation(p), p.name)
                  }
                })
              }

              const statements: ts.Statement[] = []

              for (let i = 0; i < node.statements.length; i++) {
                const processed = ts.visitNode(
                  node.statements[i],
                  scopedVisitor(childScope, statements)
                )
                statements.push(processed)
              }

              return factory.updateBlock(node, statements)
            }

            if (ts.isVariableStatement(node)) {
              const child = ts.visitEachChild(
                node,
                scopedVisitor(implicitScope, statementsFromParent),
                ctx
              )

              node.declarationList.declarations.forEach((decl) => {
                if (ts.isIdentifier(decl.name)) {
                  implicitScope.setInLocal(checker.getTypeAtLocation(decl), decl.name)
                }
              })

              return child
            }

            if (ts.isCallExpression(node)) {
              const signature = checker.getResolvedSignature(node)

              if (signature) {
                const isDerive =
                  signature
                    .getJsDocTags()
                    .findIndex(
                      (tag) =>
                        tag.name === "ets_derive" &&
                        tag.text &&
                        tag.text[0] &&
                        tag.text[0].text === "implicitly"
                    ) !== -1

                if (isDerive) {
                  const statementsToAdd: ts.Statement[] = []

                  const [implementation, derivationsToAdd] =
                    implicitScope.resolveImplementation(
                      node,
                      checker.getTypeAtLocation(node),
                      statementsToAdd
                    )

                  if (statementsFromParent) {
                    statementsFromParent.push(...statementsToAdd)
                    derivationsToAdd.forEach((d) => {
                      implicitScope.setInLocalFromType(d.type, d.binding.id)
                    })
                  } else {
                    return factory.createCallExpression(
                      factory.createParenthesizedExpression(
                        factory.createArrowFunction(
                          undefined,
                          undefined,
                          [],
                          undefined,
                          factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                          factory.createBlock(
                            [
                              ...statementsToAdd,
                              factory.createReturnStatement(implementation)
                            ],
                            true
                          )
                        )
                      ),
                      undefined,
                      []
                    )
                  }
                  return implementation
                }
              }
            }
            return ts.visitEachChild(
              node,
              scopedVisitor(implicitScope, statementsFromParent),
              ctx
            )
          }
        }

        const initialScope = new ImplicitScope(importMap, factory, sourceFile)

        if (!sourceFile.isDeclarationFile) {
          sourceFile.imports.forEach((i) => {
            if (
              ts.isImportDeclaration(i.parent) &&
              ts.isStringLiteral(i.parent.moduleSpecifier)
            ) {
              if (
                i.parent.importClause &&
                i.parent.importClause.namedBindings &&
                i.parent.moduleSpecifier &&
                ts.isStringLiteral(i.parent.moduleSpecifier) &&
                ts.isNamespaceImport(i.parent.importClause.namedBindings)
              ) {
                const type = checker.getTypeAtLocation(
                  i.parent.importClause.namedBindings
                )
                if (type.symbol.exports) {
                  const modulePath = i.parent.moduleSpecifier.text

                  checker.getExportsOfModule(type.symbol).forEach((exportedSymbol) => {
                    exportedSymbol.declarations?.forEach((declaration) => {
                      if (
                        ts.isBindingElement(declaration) ||
                        ts.isVariableDeclaration(declaration)
                      ) {
                        initialScope.setInModule(
                          checker.getTypeAtLocation(declaration),
                          declaration.symbol ? declaration.symbol.getJsDocTags() : [],
                          modulePath,
                          factory.createIdentifier(exportedSymbol.name)
                        )
                      }
                    })
                  })
                }
              } else {
                const modulePath = i.parent.moduleSpecifier.text

                collectExportsOfModule(sourceFile, modulePath).forEach(
                  ({ name, tags, type }) => {
                    initialScope.setInModule(type, tags, modulePath, name)
                  }
                )
              }
            }
          })
        }

        function collectExportsOfModule(
          parentSource: ts.SourceFile,
          importPath: string
        ): { name: ts.Identifier; type: ts.Type; tags: ts.JSDocTagInfo[] }[] {
          const importBasePath = path
            .join(parentSource.fileName, "../", importPath)
            .replace(/\.(js|jsx|d\.ts|ts)$/, "")

          const importSource = _program
            .getSourceFiles()
            .find((s) => s.fileName.startsWith(importBasePath))!

          const exported: {
            name: ts.Identifier
            type: ts.Type
            tags: ts.JSDocTagInfo[]
          }[] = []

          importSource.statements.forEach((s) => {
            if (
              ts.isVariableStatement(s) &&
              s.modifiers &&
              s.modifiers.length === 1 &&
              s.modifiers[0].kind === ts.SyntaxKind.ExportKeyword
            ) {
              s.declarationList.declarations.forEach((dec) => {
                if (
                  ts.isObjectBindingOrAssignmentPattern(dec.name) ||
                  ts.isArrayBindingPattern(dec.name)
                ) {
                  dec.name.elements.forEach((element) => {
                    if (
                      !ts.isOmittedExpression(element) &&
                      ts.isIdentifier(element.name)
                    ) {
                      exported.push({
                        name: element.name,
                        type: checker.getTypeAtLocation(element),
                        tags: element.symbol ? element.symbol.getJsDocTags() : []
                      })
                    }
                  })
                } else {
                  exported.push({
                    name: dec.name,
                    type: checker.getTypeAtLocation(dec.name),
                    tags: dec.symbol ? dec.symbol.getJsDocTags() : []
                  })
                }
              })
            }
            if (
              ts.isExportDeclaration(s) &&
              !s.exportClause &&
              !s.isTypeOnly &&
              s.moduleSpecifier &&
              ts.isStringLiteral(s.moduleSpecifier)
            ) {
              exported.push(
                ...collectExportsOfModule(importSource, s.moduleSpecifier.text)
              )
            }
          })

          return exported
        }

        const processed = ts.visitNode(
          sourceFile,
          scopedVisitor(initialScope, undefined)
        )

        const imports: ts.ImportDeclaration[] = []

        importMap.map.forEach((id, mod) => {
          imports.push(
            factory.createImportDeclaration(
              undefined,
              undefined,
              factory.createImportClause(
                false,
                undefined,
                factory.createNamespaceImport(id)
              ),
              factory.createStringLiteral(mod)
            )
          )
        })

        return factory.updateSourceFile(
          processed,
          [...imports, ...processed.statements],
          processed.isDeclarationFile,
          processed.referencedFiles,
          processed.typeReferenceDirectives,
          processed.hasNoDefaultLib,
          processed.libReferenceDirectives
        )
      }
    }
  }
}

function reportError(sourceFile: ts.SourceFile, node: ts.Node, type: ts.Type): never {
  const { character, line } = ts.getLineAndCharacterOfPosition(
    sourceFile,
    node.getStart()
  )
  throw new Error(
    `unsupported derivation at: ${sourceFile.fileName}:${line + 1}:${
      character + 1
    } cannot resolve ${type.checker.typeToString(type)}`
  )
}
