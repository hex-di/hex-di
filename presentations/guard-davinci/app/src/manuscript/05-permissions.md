# Permission Tokens

Replace DaVinci's string permissions with branded nominal types.

```typescript
import { createPermission, createPermissionGroup } from "@hex-di/guard";

const brand = createPermissionGroup("brand", ["read", "write", "delete", "sync"]);
const content = createPermissionGroup("content", ["read", "write", "approve", "publish"]);
const user = createPermissionGroup("user", ["read", "manage"]);
const run = createPermissionGroup("run", ["read", "readAll"]);
const memory = createPermissionGroup("memory", ["read", "write", "delete", "toggle"]);
```

Each permission is a branded token type — `brand.delete` is a distinct type from `brand.read`.
