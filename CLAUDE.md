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

## Error Handling (Rust-Style)

- **Never throw from factory functions** — all construction errors must flow through `Result<T, E>` and the TError channel
- **Each factory has its own construction error type** — factory error types are not shared across factories unless the factories return the exact same error variants (full to full match)
- **Error classification**:
  - Factory construction errors → `Result<T, FactorySpecificError>`
  - Port method runtime errors → `Result<T, E>` (may share types within a service)
  - Framework invariant violations (duplicates, cycles) → compile-time type errors where possible
- **Error types are frozen** — all error objects returned from factories must be `Object.freeze()`d
- **Each error type has a unique `_tag`** — enables pattern matching and discriminated unions

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

## Breaking Changes

- **No backward compatibility** - Always implement the cleanest solution without worrying about backward compatibility
- **Break and change freely** - Remove deprecated code, rename APIs, restructure modules as needed
- **No compatibility shims** - Don't add re-exports, aliases, or wrappers for old APIs
- **Delete over deprecate** - Remove unused/redundant code instead of marking it deprecated

## Git Commits

- **No Co-Authored-By signature** - Do not add the "Co-Authored-By: Claude" line to commit messages

## NEVER DO

never use git stash always try to follow the call chain do not stash the existing code
