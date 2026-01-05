/**
 * Step 1: Profile Setup Component
 *
 * Collects user profile information during onboarding:
 * - Display name (required)
 * - Role dropdown (Developer, Designer, Manager, etc.)
 * - Profile picture upload (optional)
 * - Bio textarea (optional)
 *
 * Based on wireframe: planning/visuals/component-wireframes.md Section 1
 *
 * @packageDocumentation
 */

import * as React from "react";
import type { OnboardingProfile, UserRole } from "../../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the Step1Profile component.
 */
export interface Step1ProfileProps {
  /** Initial profile data */
  readonly initialData: OnboardingProfile;
  /** Current user email (readonly display) */
  readonly email?: string;
  /** Callback when user submits valid data */
  readonly onNext: (data: OnboardingProfile) => void;
  /** Callback when user clicks Skip */
  readonly onSkip?: () => void;
  /** Whether Skip button should be shown */
  readonly showSkip?: boolean;
}

/**
 * Role option for the dropdown.
 */
interface RoleOption {
  readonly value: UserRole;
  readonly label: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Available role options.
 */
const ROLE_OPTIONS: readonly RoleOption[] = [
  { value: "developer", label: "Developer" },
  { value: "designer", label: "Designer" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Product Owner" },
  { value: "viewer", label: "QA Engineer" },
];

// =============================================================================
// Validation
// =============================================================================

interface ValidationErrors {
  displayName?: string;
  role?: string;
}

function validateProfile(data: OnboardingProfile): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.displayName.trim()) {
    errors.displayName = "Display name is required";
  } else if (data.displayName.trim().length < 2) {
    errors.displayName = "Display name must be at least 2 characters";
  } else if (data.displayName.trim().length > 50) {
    errors.displayName = "Display name must be less than 50 characters";
  }

  return errors;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Profile setup step for the onboarding wizard.
 *
 * @example
 * ```tsx
 * <Step1Profile
 *   initialData={{ displayName: '', role: 'developer', avatarUrl: null, bio: null }}
 *   email="john@example.com"
 *   onNext={(data) => console.log(data)}
 * />
 * ```
 */
export function Step1Profile({
  initialData,
  email,
  onNext,
  onSkip,
  showSkip = false,
}: Step1ProfileProps): React.ReactElement {
  // Form state
  const [displayName, setDisplayName] = React.useState(initialData.displayName);
  const [role, setRole] = React.useState<UserRole>(initialData.role);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(initialData.avatarUrl);
  const [bio, setBio] = React.useState(initialData.bio ?? "");

  // Validation state
  const [errors, setErrors] = React.useState<ValidationErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: OnboardingProfile = {
      displayName: displayName.trim(),
      role,
      avatarUrl,
      bio: bio.trim() || null,
    };

    const validationErrors = validateProfile(data);
    setErrors(validationErrors);

    // Mark all fields as touched on submit
    setTouched({ displayName: true, role: true });

    if (Object.keys(validationErrors).length === 0) {
      onNext(data);
    }
  };

  // Handle field blur
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    // Validate on blur
    const data: OnboardingProfile = {
      displayName: displayName.trim(),
      role,
      avatarUrl,
      bio: bio.trim() || null,
    };
    const validationErrors = validateProfile(data);
    setErrors(validationErrors);
  };

  // Handle avatar upload (mock implementation)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real implementation, this would upload to a server
      // For now, create a local object URL
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome to TaskFlow</h2>
        <p className="mt-2 text-gray-600">Let's set up your profile</p>
      </div>

      {/* Avatar Upload */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            )}
          </div>
        </div>
        <label className="mt-3 cursor-pointer">
          <span className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">
            Upload Photo
          </span>
          <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} />
        </label>
      </div>

      {/* Display Name */}
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
          Display Name <span className="text-red-500">*</span>
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          onBlur={() => handleBlur("displayName")}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            touched.displayName && errors.displayName
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : "border-gray-300"
          }`}
          placeholder="John Doe"
        />
        {touched.displayName && errors.displayName && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.displayName}
          </p>
        )}
      </div>

      {/* Email (readonly) */}
      {email && (
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            disabled
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>
      )}

      {/* Role */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          value={role}
          onChange={e => setRole(e.target.value as UserRole)}
          onBlur={() => handleBlur("role")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
        >
          {ROLE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bio (optional) */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          Bio <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
          placeholder="Tell us a bit about yourself..."
          maxLength={200}
        />
        <p className="mt-1 text-xs text-gray-400 text-right">{bio.length}/200 characters</p>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        {showSkip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Skip
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Next
        </button>
      </div>
    </form>
  );
}
