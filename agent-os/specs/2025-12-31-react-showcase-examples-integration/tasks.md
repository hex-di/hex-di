# Task Breakdown: TaskFlow Project Management Dashboard

## Overview

Total Tasks: 10 Task Groups with ~80 sub-tasks

This feature integrates all five @hex-di/flow examples (modal-flow, form-flow, wizard-flow, zustand-integration, react-query-integration) into a cohesive "TaskFlow" project management dashboard within the existing react-showcase, demonstrating HexDI and HexDI Flow patterns through a unified application with React Router controlled by state machines.

## Task List

---

### Foundation Layer

#### Task Group 1: Project Setup and Dependencies

**Dependencies:** None

- [x] 1.0 Complete project setup and dependencies
  - [x] 1.1 Write 3-5 focused tests for project configuration
    - Test that required dependencies are installed
    - Test that TypeScript configuration compiles without errors
    - Test that Tailwind configuration is valid
  - [x] 1.2 Install required dependencies
    - Add `react-router-dom` (v6+) for routing
    - Add `@tanstack/react-query` for server state
    - Add `zustand` for client state
    - Verify `@hex-di/flow` is available
  - [x] 1.3 Configure React Router in main entry point
    - Set up BrowserRouter wrapper
    - Create route configuration file
    - Add route type definitions
  - [x] 1.4 Set up React Query provider
    - Create QueryClient with default options
    - Add QueryClientProvider to app tree
    - Configure stale time and cache settings
  - [x] 1.5 Create shared TypeScript types
    - Define Task, Project, User, Team interfaces
    - Define route parameter types
    - Define state machine event types
  - [x] 1.6 Ensure project setup tests pass
    - Run ONLY the 3-5 tests written in 1.1
    - Verify all dependencies install correctly
    - Verify TypeScript compilation succeeds

**Acceptance Criteria:**

- All dependencies installed and configured
- TypeScript compiles without errors
- React Router, React Query, and Zustand providers in place
- Shared types defined for domain entities

---

### State Management Layer

#### Task Group 2: Navigation State Machine

**Dependencies:** Task Group 1

- [x] 2.0 Complete navigation state machine with React Router integration
  - [x] 2.1 Write 4-6 focused tests for navigation state machine
    - Test state transitions between routes (dashboard, newTask, settings, onboarding)
    - Test route guard logic (onboarding guard, auth guard)
    - Test URL synchronization with state changes
    - Test bidirectional sync (URL change triggers state, state change updates URL)
  - [x] 2.2 Create navigation state machine definition
    - States: `idle`, `navigating`, `dashboard`, `taskDetail`, `newTask`, `settings`, `onboarding`
    - Events: `NAVIGATE_TO_DASHBOARD`, `NAVIGATE_TO_TASK`, `NAVIGATE_TO_SETTINGS`, `CREATE_TASK`, `LOGOUT`
    - Context: `currentRoute`, `previousRoute`, `params`, `user`
    - Follow pattern from existing flow examples
  - [x] 2.3 Implement route guards
    - `isNewUser` guard for onboarding route
    - `isAuthenticated` guard for protected routes
    - `taskExists` guard for task detail route
    - Use Effect.invoke for guard evaluation
  - [x] 2.4 Create router synchronization service port
    - Define `RouterServicePort` for navigation effects
    - Implement adapter that wraps React Router's `useNavigate`
    - Handle query parameter serialization
  - [x] 2.5 Build URL-to-state synchronization hook
    - Create `useRouteStateMachine` hook
    - Listen for URL changes and dispatch to machine
    - Listen for state changes and update URL
  - [x] 2.6 Ensure navigation state machine tests pass
    - Run ONLY the 4-6 tests written in 2.1
    - Verify all route transitions work correctly

**Acceptance Criteria:**

- Navigation state machine controls all route transitions
- Route guards prevent unauthorized access
- URL and state are always synchronized
- Type-safe events and transitions

---

#### Task Group 3: Global State with Zustand

**Dependencies:** Task Group 1

