# Port Direction

`direction` reflects the data flow direction in hexagonal architecture.

```typescript
// outbound (default): domain drives infrastructure
// App calls logger, database, HTTP client, etc.
export const LoggerPort = port<Logger>()({
  name: "Logger",
  direction: "outbound",   // app → infrastructure
});

// inbound: infrastructure delivers data into the domain
// Streams, query fetchers, mutation handlers push data in
export const UserQueryPort = createQueryPort<User, UserFilter>({
  name: "UserQuery",
  direction: "inbound",   // infrastructure → domain
});
```

| Direction  | Data flow                    | Examples                          |
|------------|------------------------------|-----------------------------------|
| `outbound` | domain → infrastructure      | Logger, Tracer, Database, Cache   |
| `inbound`  | infrastructure → domain      | Streams, Queries, Mutations       |

- `"outbound"` is the default — omitting `direction` is equivalent to `direction: "outbound"`
- Most infrastructure ports are `outbound`; only use `inbound` when external data is pushed into the domain
- The direction is used by devtools for filtering and visual distinction
