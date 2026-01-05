/**
 * Step 2: Team Setup Component
 *
 * Allows users to create or join a team during onboarding:
 * - Create/Join toggle selection
 * - Create: Team name, description, invite members
 * - Join: Invite code input, available teams list
 *
 * Based on wireframe: planning/visuals/component-wireframes.md Section 1
 *
 * @packageDocumentation
 */

import * as React from "react";
import type { OnboardingTeam, TeamSetupMode } from "../../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the Step2Team component.
 */
export interface Step2TeamProps {
  /** Initial team data */
  readonly initialData: OnboardingTeam;
  /** User's email domain for showing available teams */
  readonly userEmailDomain?: string;
  /** Callback when user submits valid data */
  readonly onNext: (data: OnboardingTeam) => void;
  /** Callback when user clicks Back */
  readonly onBack: () => void;
  /** Callback when user clicks Skip */
  readonly onSkip?: () => void;
  /** Whether Skip button should be shown */
  readonly showSkip?: boolean;
}

/**
 * Mock team for the "Join" section.
 */
interface AvailableTeam {
  readonly id: string;
  readonly name: string;
  readonly memberCount: number;
}

// =============================================================================
// Mock Data
// =============================================================================

/**
 * Mock available teams based on email domain.
 */
const MOCK_AVAILABLE_TEAMS: readonly AvailableTeam[] = [
  { id: "team-1", name: "Engineering", memberCount: 12 },
  { id: "team-2", name: "Design", memberCount: 5 },
  { id: "team-3", name: "Marketing", memberCount: 8 },
];

// =============================================================================
// Validation
// =============================================================================

interface ValidationErrors {
  teamName?: string;
  inviteCode?: string;
}

function validateTeamData(data: OnboardingTeam): ValidationErrors {
  const errors: ValidationErrors = {};

  if (data.mode === "create") {
    if (!data.teamName?.trim()) {
      errors.teamName = "Team name is required";
    } else if (data.teamName.trim().length < 2) {
      errors.teamName = "Team name must be at least 2 characters";
    } else if (data.teamName.trim().length > 50) {
      errors.teamName = "Team name must be less than 50 characters";
    }
  }

  // Note: inviteCode is optional for join mode (user can select from list)

  return errors;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ModeToggleProps {
  readonly mode: TeamSetupMode;
  readonly onChange: (mode: TeamSetupMode) => void;
}

function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Create Team Option */}
      <button
        type="button"
        onClick={() => onChange("create")}
        className={`p-6 border-2 rounded-xl text-center transition-all ${
          mode === "create" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <div
          className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${
            mode === "create" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900">Create New Team</h3>
        <p className="text-sm text-gray-500 mt-1">Start fresh with your own workspace</p>
      </button>

      {/* Join Team Option */}
      <button
        type="button"
        onClick={() => onChange("join")}
        className={`p-6 border-2 rounded-xl text-center transition-all ${
          mode === "join" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <div
          className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${
            mode === "join" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900">Join Existing Team</h3>
        <p className="text-sm text-gray-500 mt-1">Enter an invite code from your team</p>
      </button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Team setup step for the onboarding wizard.
 *
 * @example
 * ```tsx
 * <Step2Team
 *   initialData={{ mode: 'create', teamName: null, teamDescription: null, inviteCode: null }}
 *   onNext={(data) => console.log(data)}
 *   onBack={() => console.log('back')}
 * />
 * ```
 */
export function Step2Team({
  initialData,
  userEmailDomain,
  onNext,
  onBack,
  onSkip,
  showSkip = true,
}: Step2TeamProps): React.ReactElement {
  // Form state
  const [mode, setMode] = React.useState<TeamSetupMode>(initialData.mode);
  const [teamName, setTeamName] = React.useState(initialData.teamName ?? "");
  const [teamDescription, setTeamDescription] = React.useState(initialData.teamDescription ?? "");
  const [inviteCode, setInviteCode] = React.useState(initialData.inviteCode ?? "");
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = React.useState<readonly string[]>([]);
  const [newInviteEmail, setNewInviteEmail] = React.useState("");

  // Validation state
  const [errors, setErrors] = React.useState<ValidationErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: OnboardingTeam = {
      mode,
      teamName: mode === "create" ? teamName.trim() : null,
      teamDescription: mode === "create" ? teamDescription.trim() || null : null,
      inviteCode: mode === "join" ? inviteCode.trim() || null : null,
    };

    const validationErrors = validateTeamData(data);
    setErrors(validationErrors);
    setTouched({ teamName: true, inviteCode: true });

    if (Object.keys(validationErrors).length === 0) {
      onNext(data);
    }
  };

  // Handle field blur
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    const data: OnboardingTeam = {
      mode,
      teamName: mode === "create" ? teamName.trim() : null,
      teamDescription: mode === "create" ? teamDescription.trim() || null : null,
      inviteCode: mode === "join" ? inviteCode.trim() || null : null,
    };
    const validationErrors = validateTeamData(data);
    setErrors(validationErrors);
  };

  // Handle adding invite email
  const handleAddInviteEmail = () => {
    if (newInviteEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newInviteEmail)) {
      setInviteEmails(prev => [...prev, newInviteEmail.trim()]);
      setNewInviteEmail("");
    }
  };

  // Handle removing invite email
  const handleRemoveInviteEmail = (email: string) => {
    setInviteEmails(prev => prev.filter(e => e !== email));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Join or Create Team</h2>
        <p className="mt-2 text-gray-600">Collaborate with your colleagues</p>
      </div>

      {/* Mode Toggle */}
      <ModeToggle mode={mode} onChange={setMode} />

      {/* Create Team Form */}
      {mode === "create" && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Team Name */}
          <div>
            <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              onBlur={() => handleBlur("teamName")}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                touched.teamName && errors.teamName
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300"
              }`}
              placeholder="Acme Engineering"
            />
            {touched.teamName && errors.teamName && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.teamName}
              </p>
            )}
          </div>

          {/* Team Description */}
          <div>
            <label
              htmlFor="teamDescription"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Team Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="teamDescription"
              value={teamDescription}
              onChange={e => setTeamDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              placeholder="Frontend development team"
            />
          </div>

          {/* Invite Members */}
          <div>
            <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Invite Members <span className="text-gray-400">(optional)</span>
            </label>
            <div className="flex space-x-2">
              <input
                id="inviteEmail"
                type="email"
                value={newInviteEmail}
                onChange={e => setNewInviteEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInviteEmail();
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="email@example.com"
              />
              <button
                type="button"
                onClick={handleAddInviteEmail}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Add
              </button>
            </div>
            {inviteEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {inviteEmails.map(email => (
                  <span
                    key={email}
                    className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveInviteEmail(email)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      aria-label={`Remove ${email}`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Join Team Form */}
      {mode === "join" && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Invite Code */}
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
              Invite Code
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              onBlur={() => handleBlur("inviteCode")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono tracking-wider"
              placeholder="ACME-2024-XXXX"
            />
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or select a team</span>
            </div>
          </div>

          {/* Available Teams */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Teams
              {userEmailDomain && (
                <span className="text-gray-400 font-normal"> (from {userEmailDomain})</span>
              )}
            </label>
            <div className="space-y-2">
              {MOCK_AVAILABLE_TEAMS.map(team => (
                <label
                  key={team.id}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedTeamId === team.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="selectedTeam"
                      value={team.id}
                      checked={selectedTeamId === team.id}
                      onChange={() => setSelectedTeamId(team.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-3 font-medium text-gray-900">{team.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{team.memberCount} members</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <div className="flex space-x-3">
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
      </div>
    </form>
  );
}
