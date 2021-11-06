/* eslint-disable no-inner-declarations */
import * as path from "path"
import type {} from "ts-expose-internals"
import * as ts from "typescript"

import * as Derive from "./derivation"

const commonRules: Derive.Rule[] = [
  (context, type) => context.findInScope((_) => _.ref.isAssignableTo(type.ref))
]

const refinementRules: Derive.Rule[] = [
  /**
   * Refinement<A, A>
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
          _.ref.typeStr === "<A, K extends string>() => Refinement<A, Branded<A, K>>"
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
  },
  /**
   * Refinement<A, A & B & C> = Refinement<A, B> compose Refinement<A & B, A & B & C>
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
  },
  /**
   * Refinement<X, X & Brand<Y>>
   */
  (context, type) => {
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
              _.ref.typeStr ===
                "<A, K extends string>() => Refinement<A, Branded<A, K>>"
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
  }
]

const rules = [...commonRules, ...refinementRules]

export default function derivation(_program: ts.Program) {
  const checker = _program.getTypeChecker()

  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory

      return (sourceFile: ts.SourceFile) => {
        const importMap = new Derive.ImportMap(factory)

        function scopedVisitor(
          implicitScope: Derive.ImplicitScope,
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

        const initialScope = new Derive.ImplicitScope(
          rules,
          importMap,
          factory,
          sourceFile
        )

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
