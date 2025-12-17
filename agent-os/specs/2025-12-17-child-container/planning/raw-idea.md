# Raw Idea: Child Container

## Feature Description

In the HexDi library we need to introduce the child container. A child container is a container that gets the scope of a parent container so it can consume all the parent container's services and also can override them for its own scope (override only affects the child container, not the parent).
