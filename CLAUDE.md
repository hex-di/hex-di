# Project Rules for Claude Code

## Type Safety

- **Never use `any` type** - Use `unknown` with type guards, generics, or proper interfaces
- **Never use type casting** (`as X`) - This includes `as any`, `as unknown`, `as never`, and ALL other casts. Fix the underlying type issue instead
- **Never use `eslint-disable` comments** - Fix the code to comply with rules
- **Never use non-null assertions** (`!`) - Use proper null checks or optional chaining
- **Maximum type inference** - Let TypeScript infer types wherever possible. Only add explicit annotations when inference fails or for public API clarity

## Handling TypeScript Errors

When encountering TypeScript errors:

1. **Understand the root cause** - Never use casts to silence errors. Investigate why TypeScript is complaining
2. **Fix at the source** - If a type is wrong, fix the type definition, not the usage site
3. **Use type-level programming** - Leverage conditional types, mapped types, and generics to express constraints properly
4. **Consult architecture** - Type errors often reveal architectural issues. Consider if the design needs adjustment
5. **Test type changes** - Run `pnpm typecheck` and `pnpm test:types` to verify type-level changes don't break downstream code

## Code Quality

- **Always use `const`** for variables that are never reassigned
- **No unused variables** - Remove or prefix with `_` if intentionally unused
- **Explicit return types** for public functions

## ESLint

Each package has its own `eslint.config.js`. Run lint before committing:

```bash
pnpm lint        # Lint all packages
pnpm lint:fix    # Auto-fix where possible
```

## Testing

Test files have relaxed lint rules - `any` types are allowed for mocking flexibility.

## Architecture

This is a monorepo using pnpm workspaces and Turborepo. Each package:

- Has its own `eslint.config.js` extending the root shared config
- Has its own `tsconfig.json` extending the root config
- Can be linted independently with `pnpm --filter @hex-di/<package> lint`
