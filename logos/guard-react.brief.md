# @hex-di/guard-react

> See [LOGO-BRIEF.md](./LOGO-BRIEF.md) for shared brand context, color family, and technical specs.

## What It Is

React components and hooks for authorization UI: `<Can>` / `<Cannot>` conditional rendering, `useSubject()` hook, `<SubjectProvider>`, integration with React's component tree for permission-based rendering.

## Role & Metaphor

**The Permission Gate in the UI.** Translates abstract guard policies into React's visual vocabulary - "can this user see this button?" becomes a `<Can permission={edit}>` component.

## Key Concepts to Convey

- Authorization decisions rendered as React components
- Conditional visibility (show/hide based on permissions)
- React + Guard fusion
- Can/Cannot branching in UI

## Visual Direction

- The guard shield-hex combined with React's orbital motif
- Or: a shield with React-style orbits around it
- Should reference both guard (shield/red) and React (orbits/blue)

## Signature Colors

- Guard: `#DC2626` (red) for the shield element
- React: `#0EA5E9` (sky blue) for the orbital element

## Designer Prompt

> Design a minimal geometric logo icon (200x200 SVG) of a small shield-hexagon (red #DC2626, filled) at the center serving as a nucleus, surrounded by two elliptical orbital rings (sky blue #0EA5E9, thin stroke, 60-degree rotation). One orbit has a small filled dot (electron). The shield is compact enough to fit within the orbital system. Conveys: "guard authorization integrated into React's component model." No text. Dark background friendly.
