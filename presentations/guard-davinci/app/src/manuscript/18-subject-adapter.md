# Subject Adapter

Map `/user/me` response to `createAuthSubject()`. Zustand store becomes a thin adapter.

The adapter extracts role IDs from `{ id, label }` objects, normalizes the rich `allowedContexts` into id-only tuples (`{ brandId, country, indications }`) dropping labels, and derives scope from roles. The full context tuples are passed as a single `allowedContexts` attribute so policies can match on brand, country, indications, or any combination.
