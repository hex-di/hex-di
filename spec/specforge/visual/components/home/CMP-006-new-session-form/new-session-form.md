# CMP-006 New Session Form

**ID:** CMP-006-new-session-form
**Context:** Home view -- inline form positioned above the session table for creating a new session.

---

## Overview

The New Session Form is a compact inline form that allows the user to create a new session by providing a package name and spec path. It uses a horizontal flex layout with two text inputs and a submit button. Validation ensures both fields are filled before submission is allowed.

## ASCII Mockup

```
 New Session Form (full width, flex row)
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                                                                             │
 │  ELM-024                    ELM-025                    ELM-026              │
 │  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────┐     │
 │  │ @scope/package-name   │  │ specs/my-spec.md      │  │  Create     │     │
 │  └───────────────────────┘  └───────────────────────┘  └─────────────┘     │
 │  Package Input (flex-grow)  Spec Path Input (flex-grow) Submit (fixed)      │
 │                                                                             │
 │  <──────────── gap: 8px ──────────────>                                     │
 │                                                                             │
 └─────────────────────────────────────────────────────────────────────────────┘

 Disabled state (one or both fields empty):
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────┐     │
 │  │                       │  │                       │  │  Create     │     │
 │  │  (placeholder text)   │  │  (placeholder text)   │  │  (disabled) │     │
 │  └───────────────────────┘  └───────────────────────┘  └─────────────┘     │
 └─────────────────────────────────────────────────────────────────────────────┘
```

## Layout

| Property       | Value      | Notes                                   |
| -------------- | ---------- | --------------------------------------- |
| display        | flex       | Horizontal row layout                   |
| flex-direction | row        | Inputs and button side by side          |
| gap            | 8px        | Consistent spacing between elements     |
| align-items    | flex-start | Top-aligned to accommodate error states |
| width          | 100%       | Full width of parent container          |

## Children

| Element                           | Role                    | Sizing      |
| --------------------------------- | ----------------------- | ----------- |
| ELM-024-new-session-package-input | Package name text input | flex-grow   |
| ELM-025-new-session-spec-input    | Spec path text input    | flex-grow   |
| ELM-026-new-session-submit-button | Submit button           | fixed width |

## Validation

Both fields are required. The submit button is **disabled** when either field is empty (after trimming whitespace).

| Field         | Rule     | Error Message              |
| ------------- | -------- | -------------------------- |
| `packageName` | Required | "Package name is required" |
| `specPath`    | Required | "Spec path is required"    |

## Submit Behavior

1. User fills both `packageName` and `specPath` inputs.
2. Submit button becomes enabled.
3. User clicks submit (or presses Enter while focused on either input).
4. `onCreateSession(packageName, specPath)` callback is invoked.
5. Both input fields are cleared after successful submission.

## Token Usage

| Token             | Usage                    |
| ----------------- | ------------------------ |
| `--sf-surface`    | Input background         |
| `--sf-border`     | Input border             |
| `--sf-text`       | Input text color         |
| `--sf-text-muted` | Placeholder text         |
| `--sf-accent`     | Submit button background |
| `--sf-font-body`  | Input and button text    |

## Cross-References

- **Element:** ELM-024-new-session-package-input (package name input)
- **Element:** ELM-025-new-session-spec-input (spec path input)
- **Element:** ELM-026-new-session-submit-button (form submit)
- **Component:** CMP-005-session-table (sibling on home view)