- [x] 3.0 Complete Zustand global state integration
  - [x] 3.1 Write 3-5 focused tests for Zustand stores
    - Test sidebar collapse/expand state persistence
    - Test theme switching (light/dark/system)
    - Test filter state management
  - [x] 3.2 Create UI preferences store
    - Sidebar state: `collapsed`, `width`
    - Theme: `light`, `dark`, `system`
    - Accent color selection
    - Compact mode toggle
    - Persist to localStorage
  - [x] 3.3 Create filter state store
    - Status filter: `all`, `todo`, `inProgress`, `done`
    - Priority filter: `all`, `high`, `medium`, `low`
    - Project filter: project ID or `all`
    - Pagination: `page`, `pageSize`
  - [x] 3.4 Create user session store (mock auth)
    - User: `id`, `name`, `email`, `isNewUser`
    - Authentication status: `authenticated`, `unauthenticated`
    - Onboarding completion status
  - [x] 3.5 Integrate Zustand stores with HexDI container
    - Create `ZustandServicePort` for store access
    - Register stores as services in root container
    - Enable DevTools visibility for store state
  - [x] 3.6 Ensure Zustand store tests pass
    - Run ONLY the 3-5 tests written in 3.1
    - Verify persistence works correctly

**Acceptance Criteria:**

- UI preferences persist across sessions
- Filter state is shared across components
- Mock user session available for guards
- Stores visible in DevTools

---

### Data Layer

#### Task Group 4: React Query Data Services

**Dependencies:** Task Group 1, Task Group 3

- [x] 4.0 Complete React Query data layer with mock data
  - [x] 4.1 Write 4-6 focused tests for React Query hooks
    - Test task list fetching with filters
    - Test task creation mutation
    - Test task update mutation
    - Test cache invalidation after mutations
  - [x] 4.2 Create mock data generators
    - Generate 50+ sample tasks with varied statuses, priorities, dates
    - Generate 5-10 sample projects
    - Generate 5-10 sample team members
    - Add realistic delays (200-500ms) to simulate network
  - [x] 4.3 Implement task query hooks
    - `useTaskList(filters)`: Paginated task list with filter support
    - `useTask(id)`: Single task detail
    - `useTaskStats()`: Aggregate counts for dashboard cards
  - [x] 4.4 Implement task mutation hooks
    - `useCreateTask()`: Create with optimistic update
    - `useUpdateTask()`: Update with optimistic update
    - `useDeleteTask()`: Delete with optimistic update
    - `useToggleTaskComplete()`: Toggle completion status
  - [x] 4.5 Create CacheServicePort for HexDI integration
    - Wrap QueryClient for Effect.invoke access
    - Enable cache invalidation from Flow effects
    - Follow pattern from react-query-integration example
  - [x] 4.6 Integrate with flow state machines
    - Trigger mutations on form-flow success
    - Invalidate cache on wizard-flow completion
    - Show loading states during transitions
  - [x] 4.7 Ensure React Query tests pass
    - Run ONLY the 4-6 tests written in 4.1
    - Verify optimistic updates work correctly

**Acceptance Criteria:**

- Mock data provides realistic task management scenario
- React Query handles all server state
- Optimistic updates provide instant feedback
- Cache invalidation coordinated with Flow machines

---

### UI Foundation Layer

#### Task Group 5: Layout and Navigation Components

**Dependencies:** Task Group 2, Task Group 3

- [x] 5.0 Complete layout and navigation UI components
  - [x] 5.1 Write 4-6 focused tests for layout components
    - Test sidebar collapse/expand interaction
    - Test navigation item active state highlighting
    - Test responsive breakpoint behavior
    - Test DevTools toggle functionality
  - [x] 5.2 Create AppLayout component
    - Header with search, user menu, and responsive controls
    - Sidebar slot for navigation
    - Main content area for route outlet
    - Optional DevTools panel slot
    - Match wireframe: `planning/visuals/layout-wireframes.md` Section 1
  - [x] 5.3 Create Sidebar component
    - Expanded state with icon + label
    - Collapsed state with icon only
    - Tooltip on hover in collapsed mode
    - Flow state indicator in footer
    - Container name display
    - Match wireframe: Section 3
  - [x] 5.4 Create NavigationItem component
    - Default, hover, active, and disabled states
    - Icon + label layout
    - Submenu support for Projects
    - Active route highlighting
  - [x] 5.5 Create BottomNavigation component (mobile)
    - Icon-only navigation bar
    - Active state indicator
    - 5-item maximum display
    - Match wireframe: Section 1.3
  - [x] 5.6 Implement responsive breakpoints
    - Desktop (1200px+): Full sidebar + DevTools panel
    - Tablet (768-1199px): Collapsed sidebar icons
    - Mobile (<768px): Bottom navigation bar
    - Match wireframe: Section 10
  - [x] 5.7 Ensure layout component tests pass
    - Run ONLY the 4-6 tests written in 5.1
    - Verify responsive behavior works correctly

