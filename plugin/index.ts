/* eslint-disable no-inner-declarations */
import * as path from "path"
import type {} from "ts-expose-internals"
import * as ts from "typescript"

import * as Derive from "./derivation"
import { rules } from "./rules"

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
