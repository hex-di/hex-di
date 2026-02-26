# Compound Policies

DaVinci's full compound permission matrix modeled as Guard policies.

Permission matrix:

- admin: manageUsers=Y, deleteBrand=Y, syncPromo=Y, manageMemory=Y, viewAllRuns=Y, approve=N
- global-mgr: manageUsers=Y, deleteBrand=N, syncPromo=N, manageMemory=Y, viewAllRuns=N, approve=Y
- local-mgr: manageUsers=Y, deleteBrand=N, syncPromo=N, manageMemory=Y, viewAllRuns=N, approve=Y
- local-writer: all N
