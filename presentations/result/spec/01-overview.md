# Result Presentation - Overview

## Mission

An interactive presentation built as a React application that introduces HexDI to 3-5 year experienced developers through a **storytelling narrative** centered on the Result library. The presentation transforms familiar pain points (try/catch chaos, untyped errors, silent failures) into a compelling case for typed error handling and, by extension, the entire HexDI ecosystem.

## Target Audience

**Mid-level developers (3-5 years experience)** who:

- Write TypeScript daily in a professional setting
- Have experienced the pain of debugging untyped errors in production
- Are familiar with React, async/await, and API integration patterns
- Have seen try/catch blocks grow out of control in real codebases
- May have heard of "functional error handling" but haven't adopted it
- Work in a Sanofi engineering context with existing codebases

## Presentation Format

- **Medium**: Interactive React SPA (not static slides)
- **Duration**: ~30-40 minutes of content, self-paced navigation
- **Tone**: Conversational but technically rigorous, no condescension
- **Style**: Code-first storytelling - every concept introduced through real code

## Key Objectives

1. **Recognition**: Audience sees their own code pain in the "before" examples
2. **Understanding**: They grasp _why_ exceptions are problematic, not just _that_ they are
3. **Adoption path**: They leave knowing the exact API to start using `@hex-di/result`
4. **Ecosystem awareness**: They understand Result is one piece of a larger self-aware application vision
5. **Practical takeaway**: They can refactor a try/catch block into Result pattern immediately after

## What This Presentation Is NOT

- Not a deep dive into category theory or monads
- Not a comparison of every error handling library
- Not a sales pitch - it's an honest technical narrative
- Not a tutorial on installing HexDI (that's a separate guide)

## Story Arc Summary

The presentation follows a **three-act structure**:

1. **Act 1 - The Problem**: Show real code from Sanofi projects that suffers from error handling anti-patterns. Build recognition and frustration.
2. **Act 2 - The Solution**: Introduce Result as the fix, walk through the API with before/after transformations of the real code shown in Act 1.
3. **Act 3 - The Vision**: Zoom out to show how Result connects to the broader HexDI ecosystem (Store, Query, Saga, Flow, Tracing, Logger) creating self-aware applications.

## Technology Stack

The presentation app itself demonstrates HexDI in action:

| Concern          | HexDI Library                                        | Purpose in Presentation                |
| ---------------- | ---------------------------------------------------- | -------------------------------------- |
| Navigation state | `@hex-di/flow`                                       | Slide transitions as a state machine   |
| Slide content    | `@hex-di/store`                                      | Reactive slide data and code examples  |
| Code fetching    | `@hex-di/query`                                      | Fetch and cache code snippets          |
| Error demos      | `@hex-di/result`                                     | Live error handling demonstrations     |
| Logging          | `@hex-di/logger`                                     | Console logging of presentation events |
| Diagnostics      | `@hex-di/tracing`                                    | Trace slide navigation for demo        |
| DI container     | `@hex-di/core` + `@hex-di/runtime` + `@hex-di/graph` | Wire everything together               |
| React layer      | `@hex-di/react`                                      | Provider and hooks integration         |
