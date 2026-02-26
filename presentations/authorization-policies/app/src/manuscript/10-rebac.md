# 10 — Relationship-Based Access Control (ReBAC)

## Core Concept

Access is derived from relationships between entities in a graph. Instead of asking "Does user X have permission Y?", ReBAC asks "Is there a path from user X to resource Z through defined relationships?"

## Google Zanzibar

Published by Google in 2019, Zanzibar is the system behind Google Drive, YouTube, Google Maps, and Cloud IAM authorization.

## Relationship Tuples

```
<user>    <relation>   <object>
alice     owner        document:budget-2024
alice     member       team:engineering
team:eng  viewer       folder:eng-docs
folder:eng-docs  parent  document:budget-2024

Check: Can alice view document:budget-2024?
→ alice is member of team:engineering
→ team:engineering is viewer of folder:eng-docs
→ folder:eng-docs is parent of document:budget-2024
→ YES (through transitive viewer relation)
```

## Authorization Model

```
type user

type team
  relations
    define member: [user]

type folder
  relations
    define viewer: [user, team#member]
    define editor: [user, team#member]

type document
  relations
    define parent: [folder]
    define viewer: viewer from parent
    define editor: editor from parent
    define owner: [user]
    define can_view: viewer or editor or owner
    define can_edit: editor or owner
```

## Real-World Examples

- **Google Drive**: Shared folders, inherited permissions
- **GitHub**: Org → Team → Repository permission chains
- **Notion**: Workspace → Team → Page hierarchies
- **Discord**: Server → Channel → Role permission graphs

## Strengths

- Natural for hierarchical/collaborative systems
- Handles inheritance elegantly (folder → document)
- Efficient "check" operation (graph traversal)
- Scales to billions of relationships (Zanzibar: 20M+ checks/sec)

## Weaknesses

- Complex to model (relationship schema design)
- "List all resources user can access" is expensive (reverse queries)
- Requires dedicated infrastructure (relationship store)
- Debugging: "Why can/can't user access this?" requires graph tracing