**Acceptance Criteria:**

- Sidebar collapses and expands with state persistence
- Navigation highlights current route
- Responsive layout adapts to screen size
- DevTools toggle visible in sidebar

---

### Feature Implementation Layer

#### Task Group 6: Dashboard View with React Query

**Dependencies:** Task Group 4, Task Group 5

- [x] 6.0 Complete dashboard view implementation
  - [x] 6.1 Write 4-6 focused tests for dashboard components
    - Test stats cards display correct counts
    - Test filter bar updates query params
    - Test task list renders with loading/error/empty states
    - Test pagination controls
  - [x] 6.2 Create StatsCards component
    - TODO count card
    - In Progress count card
    - Done count card
    - Due Today count card
    - Loading skeleton state
    - Match wireframe: `planning/visuals/layout-wireframes.md` Section 2.1
  - [x] 6.3 Create FilterBar component
    - Status dropdown filter
    - Priority dropdown filter
    - Project dropdown filter
    - Clear All button
    - Sync with URL query params
    - Match wireframe: Section 2.1
  - [x] 6.4 Create TaskList component
    - Paginated list of TaskCard components
    - Loading skeleton state
    - Error state with retry
    - Empty state with CTA
    - Match wireframe: Section 2.2, 2.3
  - [x] 6.5 Create TaskCard component
    - Default, hover, selected, completed states
    - Priority indicator
    - Due date display
    - Assignee avatar
    - Action buttons on hover (edit, delete, archive)
    - Match wireframe: Section 2.2
  - [x] 6.6 Create Pagination component
    - Previous/Next buttons
    - Page number display
    - Page size selector (optional)
    - Sync with URL query params
  - [x] 6.7 Wire dashboard to React Query
    - Connect StatsCards to `useTaskStats()`
    - Connect TaskList to `useTaskList(filters)`
    - Handle loading, error, and success states
  - [x] 6.8 Ensure dashboard tests pass
    - Run ONLY the 4-6 tests written in 6.1
    - Verify data fetching and display work correctly

**Acceptance Criteria:**

- Dashboard displays task statistics
- Filters update task list in real-time
- Pagination persists in URL
- Empty and loading states handled

---

#### Task Group 7: Modal Flow Integration

**Dependencies:** Task Group 5, Task Group 6

- [x] 7.0 Complete modal flow integration
  - [x] 7.1 Write 4-6 focused tests for modal components
    - Test modal open/close transitions
    - Test confirmation modal callback execution
    - Test quick edit modal form submission
    - Test modal stacking behavior
  - [x] 7.2 Create Modal base component
    - Overlay with backdrop blur/dim
    - Animation states: opening, open, closing, closed
    - Close on escape key
    - Close on backdrop click (configurable)
    - Full-screen sheet variant for mobile
    - Match wireframe: `planning/visuals/layout-wireframes.md` Section 5
  - [x] 7.3 Create ConfirmationModal component
    - Icon slot (warning, danger, info)
    - Title and message
    - Item preview (task name, project info)
    - Cancel and Confirm buttons
    - Danger variant styling
    - Match wireframe: `planning/visuals/component-wireframes.md` Section 3
  - [x] 7.4 Create QuickEditModal component
    - Title field (editable)
    - Status dropdown
    - Priority dropdown
    - Assignee dropdown
    - "Open Full View" link
    - Match wireframe: Section 3
  - [x] 7.5 Create NotificationModal component
    - Success, Warning, Error variants
    - Auto-dismiss timer (configurable)
    - Undo action support
    - Match wireframe: Section 3
  - [x] 7.6 Integrate modal-flow state machine
    - Connect Modal component to `modalMachine`
    - Use AnimationServicePort for timing
    - Spawn animation effects on open/close
  - [x] 7.7 Create useModal hook
    - `openConfirmation(options)`: Opens confirmation modal
    - `openQuickEdit(task)`: Opens quick edit modal
    - `showNotification(options)`: Shows notification
    - Modal stack management for nested confirmations
  - [x] 7.8 Wire modals to task actions
    - Delete task triggers confirmation modal
    - Archive project triggers confirmation modal
    - Task card edit button triggers quick edit modal
    - Mutation success triggers notification modal
  - [x] 7.9 Ensure modal tests pass
    - Run ONLY the 4-6 tests written in 7.1
    - Verify modal flows work correctly

