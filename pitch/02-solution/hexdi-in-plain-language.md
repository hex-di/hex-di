# HexDI in Plain Language

> What HexDI is, what it does, and why it matters — explained without a single line of TypeScript.

---

## The Problem It Solves

Imagine you are building a large building. Hundreds of workers are installing pipes, wires, walls, and floors. Each worker knows their section. But nobody has a real-time, accurate blueprint showing exactly what connects to what.

When something goes wrong — water coming through the wrong pipe, electricity taking an unexpected route — you have to trace it manually. You ask the workers who installed it. You look at the original plans, which may be months out of date. You hope the documentation matches the reality.

This is how most software is built today.

HexDI is the solution that makes the blueprint real — generated from the actual building, always accurate, always current.

---

## The Analogy: A Building With a Living Blueprint

In HexDI, every service (every pipe, every wire, every component of your software) declares:
- What it provides (its function)
- What it needs to work (its dependencies)
- How long it should last (singleton: once forever; scoped: once per session; transient: fresh every time)

These declarations are not documentation. They are the code. The software refuses to start if the declarations are wrong. You cannot install a pipe that connects to a socket that doesn't exist. The system tells you immediately, before anything is built, exactly what's missing.

---

## Three Things HexDI Does

### 1. It Makes Bad Connections Impossible

In a regular software project, a developer can accidentally create a circular dependency (Service A needs B, which needs A — a deadlock), or forget to provide a required service, or connect the wrong implementation. These problems might not show up until the software is running in production — sometimes months later.

HexDI moves this check to the moment the code is being written. If the connections are wrong, the code cannot be built. The developer gets an immediate, clear error message telling them exactly what is missing or wrong. No runtime surprise. No production incident.

### 2. It Makes the Architecture Visible and Always Correct

The declarations that each service makes about its connections — what it needs, what it provides — form a complete map of the system. HexDI can generate this map at any time.

The critical difference from a Confluence diagram: this map is generated from the actual running code. It cannot be out of date. It cannot be wrong. If the code builds, the map is correct.

One question that takes weeks to answer manually ("exactly what does Service A connect to, transitively?") takes a single command to answer with HexDI.

### 3. It Makes Rules Into Guarantees

Most software teams have architectural rules: "always go through the data layer when accessing the database," "never call external APIs directly from a business logic component," "all logging must use the approved logging service."

These rules are usually enforced by convention — the team agrees to follow them, senior developers catch violations in code review, documentation reminds people.

With HexDI, the rules become structural constraints. There is no mechanism to bypass a declared boundary. A service that needs the database gets the database through the declared interface, or it does not compile. The rule is not a convention anyone can forget — it is a technical fact.

---

## What Changes for Your Team

**Today:**
- A new developer spends weeks asking "what does this connect to?"
- An AI coding tool generates code that looks right but has wrong connections
- Changing your database technology is a 3-month project
- Proving to an auditor what your system does requires weeks of manual documentation

**With HexDI:**
- A new developer looks at the graph and understands the whole system in one view
- An AI coding tool's output is validated by the compiler before it can be committed
- Changing your database technology means updating one file
- Proving to an auditor what your system does means generating a report from the running system

---

## What It Is Not

HexDI is not:
- A programming language — it works with standard TypeScript
- A framework that takes over your application — you use as much or as little as you need
- A tool that requires a complete rewrite — you can introduce it module by module
- Complicated to learn — the core concepts (declare what you provide, declare what you need) take hours, not weeks

---

## The One-Sentence Summary

HexDI makes your software architecture into a real, living object inside your running system — so that every connection is verified, every boundary is visible, and bad practices are blocked before they can spread.
