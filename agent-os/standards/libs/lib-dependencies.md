# Library Dependency Model

All `@hex-di/*` framework packages belong in `peerDependencies`, not `dependencies`.

```json
{
  "peerDependencies": {
    "@hex-di/core": "workspace:*",
    "@hex-di/runtime": "workspace:*",
    "@hex-di/result": "workspace:*"
  },
  "dependencies": {}
}
```

**Third-party peers by sub-package type:**

| Sub-package | Peer dep |
|---|---|
| `react/` | `react: >=18.0.0` |
| `testing/` | `vitest: >=4.0.0` |
| Vendor backend | The vendor package (e.g. `pino: >=8.0.0`) |

- `@hex-di/core` as `dependencies` in saga/query/store is a legacy inconsistency — new libs must use `peerDependencies`
- `sideEffects: false` is required on all lib packages for tree-shaking
- `"type": "module"` is required (ESM-first)