**Acceptance Criteria:**

- Modals animate smoothly on open/close
- Confirmation modals block destructive actions
- Quick edit modal updates tasks inline
- Notifications auto-dismiss appropriately

---

#### Task Group 8: Task Creation Form Flow

**Dependencies:** Task Group 4, Task Group 5, Task Group 7

- [x] 8.0 Complete task creation form flow
  - [x] 8.1 Write 4-6 focused tests for form flow
    - Test form validation on each step
    - Test step navigation (next/back)
    - Test form submission flow (idle -> validating -> submitting -> success/error)
    - Test progress indicator updates
  - [x] 8.2 Create TaskFormProgress component
    - Step indicators (1, 2, 3)
    - Current step highlight
    - Completion percentage bar
    - Breadcrumb-style labels
    - Match wireframe: `planning/visuals/layout-wireframes.md` Section 6.3
  - [x] 8.3 Create Step1BasicInfo component
    - Title field (required, 3+ chars)
    - Description textarea (optional)
    - Project dropdown (required)
    - Priority dropdown (default: Medium)
    - Real-time validation feedback
    - Match wireframe: Section 6.1
  - [x] 8.4 Create Step2Assignment component
    - Assignee dropdown with team members
    - Avatar display for selected assignee
    - "Unassigned" option
  - [x] 8.5 Create Step3DueDateLabels component
    - Due date picker
    - Label multi-select or tag input
    - Attachments dropzone (optional)
  - [x] 8.6 Create FormFieldValidation component
    - Error state: red border, error message
    - Warning state: yellow border, warning message
    - Success state: green border, checkmark
    - Loading state: spinner icon
    - Match wireframe: `planning/visuals/component-wireframes.md` Section 2
  - [x] 8.7 Integrate form-flow state machine
    - Connect form to `formMachine`
    - States: `idle`, `step1`, `step2`, `step3`, `validating`, `submitting`, `success`, `error`
    - Use ValidationServicePort for field validation
    - Use ApiServicePort for submission
  - [x] 8.8 Wire form submission to React Query
    - Call `useCreateTask()` mutation on submit
    - Invalidate task list cache on success
    - Navigate to dashboard on success
    - Show error notification on failure
  - [x] 8.9 Ensure form flow tests pass
    - Run ONLY the 4-6 tests written in 8.1
    - Verify form validation and submission work correctly

**Acceptance Criteria:**

- Multi-step form navigates correctly
- Real-time validation provides feedback
- Form submission creates task via React Query
- Progress indicator shows current step

---

#### Task Group 9: Onboarding Wizard Flow

**Dependencies:** Task Group 2, Task Group 5

- [x] 9.0 Complete onboarding wizard flow
  - [x] 9.1 Write 4-6 focused tests for wizard flow
    - Test step navigation (next/back/skip)
    - Test route guard redirects returning users
    - Test wizard completion sets `isNewUser` flag
    - Test data accumulation across steps
  - [x] 9.2 Create WizardProgress component
    - Three-step indicator with labels (Profile, Team, Preferences)
    - Visual completion markers (checkmark for completed steps)
    - Current step highlight
    - Match wireframe: `planning/visuals/component-wireframes.md` Section 1
  - [x] 9.3 Create Step1Profile component
    - Display name field (required)
    - Role dropdown (Developer, Designer, Manager, etc.)
    - Profile picture upload (optional)
    - Bio textarea (optional)
    - Match wireframe: Section 1
  - [x] 9.4 Create Step2Team component
    - Create/Join toggle selection
    - Create: Team name, description, invite members
    - Join: Invite code input, available teams list
    - Match wireframe: Section 1
  - [x] 9.5 Create Step3Preferences component
    - Theme selection (Light/Dark/System)
    - Notification toggles (Email, Push, Daily digest)
    - Default view dropdown (Board/List/Calendar)
    - Compact mode toggle
    - Match wireframe: Section 1
  - [x] 9.6 Create WizardComplete component
    - Success icon and message
    - Quick start actions
    - "Go to Dashboard" CTA
    - Match wireframe: Section 1
  - [x] 9.7 Integrate wizard-flow state machine
    - Connect wizard to `wizardMachine`
    - States: `step1`, `step2`, `step3`, `submitting`, `complete`, `error`
    - Guards for conditional step skipping
    - Back/Next navigation with validation
  - [x] 9.8 Implement onboarding route guard
    - Check `isNewUser` flag from user session store
    - Redirect returning users to dashboard
    - Redirect new users to onboarding if they navigate away
  - [x] 9.9 Wire wizard completion to stores
    - Update user session store with profile data
    - Update UI preferences store with settings
    - Set `isNewUser` to `false` on completion
    - Navigate to dashboard
  - [x] 9.10 Ensure wizard flow tests pass
    - Run ONLY the 4-6 tests written in 9.1
    - Verify wizard navigation and guards work correctly

