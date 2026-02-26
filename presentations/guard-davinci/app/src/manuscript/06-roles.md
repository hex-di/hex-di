# Roles & Inheritance

Map DaVinci's 7 roles to Guard roles with DAG inheritance (writer → manager per scope).

```typescript
const globalWriter = createRole({
  name: "global_content_writer",
  permissions: [brand.read, content.read, content.write, run.read, memory.read],
});

const globalManager = createRole({
  name: "global_content_manager",
  permissions: [...MANAGER_PERMISSIONS],
  inherits: [globalWriter],
});

const admin = createRole({
  name: "admin",
  permissions: [
    /* all permissions explicitly */
  ],
});
```

Cycle detection and permission flattening built in.
