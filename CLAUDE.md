# Project Rules for Claude Code

## Type Safety

- **Never use `any` type** - Use `unknown` with type guards, generics, or proper interfaces
- **Never use type casting** (`as any`, `as unknown`, `as never`) - Fix the underlying type issue instead
- **Never use `eslint-disable` comments** - Fix the code to comply with rules
- **Never use non-null assertions** (`!`) - Use proper null checks or optional chaining

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
