# Specification: TaskFlow Project Management Dashboard

## Goal

Integrate all five @hex-di/flow examples (modal-flow, form-flow, wizard-flow, zustand-integration, react-query-integration) into a cohesive "TaskFlow" project management dashboard within the existing react-showcase, demonstrating HexDI and HexDI Flow patterns through a unified application with React Router controlled by state machines.

## User Stories

- As a developer exploring HexDI, I want to see all flow patterns working together in a realistic application so that I understand how to integrate them in production scenarios.
- As a user of TaskFlow, I want to manage tasks through an intuitive dashboard with multi-step onboarding, validated forms, and confirmation modals so that my workflow is efficient and error-resistant.

## Specific Requirements

**R1: Single Application Architecture**

- Integrate all five examples into the existing `examples/react-showcase` as navigable routes
- Use React Router DOM for navigation between sections (Dashboard, New Task, Settings, Onboarding)
- Implement a hybrid container strategy: root container for shared services, example-specific child containers for feature adapters
- All containers must be visible in DevTools via InspectorPlugin integration

**R2: Route State Machine Integration**

- Create a navigation state machine that controls React Router transitions
- Routes become states: `dashboard.idle`, `taskDetail.viewing`, `newTask.form`, `settings.general`, `onboarding.step1`
- Implement type-safe transitions: `NAVIGATE_TO_TASK`, `NAVIGATE_TO_SETTINGS`, `CREATE_TASK`, `LOGOUT`
- Add route guards for protected routes (onboarding only for new users, settings requires authentication)
- Synchronize URL changes with state machine transitions bidirectionally

**R3: Dashboard View with React Query Integration**

- Display task list fetched via React Query with loading/error states
- Implement stats cards showing TODO, In Progress, Done, and Due Today counts
- Add filter controls (Status, Priority, Project) using Zustand for filter state
- Support pagination with page state managed in URL query params
- Include empty state UI when no tasks match filters

**R4: Task Creation Form Flow**

- Implement multi-step task creation form using form-flow pattern
- Step 1: Basic Info (Title, Description, Project, Priority)
- Step 2: Assignment (Assignee selection)
- Step 3: Due Date and Labels
- Add real-time field validation with error, warning, and success states
- Include progress indicator showing current step and completion percentage

**R5: Onboarding Wizard Flow**

- Implement three-step onboarding wizard using wizard-flow pattern
- Step 1: Profile Setup (Display Name, Role, Profile Picture)
- Step 2: Team Creation/Join (Create new team or join via invite code)
- Step 3: Preferences (Theme, Notifications, Default View)
- Add step progress indicator with visual completion markers
- Include skip functionality for optional steps
- Guard route: redirect returning users away from onboarding

**R6: Modal Flow Patterns**

- Implement confirmation modal for destructive actions (Delete Task, Archive Project)
- Create quick edit modal for inline task editing (Title, Status, Priority, Assignee)
- Support modal stacking for nested confirmations
- Add animation states: opening, open, closing, closed
- Include notification modals: Success, Warning, Error with auto-dismiss

**R7: Zustand Global State Integration**

- Manage sidebar collapse/expand state with persistence
- Store user preferences: theme (light/dark/system), accent color, compact mode
- Track filter selections across dashboard sessions
- Coordinate with Flow machines for UI state that needs workflow awareness

**R8: Sidebar Navigation Layout**

- Implement expandable/collapsible sidebar with icon-only collapsed state
- Show navigation items: Dashboard, New Task, Projects, Team, Settings
- Display current flow state and active container in sidebar footer
- Add DevTools toggle button in sidebar
- Support responsive breakpoints: collapse to bottom nav on mobile

**R9: DevTools Full Visibility**

- Register all containers (root, dashboard, task-detail, settings) with DevTools
- Show container hierarchy in DevTools panel
- Display flow state inspector with current state path, context, and available transitions
- Include event history timeline for debugging navigation flow
- Enable real-time state visualization for all active machines

**R10: Responsive Layout Support**

- Desktop (1200px+): Full sidebar + main content + optional DevTools panel
- Tablet (768-1199px): Collapsed sidebar icons + full main content
- Mobile (<768px): Full-width main content + bottom navigation bar
- Modals become full-screen sheets on mobile breakpoint

## Visual Design

**`planning/visuals/layout-wireframes.md`**

- Overall application layout with sidebar navigation and main content area
- Dashboard view with stats cards, filter bar, and paginated task list
- Task list item states: default, hover (shows action buttons), selected, completed
- Empty state design with icon and CTA button
- Route state machine diagram showing navigation flow between states
- Modal overlay patterns with dimmed background
- DevTools panel showing container hierarchy and flow state inspector

**`planning/visuals/component-wireframes.md`**

- Onboarding wizard with three-step progress indicator and form layouts per step
- Task creation form with multi-step progress bar and field validation states
- Modal variations: confirmation (delete/archive), quick edit, notification (success/warning/error)
- Component states: task card (default/hover/selected/completed/loading), buttons (default/hover/loading/disabled/success), input fields (default/focused/filled/error/valid/loading)
- Empty states for task list, search results, and new project
- Loading states: full page spinner, skeleton placeholders, inline progress
- Progress indicators: linear determinate/indeterminate, step progress

## Existing Code to Leverage

**`examples/react-showcase/src/App.tsx` - Root Application Pattern**

- Demonstrates HexDiDevToolsProvider and AsyncContainerProvider setup
- Shows container registration with useRegisterContainer hook
- Provides pattern for root container with TracingPlugin and InspectorPlugin
- Contains child container creation with shared/forked/isolated modes

**`examples/form-flow/src/` - Form Flow State Machine**

- Exports `formMachine` with states: idle, validating, submitting, success, error
- Provides `SignupForm`, `FormStateIndicator`, `FormProgressIndicator` React components
- Includes `ValidationServicePort`, `ApiServicePort`, `FormFlowServicePort`
- Demonstrates multi-step form workflow with context accumulation

**`examples/wizard-flow/src/` - Wizard Flow State Machine**

- Exports `wizardMachine` with states: step1, step2, step3, submitting, complete, error
- Provides `Wizard`, `WizardProgressBar` React components
- Includes guards for conditional transitions between steps
- Shows back/next navigation with step validation

**`examples/modal-flow/src/` - Modal Flow State Machine**

- Exports `modalMachine` with states: closed, opening, open, closing
- Provides `Modal`, `ModalTrigger`, `ModalStateIndicator` React components
- Demonstrates animation spawning/stopping via delay effects
- Includes `AnimationServicePort` for animation timing

**`examples/react-query-integration/src/` - React Query Cache Coordination**

- Exports `todoFlowMachine` for CRUD operation workflow states
- Provides `CacheServicePort` wrapping QueryClient for Effect.invoke access
- Shows mutation coordination with flow via onMutate/onSuccess/onError
- Demonstrates cache invalidation triggered by flow effects

## Out of Scope

- SSR/RSC (Server-Side Rendering/React Server Components) support
- Backend API or database persistence (use mock data/localStorage)
- Real authentication system (mock user state)
- Custom component library beyond existing Tailwind utilities
- Extensive test coverage for showcase code
- Production deployment configuration
- Accessibility audit beyond basic ARIA labels
- Internationalization/localization
- Real-time collaboration features (WebSocket)
- Mobile native app considerations
