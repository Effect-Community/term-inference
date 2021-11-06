import * as path from "path"
import type {} from "ts-expose-internals"
import * as ts from "typescript"

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
      this.members.every((m, i) => m.type.ref.isAssignableTo(type.members[i].type.ref))
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
      this.members.every((m, i) => m.type.ref.isAssignableTo(type.members[i].type.ref))
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
      this.members.findIndex((thisMember) => thisMember.ref.isAssignableTo(type)) !== -1
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

export const unsupportedType = (typeStr: string): Type => new UnsupportedTsType(typeStr)

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
      normalized.findIndex((_) => equal(members[i], _)) === -1
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

export type Rule = (context: ResolutionContext, type: TypeNode) => ResolutionResult

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

export class ImportMap {
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

export class InLocal {
  readonly _tag = "InLocal"
  constructor(readonly id: ts.Identifier) {}
}

export class InDerivation {
  readonly _tag = "InDerivation"
  constructor(readonly id: ts.Identifier, readonly expr: () => ts.Expression) {}
  public used = false
}

export class InModule {
  readonly _tag = "InModule"
  constructor(readonly modulePath: string, readonly id: ts.Identifier) {}
}

export interface Config {
  emitTypeComments?: boolean
}

export class ResolutionContext {
  constructor(
    readonly config: Config,
    readonly rules: Rule[],
    readonly scope: (
      | {
          type: TypeNode
          binding: InModule
        }
      | {
          type: TypeNode
          binding: InLocal
        }
      | {
          type: TypeNode
          binding: InDerivation
        }
    )[],
    readonly factory: ts.NodeFactory,
    readonly importMap: ImportMap,
    readonly statementsToAdd: ts.Statement[]
  ) {}

  providing(result: ResolutionResult): ResolutionResult {
    if (result) {
      const derivation = this.factory.createUniqueName("derivation")
      let added = false
      const inDerivation = new InDerivation(derivation, () => {
        inDerivation.used = true
        if (!added) {
          const computed = result.compute()
          const node = this.factory.createVariableStatement(
            undefined,
            this.factory.createVariableDeclarationList(
              [
                this.factory.createVariableDeclaration(
                  derivation,
                  undefined,
                  undefined,
                  computed
                )
              ],
              ts.NodeFlags.Const
            )
          )
          if (this.config.emitTypeComments) {
            ts.addSyntheticLeadingComment(
              node,
              ts.SyntaxKind.SingleLineCommentTrivia,
              " " + stringify(result.type),
              true
            )
          }
          ts.addSyntheticLeadingComment(
            computed,
            ts.SyntaxKind.MultiLineCommentTrivia,
            " #__PURE__ ",
            false
          )
          this.statementsToAdd.push(node)
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

  resolve(type: TypeNode): ResolutionResult {
    for (let i = 0; i < this.rules.length; i++) {
      const impl = this.rules[i](this, type)
      if (impl) {
        return impl
      }
    }
  }

  findInScope(cond: (_: TypeNode) => boolean): ResolutionResult {
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

export interface AddedDerivation {
  type: TypeNode
  binding: InDerivation
}

export class ImplicitScope {
  constructor(
    private config: Config,
    private rules: Rule[],
    private importMap: ImportMap,
    private factory: ts.NodeFactory,
    private sourceFile: ts.SourceFile,
    private module: {
      type: TypeNode
      tags: ts.JSDocTagInfo[]
      binding: InModule
    }[] = [],
    public local: {
      type: TypeNode
      tags: ts.JSDocTagInfo[]
      binding: InLocal
    }[] = []
  ) {}

  child(): ImplicitScope {
    return new ImplicitScope(
      this.config,
      this.rules,
      this.importMap,
      this.factory,
      this.sourceFile,
      this.module,
      Array.from(this.local)
    )
  }

  setInLocal(type: ts.Type, name: ts.Identifier) {
    this.local.push({
      type: fromTs(type),
      tags: type.symbol ? type.symbol.getJsDocTags() : [],
      binding: new InLocal(name)
    })
  }

  setInLocalFromType(type: TypeNode, name: ts.Identifier) {
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
      type: fromTs(type),
      tags,
      binding: new InModule(modulePath, exportName)
    })
  }

  resolveImplementation(
    node: ts.Node,
    type: ts.Type,
    statementsToAdd: ts.Statement[]
  ): readonly [ts.Expression, AddedDerivation[]] {
    const impl = this.resolveImplementationSafe(fromTs(type), statementsToAdd)
    if (impl) {
      return impl
    }
    reportError(this.sourceFile, node, type)
  }

  resolveImplementationSafe(
    type: TypeNode,
    statementsToAdd: ts.Statement[]
  ): readonly [ts.Expression, AddedDerivation[]] | undefined {
    const scope: (
      | {
          type: TypeNode
          tags: ts.JSDocTagInfo[]
          binding: InLocal
        }
      | {
          type: TypeNode
          tags: ts.JSDocTagInfo[]
          binding: InModule
        }
      | AddedDerivation
    )[] = [...this.module, ...this.local]

    scope.reverse()
    const context = new ResolutionContext(
      this.config,
      this.rules,
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

export function reportError(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  type: ts.Type
): never {
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
