import type {} from "ts-expose-internals"
import * as ts from "typescript"

export default function identity(_program: ts.Program) {
  const checker = _program.getTypeChecker()
  return {
    before(ctx: ts.TransformationContext) {
      const factory = ctx.factory
      return (sourceFile: ts.SourceFile) => {
        const importMap = new Map<string, ts.Identifier>()

        function generateGuard(node: ts.Type, check = true): ts.Expression {
          if (
            node.symbol &&
            node.symbol.declarations &&
            node.symbol.declarations.length === 1 &&
            ts.isInterfaceDeclaration(node.symbol.declarations[0])
          ) {
            const declaration = node.symbol.declarations[0]

            const custom = node.symbol
              .getJsDocTags()
              .filter(
                (x) =>
                  x.name === "ets_macro" && x.text && x.text[0].text.startsWith("guard")
              )
              .map((tag) =>
                tag.text
                  ? `${tag.name} ${tag.text.map((d) => d.text).join(" ")}`
                  : tag.name
              )[0]

            const params: Record<string, ts.Type> = {}

            if (declaration.typeParameters) {
              declaration.typeParameters.forEach((param, idx) => {
                // @ts-expect-error
                params[param.name.text] = node["resolvedTypeArguments"][idx]
              })
            }

            if (custom && check) {
              const matches = custom.match(/^ets_macro guard (.*) from "(.*)"$/)
              if (matches) {
                const matchesCall = matches[1].match(/^(.*?)\(/)

                if (matchesCall) {
                  const method = matchesCall[1]
                  const mod = matches[2]
                  const args = matches[1]
                    .slice(method.length)
                    .replace(/(guard\(|\(|\)| )/g, "")
                    .split(",")
                  const guards = args.map((arg) => generateGuard(params[arg]))

                  let id: ts.Identifier

                  if (importMap.has(mod)) {
                    id = importMap.get(mod)!
                  } else {
                    id = factory.createUniqueName("mod")
                    importMap.set(mod, id)
                  }

                  return factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                      id,
                      factory.createIdentifier(method)
                    ),
                    undefined,
                    guards
                  )
                } else {
                  const method = matches[1]
                  const mod = matches[2]

                  let id: ts.Identifier

                  if (importMap.has(mod)) {
                    id = importMap.get(mod)!
                  } else {
                    id = factory.createUniqueName("mod")
                    importMap.set(mod, id)
                  }

                  return factory.createPropertyAccessExpression(
                    id,
                    factory.createIdentifier(method)
                  )
                }
              }
            }

            return plainInterfaceGuard(
              importMap,
              declaration,
              factory,
              generateGuard,
              checker
            )
          }

          if (node.flags === ts.TypeFlags.String) {
            const mod = "@effect-ts/macros/guards"

            let id: ts.Identifier

            if (importMap.has(mod)) {
              id = importMap.get(mod)!
            } else {
              id = factory.createUniqueName("mod")
              importMap.set(mod, id)
            }

            return factory.createPropertyAccessExpression(
              id,
              factory.createIdentifier("isString")
            )
          }

          return unsupportedGuard(factory)
        }

        function visitor(node: ts.Node): ts.Node {
          if (ts.isCallExpression(node)) {
            const signature = checker.getResolvedSignature(node)

            if (signature) {
              const isGuardMacro =
                signature
                  .getJsDocTags()
                  .findIndex(
                    (tag) =>
                      tag.name === "ets_macro" &&
                      tag.text &&
                      tag.text.findIndex((t) => t.text === "guard") !== -1
                  ) !== -1

              if (isGuardMacro && node.typeArguments?.length === 1) {
                return generateGuard(
                  checker.getTypeFromTypeNode(node.typeArguments[0]),
                  node.arguments.length === 0
                )
              }
            }
          }
          return ts.visitEachChild(node, visitor, ctx)
        }

        const processed = ts.visitNode(sourceFile, visitor)

        const imports: ts.ImportDeclaration[] = []

        importMap.forEach((id, mod) => {
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

function plainInterfaceGuard(
  importMap: Map<string, ts.Identifier>,
  declaration: ts.InterfaceDeclaration,
  factory: ts.NodeFactory,
  generateGuard: (node: ts.Type) => ts.Expression,
  checker: ts.TypeChecker
): ts.Expression {
  const fields: ts.PropertyAssignment[] = []

  declaration.members.forEach((elem) => {
    if (ts.isPropertySignature(elem) && elem.type) {
      fields.push(
        factory.createPropertyAssignment(
          elem.symbol.name,
          generateGuard(checker.getTypeFromTypeNode(elem.type))
        )
      )
    }
  })

  const mod = "@effect-ts/macros/guards"

  let id: ts.Identifier

  if (importMap.has(mod)) {
    id = importMap.get(mod)!
  } else {
    id = factory.createUniqueName("mod")
    importMap.set(mod, id)
  }

  return factory.createCallExpression(
    factory.createPropertyAccessExpression(id, factory.createIdentifier("interface")),
    undefined,
    [factory.createObjectLiteralExpression(fields, true)]
  )
}

function unsupportedGuard(factory: ts.NodeFactory): ts.ArrowFunction {
  return factory.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    factory.createBlock(
      [
        factory.createThrowStatement(
          factory.createNewExpression(factory.createIdentifier("Error"), undefined, [
            factory.createStringLiteral("unsupported")
          ])
        )
      ],
      true
    )
  )
}
