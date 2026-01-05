# Requirements: React Showcase Examples Integration

## User Decisions

### 1. Architecture: Single Application

All five examples (modal-flow, form-flow, wizard-flow, zustand-integration, react-query-integration) will be integrated into the existing react-showcase as navigable routes within a single application.

### 2. Router: React Router with HexDI Flow Integration

- Use React Router for navigation
- **Key Innovation**: Control routing with state machine (HexDI Flow)
- Routes become states in a navigation machine
- Transitions between routes are type-safe and traceable

### 3. Layout: Sidebar/Tab Navigation

- Sidebar navigation to switch between sections
- Examples must have **better relations and real useful examples**
- Goal: Demonstrate the **strength of HexDI and HexDI Flow**

### 4. Container Strategy: Hybrid

- Root container provides shared services (logging, tracing, common adapters)
- Example-specific containers extend root with their own adapters
- Matches real-world usage patterns

### 5. Dependencies

- Add whatever libraries are needed
- Confirmed additions: `@tanstack/react-query`, `zustand`, `react-router-dom`

### 6. DevTools Integration

- DevTools should show **everything**
- All containers visible in selector
- Full visibility into all state machines

### 7. Narrative: Cohesive Story

Create a unified application narrative that ties all examples together:

- Not standalone demos
- Real-world use case that naturally uses modals, forms, wizards, Zustand, React Query
- Demonstrates HexDI patterns in a realistic scenario

### 8. Out of Scope

- SSR/RSC support
- Persistence/backend integration
- Custom styling beyond existing Tailwind
- Extensive tests for showcase

---

## Cohesive Narrative Brainstorm

**Proposed Application: "TaskFlow" - A Project Management Dashboard**

A realistic project management app that naturally incorporates all patterns:

| Feature              | Flow Example            | Purpose                                      |
| -------------------- | ----------------------- | -------------------------------------------- |
| **User Onboarding**  | Wizard Flow             | Multi-step profile setup, team creation      |
| **Task Creation**    | Form Flow               | Validated task submission with status states |
| **Quick Actions**    | Modal Flow              | Confirmations, notifications, quick edits    |
| **Global App State** | Zustand Integration     | Theme, sidebar state, user preferences       |
| **Server Data**      | React Query Integration | Tasks list, projects, team members           |
| **Navigation**       | Router + Flow           | Route-as-state, guarded routes, deep linking |

### User Journey:

1. **Landing** → Login/Signup modal
2. **Onboarding Wizard** → Profile, team setup (if new user)
3. **Dashboard** → Task list (React Query), filters (Zustand)
4. **Create Task** → Form flow with validation
5. **Task Actions** → Modal confirmations (delete, archive)
6. **Settings** → Theme toggle (Zustand), profile update (Form)

### Route Structure:

```
/                     → Dashboard (task list)
/onboarding           → Wizard flow (guarded: only for new users)
/tasks/new            → Task creation form
/tasks/:id            → Task detail (with modal actions)
/settings             → User settings
```

---

## Visual Assets Needed

UI/UX expert agents will create:

1. Overall layout wireframe (sidebar + main content)
2. Dashboard view with task list
3. Onboarding wizard steps
4. Task creation form
5. Modal variations (confirm, quick edit)
6. Navigation state diagram

---

## Key Technical Challenges

1. **Router + Flow Integration**: How to make React Router work with state machines
2. **Container Hierarchy**: DevTools visibility across nested containers
3. **Shared State**: Coordinating Zustand global state with Flow machines
4. **Data Flow**: React Query cache invalidation triggered by Flow effects
