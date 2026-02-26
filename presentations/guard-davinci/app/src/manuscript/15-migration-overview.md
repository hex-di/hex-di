# Migration Path

5-step incremental migration:

1. Bootstrap Guard — install @hex-di/guard and define permission tokens + roles
2. Define Guard policies centrally (replacing derivePermissions)
3. Create subject adapter from /user/me response
4. Replace useUserStore checks with useCan hook
5. Add route-level protection with GuardedRoute