**Acceptance Criteria:**

- Three-step wizard collects user profile and preferences
- Skip functionality works for optional steps
- Route guard protects onboarding from returning users
- Completion updates all relevant stores

---

### Integration Layer

#### Task Group 10: DevTools Integration and Final Assembly

**Dependencies:** Task Groups 1-9

- [x] 10.0 Complete DevTools integration and final assembly
  - [x] 10.1 Write 4-6 focused tests for DevTools integration
    - Test all containers visible in DevTools selector
    - Test flow state inspector shows current state
    - Test event history tracks navigation events
    - Test container hierarchy displays correctly
  - [x] 10.2 Create container hierarchy for TaskFlow
    - Root container: logging, tracing, router service, common ports
    - Dashboard container: task services, filter services (shared mode)
    - Task detail container: task mutations (shared mode)
    - Settings container: preferences services (shared mode)
    - Onboarding container: wizard services (isolated mode)
  - [x] 10.3 Register all containers with DevTools
    - Use `useRegisterContainer` hook for each container
    - Provide meaningful names: "root", "dashboard", "task-detail", "settings", "onboarding"
    - Enable InspectorPlugin for all containers
  - [x] 10.4 Create FlowStateInspector component
    - Display current machine state path
    - Show context values
    - List available transitions
    - Event history timeline
    - Match wireframe: `planning/visuals/layout-wireframes.md` Section 8.4
  - [x] 10.5 Create ContainerHierarchy component
    - Tree view of container parent-child relationships
    - Expandable/collapsible nodes
    - Service list per container
    - Match wireframe: Section 8.3
  - [x] 10.6 Integrate DevTools panel into sidebar
    - Toggle button to show/hide DevTools panel
    - Current flow state display in sidebar footer
    - Active container name display
    - Match wireframe: Section 8.1, 8.2
  - [x] 10.7 Assemble complete route structure
    - `/` -> Dashboard view
    - `/tasks/new` -> Task creation form
    - `/tasks/:id` -> Task detail (future extension point)
    - `/settings` -> Settings view
    - `/onboarding` -> Onboarding wizard (guarded)
  - [x] 10.8 Final integration verification
    - Verify navigation state machine controls all routes
    - Verify all modals accessible from dashboard
    - Verify form and wizard flows complete successfully
    - Verify DevTools shows all state and containers
  - [x] 10.9 Ensure DevTools integration tests pass
    - Run ONLY the 4-6 tests written in 10.1
    - Verify all containers and flows visible in DevTools

**Acceptance Criteria:**

- All containers visible in DevTools selector
- Flow state inspector shows live state updates
- Event history tracks all navigation events
- Complete application is navigable and functional

---

### Testing Layer

#### Task Group 11: Test Review and Gap Analysis

**Dependencies:** Task Groups 1-10

