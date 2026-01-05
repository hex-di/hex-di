/**
 * Step 3: Preferences Component
 *
 * Collects user preferences during onboarding:
 * - Theme selection (Light/Dark/System)
 * - Notification toggles (Email, Push, Daily digest)
 * - Default view dropdown (Board/List/Calendar)
 * - Compact mode toggle
 *
 * Based on wireframe: planning/visuals/component-wireframes.md Section 1
 *
 * @packageDocumentation
 */

import * as React from "react";
import type { OnboardingPreferences, Theme, DefaultView } from "../../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the Step3Preferences component.
 */
export interface Step3PreferencesProps {
  /** Initial preferences data */
  readonly initialData: OnboardingPreferences;
  /** Callback when user submits valid data */
  readonly onComplete: (data: OnboardingPreferences) => void;
  /** Callback when user clicks Back */
  readonly onBack: () => void;
  /** Whether the form is submitting */
  readonly isSubmitting?: boolean;
}

// =============================================================================
// Theme Options
// =============================================================================

interface ThemeOption {
  readonly value: Theme;
  readonly label: string;
  readonly icon: React.ReactNode;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

// =============================================================================
// View Options
// =============================================================================

interface ViewOption {
  readonly value: DefaultView;
  readonly label: string;
}

const VIEW_OPTIONS: readonly ViewOption[] = [
  { value: "board", label: "Board (Kanban)" },
  { value: "list", label: "List" },
  { value: "calendar", label: "Calendar" },
];

// =============================================================================
// Sub-Components
// =============================================================================

interface ThemeSelectorProps {
  readonly value: Theme;
  readonly onChange: (theme: Theme) => void;
}

function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {THEME_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex flex-col items-center p-4 border-2 rounded-xl transition-all ${
            value === option.value
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
              value === option.value ? "text-blue-500" : "text-gray-400"
            }`}
          >
            {option.icon}
          </div>
          <span
            className={`text-sm font-medium ${
              value === option.value ? "text-blue-700" : "text-gray-600"
            }`}
          >
            {option.label}
          </span>
          {value === option.value && (
            <div className="mt-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

interface ToggleSwitchProps {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

function ToggleSwitch({ id, label, description, checked, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <label htmlFor={id} className="text-sm font-medium text-gray-900 cursor-pointer">
          {label}
        </label>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? "bg-blue-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Preferences step for the onboarding wizard.
 *
 * @example
 * ```tsx
 * <Step3Preferences
 *   initialData={{
 *     theme: 'system',
 *     emailNotifications: true,
 *     pushNotifications: true,
 *     dailyDigest: false,
 *     defaultView: 'board',
 *     compactMode: false,
 *   }}
 *   onComplete={(data) => console.log(data)}
 *   onBack={() => console.log('back')}
 * />
 * ```
 */
export function Step3Preferences({
  initialData,
  onComplete,
  onBack,
  isSubmitting = false,
}: Step3PreferencesProps): React.ReactElement {
  // Form state
  const [theme, setTheme] = React.useState<Theme>(initialData.theme);
  const [emailNotifications, setEmailNotifications] = React.useState(
    initialData.emailNotifications
  );
  const [pushNotifications, setPushNotifications] = React.useState(initialData.pushNotifications);
  const [dailyDigest, setDailyDigest] = React.useState(initialData.dailyDigest);
  const [defaultView, setDefaultView] = React.useState<DefaultView>(initialData.defaultView);
  const [compactMode, setCompactMode] = React.useState(initialData.compactMode);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: OnboardingPreferences = {
      theme,
      emailNotifications,
      pushNotifications,
      dailyDigest,
      defaultView,
      compactMode,
    };

    onComplete(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Customize Your Experience</h2>
        <p className="mt-2 text-gray-600">Almost there! Final touches</p>
      </div>

      {/* Appearance Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Appearance
        </h3>

        {/* Theme Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
          <ThemeSelector value={theme} onChange={setTheme} />
        </div>

        {/* Compact Mode */}
        <ToggleSwitch
          id="compactMode"
          label="Compact Mode"
          description="Show less whitespace for denser information display"
          checked={compactMode}
          onChange={setCompactMode}
        />
      </div>

      {/* Notifications Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Notifications
        </h3>

        <div className="space-y-1">
          <ToggleSwitch
            id="emailNotifications"
            label="Email Notifications"
            description="Receive email for task assignments and mentions"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />

          <ToggleSwitch
            id="pushNotifications"
            label="Push Notifications"
            description="Browser notifications for real-time updates"
            checked={pushNotifications}
            onChange={setPushNotifications}
          />

          <ToggleSwitch
            id="dailyDigest"
            label="Daily Digest"
            description="Summary email of daily activity"
            checked={dailyDigest}
            onChange={setDailyDigest}
          />
        </div>
      </div>

      {/* Default Views Section */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Default Views
        </h3>

        {/* Default Task View */}
        <div>
          <label htmlFor="defaultView" className="block text-sm font-medium text-gray-700 mb-1">
            Default Task View
          </label>
          <select
            id="defaultView"
            value={defaultView}
            onChange={e => setDefaultView(e.target.value as DefaultView)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
          >
            {VIEW_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Completing...
            </>
          ) : (
            "Complete Setup"
          )}
        </button>
      </div>
    </form>
  );
}
