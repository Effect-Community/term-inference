import type * as Derive from "../derivation"

export const commonRules: Derive.Rule[] = [
  (context, type) => context.findInScope((_) => _.ref.isAssignableTo(type.ref))
]