- [x] 11.0 Review existing tests and fill critical gaps only
  - [x] 11.1 Review tests from Task Groups 1-10
    - Review the ~4 tests from Task Group 1 (setup) - Found 9 tests
    - Review the ~5 tests from Task Group 2 (navigation) - Found 28 tests
    - Review the ~4 tests from Task Group 3 (Zustand) - Found 5 tests
    - Review the ~5 tests from Task Group 4 (React Query) - Found 8 tests
    - Review the ~5 tests from Task Group 5 (layout) - Found 10 tests
    - Review the ~5 tests from Task Group 6 (dashboard) - Found 15 tests
    - Review the ~5 tests from Task Group 7 (modals) - Found 13 tests
    - Review the ~5 tests from Task Group 8 (form flow) - Found 15 tests
    - Review the ~5 tests from Task Group 9 (wizard) - Found 10 tests
    - Review the ~5 tests from Task Group 10 (DevTools) - Found 16 tests
    - Total existing tests: 129 tests (significantly more than estimated 48)
  - [x] 11.2 Analyze test coverage gaps for THIS feature only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to this spec's feature requirements
    - Do NOT assess entire application test coverage
    - Prioritize end-to-end workflows over unit test gaps
    - Gaps identified: E2E onboarding flow, E2E task creation, E2E task deletion, filter URL sync
  - [x] 11.3 Write up to 10 additional strategic tests maximum
    - End-to-end: New user completes onboarding -> lands on dashboard
    - End-to-end: User creates task via form -> sees it in task list
    - End-to-end: User deletes task via confirmation modal -> task removed
    - Integration: Navigation state machine + React Router sync
    - Integration: Form flow + React Query mutation coordination
    - Added 8 new tests in e2e-integration.test.tsx to fill identified critical gaps
    - Do NOT write comprehensive coverage for all scenarios
    - Skip edge cases unless business-critical
  - [x] 11.4 Run feature-specific tests only
    - Run ONLY tests related to this spec's feature
    - Final total: 137 tests (129 existing + 8 new integration tests)
    - Do NOT run the entire application test suite
    - Verify critical workflows pass - ALL 137 TESTS PASS

**Acceptance Criteria:**

- All feature-specific tests pass (approximately 48-58 tests total)
- Critical user workflows for this feature are covered
- No more than 10 additional tests added when filling in testing gaps
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence:

```
Phase 1: Foundation
  1. Project Setup and Dependencies (Task Group 1)

Phase 2: State Management
  2. Navigation State Machine (Task Group 2) - depends on 1
  3. Global State with Zustand (Task Group 3) - depends on 1

Phase 3: Data Layer
  4. React Query Data Services (Task Group 4) - depends on 1, 3

Phase 4: UI Foundation
  5. Layout and Navigation Components (Task Group 5) - depends on 2, 3

Phase 5: Feature Implementation
  6. Dashboard View (Task Group 6) - depends on 4, 5
  7. Modal Flow Integration (Task Group 7) - depends on 5, 6
  8. Task Creation Form Flow (Task Group 8) - depends on 4, 5, 7
  9. Onboarding Wizard Flow (Task Group 9) - depends on 2, 5

Phase 6: Integration
  10. DevTools Integration and Final Assembly (Task Group 10) - depends on all

Phase 7: Verification
  11. Test Review and Gap Analysis (Task Group 11) - depends on all
```

### Parallel Execution Opportunities

The following task groups can be worked on in parallel:

- **Task Groups 2 & 3**: Both depend only on Task Group 1
- **Task Groups 6, 7, 8, 9**: Once Task Group 5 is complete, these can be parallelized across multiple engineers
- **Task Groups 8 & 9**: These are independent feature implementations that can be built simultaneously

---

## Visual Reference Summary

All wireframes are located in:

- `/Users/mohammadalmechkor/Projects/hex-di/agent-os/specs/2025-12-31-react-showcase-examples-integration/planning/visuals/layout-wireframes.md`
- `/Users/mohammadalmechkor/Projects/hex-di/agent-os/specs/2025-12-31-react-showcase-examples-integration/planning/visuals/component-wireframes.md`

Key wireframe sections referenced:

- Layout wireframes Section 1-3: Overall application layout, sidebar navigation
- Layout wireframes Section 2: Dashboard view with stats, filters, task list
- Layout wireframes Section 4: Route state machine diagrams
- Layout wireframes Section 5-6: Modal and form patterns
- Layout wireframes Section 7: Onboarding wizard
- Layout wireframes Section 8: DevTools panel
- Component wireframes Section 1: Onboarding wizard steps
- Component wireframes Section 2: Task creation form states
- Component wireframes Section 3: Modal variations
- Component wireframes Section 4: Component states (buttons, inputs, cards)

---

## Existing Code to Leverage

Reference implementations from existing examples:

- `examples/react-showcase/src/App.tsx` - Container setup pattern
- `examples/form-flow/src/` - Form state machine and validation
- `examples/wizard-flow/src/` - Multi-step wizard pattern
- `examples/modal-flow/src/` - Modal animation state machine
- `examples/react-query-integration/src/` - React Query + Flow coordination
- `examples/zustand-integration/src/` - Zustand store integration
