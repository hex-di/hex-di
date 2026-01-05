/**
 * Mock Data Generators for TaskFlow Application
 *
 * Provides realistic sample data for tasks, projects, users, and teams.
 * Includes configurable delays to simulate network latency.
 *
 * @packageDocumentation
 */

import type { Task, TaskPriority, TaskStatus, Project, User, UserRole, Team } from "../types.js";

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default delay range for simulated network calls (in milliseconds).
 */
export const MOCK_DELAY_RANGE = {
  min: 200,
  max: 500,
} as const;

/**
 * Generates a random delay within the configured range.
 */
export function getRandomDelay(
  min: number = MOCK_DELAY_RANGE.min,
  max: number = MOCK_DELAY_RANGE.max
): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Simulates network delay with the specified duration.
 */
export function simulateNetworkDelay(ms?: number): Promise<void> {
  const delay = ms ?? getRandomDelay();
  return new Promise(resolve => setTimeout(resolve, delay));
}

// =============================================================================
// ID Generation
// =============================================================================

let taskIdCounter = 1;
let projectIdCounter = 1;
let userIdCounter = 1;
let teamIdCounter = 1;

/**
 * Resets all ID counters (useful for testing).
 */
export function resetIdCounters(): void {
  taskIdCounter = 1;
  projectIdCounter = 1;
  userIdCounter = 1;
  teamIdCounter = 1;
}

function generateTaskId(): string {
  return `task-${taskIdCounter++}`;
}

function generateProjectId(): string {
  return `proj-${projectIdCounter++}`;
}

function generateUserId(): string {
  return `user-${userIdCounter++}`;
}

function generateTeamId(): string {
  return `team-${teamIdCounter++}`;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// =============================================================================
// Sample Data Pools
// =============================================================================

const TASK_TITLES = [
  "Implement user authentication",
  "Design dashboard layout",
  "Fix navigation bug",
  "Write unit tests for API",
  "Update documentation",
  "Refactor database queries",
  "Add dark mode support",
  "Optimize image loading",
  "Create onboarding flow",
  "Integrate payment gateway",
  "Review pull requests",
  "Set up CI/CD pipeline",
  "Migrate to TypeScript",
  "Implement search functionality",
  "Add export to PDF feature",
  "Create mobile responsive layout",
  "Set up error tracking",
  "Implement caching layer",
  "Add email notifications",
  "Create user settings page",
  "Implement role-based access",
  "Add analytics dashboard",
  "Create API rate limiting",
  "Implement file upload",
  "Add two-factor authentication",
  "Create backup system",
  "Implement real-time updates",
  "Add keyboard shortcuts",
  "Create data visualization",
  "Implement undo/redo feature",
];

const TASK_DESCRIPTIONS = [
  "This task requires careful attention to detail and thorough testing.",
  "Consider edge cases and ensure backward compatibility.",
  "Coordinate with the design team for UI/UX guidelines.",
  "Make sure to document all changes in the changelog.",
  "Performance optimization is a priority for this task.",
  "Security review required before deployment.",
  "Break down into smaller subtasks if needed.",
  "Reference the design specifications in Figma.",
  "Check the API documentation for implementation details.",
  "Ensure accessibility standards are met.",
  null,
  null,
  null,
];

const PROJECT_NAMES = [
  "TaskFlow Core",
  "Mobile App",
  "Marketing Website",
  "Analytics Dashboard",
  "API Platform",
  "Design System",
  "Customer Portal",
  "Admin Console",
  "Developer Tools",
  "Integration Hub",
];

const PROJECT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
];

const USER_NAMES = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Williams",
  "David Brown",
  "Eva Martinez",
  "Frank Anderson",
  "Grace Taylor",
  "Henry Wilson",
  "Ivy Thomas",
  "Jack Garcia",
];

const USER_ROLES: UserRole[] = ["developer", "designer", "manager", "admin", "viewer"];

const TASK_LABELS = [
  "bug",
  "feature",
  "enhancement",
  "documentation",
  "testing",
  "performance",
  "security",
  "accessibility",
  "design",
  "infrastructure",
  "urgent",
  "blocked",
  "review-needed",
];

// =============================================================================
// Data Generators
// =============================================================================

/**
 * Generates a random item from an array.
 */
function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a random subset of items from an array.
 */
function randomSubset<T>(arr: readonly T[], minCount: number, maxCount: number): readonly T[] {
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generates a random date within a range.
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generates a random due date (past, today, future, or null).
 */
function randomDueDate(): Date | null {
  const chance = Math.random();
  if (chance < 0.2) return null; // 20% no due date

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (chance < 0.35) {
    // 15% overdue (past 14 days)
    const daysAgo = Math.floor(Math.random() * 14) + 1;
    return new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  }

  if (chance < 0.5) {
    // 15% due today
    return today;
  }

  // 50% future (next 30 days)
  const daysAhead = Math.floor(Math.random() * 30) + 1;
  return new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
}

/**
 * Generates a single mock user.
 */
export function generateUser(overrides: Partial<User> = {}): User {
  const id = generateUserId();
  const displayName = randomItem(USER_NAMES);
  const email = `${displayName.toLowerCase().replace(" ", ".")}@taskflow.dev`;

  return {
    id,
    displayName,
    email,
    role: randomItem(USER_ROLES),
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
    bio: Math.random() > 0.5 ? "Passionate about building great products." : null,
    isNewUser: false,
    createdAt: randomDate(new Date("2023-01-01"), new Date()),
    ...overrides,
  };
}

/**
 * Generates an array of mock users.
 */
export function generateUsers(count: number): readonly User[] {
  return Array.from({ length: count }, () => generateUser());
}

/**
 * Generates a single mock team.
 */
export function generateTeam(memberIds: readonly string[], overrides: Partial<Team> = {}): Team {
  const id = generateTeamId();

  return {
    id,
    name: `Team ${id.replace("team-", "")}`,
    description: Math.random() > 0.5 ? "A collaborative team working on exciting projects." : null,
    memberIds,
    inviteCode: generateInviteCode(),
    createdAt: randomDate(new Date("2023-01-01"), new Date()),
    ...overrides,
  };
}

/**
 * Generates a single mock project.
 */
export function generateProject(teamId: string, overrides: Partial<Project> = {}): Project {
  const id = generateProjectId();
  const index = (parseInt(id.replace("proj-", ""), 10) - 1) % PROJECT_NAMES.length;

  return {
    id,
    name: PROJECT_NAMES[index],
    description: Math.random() > 0.3 ? "A project description goes here." : null,
    color: PROJECT_COLORS[index % PROJECT_COLORS.length],
    teamId,
    isArchived: Math.random() < 0.1, // 10% archived
    createdAt: randomDate(new Date("2023-01-01"), new Date()),
    ...overrides,
  };
}

/**
 * Generates an array of mock projects.
 */
export function generateProjects(teamId: string, count: number): readonly Project[] {
  return Array.from({ length: count }, () => generateProject(teamId));
}

/**
 * Generates a single mock task.
 */
export function generateTask(
  projectId: string,
  assigneeId: string | null,
  overrides: Partial<Task> = {}
): Task {
  const id = generateTaskId();
  const titleIndex = (parseInt(id.replace("task-", ""), 10) - 1) % TASK_TITLES.length;
  const createdAt = randomDate(new Date("2023-06-01"), new Date());

  const priorities: TaskPriority[] = ["high", "medium", "low"];
  const statuses: TaskStatus[] = ["todo", "in-progress", "done"];

  return {
    id,
    title: TASK_TITLES[titleIndex],
    description: randomItem(TASK_DESCRIPTIONS),
    priority: randomItem(priorities),
    status: randomItem(statuses),
    dueDate: randomDueDate(),
    projectId,
    assigneeId,
    labels: randomSubset(TASK_LABELS, 0, 3),
    createdAt,
    updatedAt: randomDate(createdAt, new Date()),
    ...overrides,
  };
}

/**
 * Generates an array of mock tasks distributed across projects and users.
 */
export function generateTasks(
  projectIds: readonly string[],
  userIds: readonly string[],
  count: number
): readonly Task[] {
  const assigneeOptions = [...userIds, null, null]; // Add null options for unassigned

  return Array.from({ length: count }, () => {
    const projectId = randomItem(projectIds);
    const assigneeId = randomItem(assigneeOptions);
    return generateTask(projectId, assigneeId);
  });
}

// =============================================================================
// Complete Mock Data Set
// =============================================================================

/**
 * Complete mock data set for the TaskFlow application.
 */
export interface MockDataSet {
  readonly users: readonly User[];
  readonly teams: readonly Team[];
  readonly projects: readonly Project[];
  readonly tasks: readonly Task[];
}

/**
 * Generates a complete mock data set.
 *
 * @param options - Configuration for data generation
 * @returns Complete mock data set
 *
 * @example
 * ```typescript
 * const data = generateMockDataSet({
 *   userCount: 8,
 *   projectCount: 6,
 *   taskCount: 50,
 * });
 * ```
 */
export function generateMockDataSet(
  options: {
    readonly userCount?: number;
    readonly projectCount?: number;
    readonly taskCount?: number;
  } = {}
): MockDataSet {
  const { userCount = 8, projectCount = 6, taskCount = 50 } = options;

  // Reset counters for consistent data
  resetIdCounters();

  // Generate users
  const users = generateUsers(userCount);
  const userIds = users.map(u => u.id);

  // Generate a team with all users
  const team = generateTeam(userIds, {
    name: "Engineering",
    description: "The core engineering team",
  });
  const teams = [team];

  // Generate projects
  const projects = generateProjects(team.id, projectCount);
  const projectIds = projects.map(p => p.id);

  // Generate tasks
  const tasks = generateTasks(projectIds, userIds, taskCount);

  return {
    users,
    teams,
    projects,
    tasks,
  };
}

// =============================================================================
// Default Mock Data Instance
// =============================================================================

/**
 * Default mock data set used by the mock API service.
 * Generates 8 users, 6 projects, and 50 tasks.
 */
export const defaultMockData = generateMockDataSet({
  userCount: 8,
  projectCount: 6,
  taskCount: 50,
});
