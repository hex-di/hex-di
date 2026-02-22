# HexDiAsyncContainerProvider

Use `HexDiAsyncContainerProvider` when the container has async adapters and you want React to manage
initialization. It calls `container.initialize()` internally and renders loading/error/ready states.

## Compound component pattern (recommended)

```tsx
import { HexDiAsyncContainerProvider } from "@hex-di/react";

// Pass the UNINITIALIZED container — the provider calls initialize() internally
const container = createContainer({ graph: appGraph, name: "App" });

function Root() {
  return (
    <HexDiAsyncContainerProvider container={container}>
      <HexDiAsyncContainerProvider.Loading>
        <Spinner />
      </HexDiAsyncContainerProvider.Loading>

      <HexDiAsyncContainerProvider.Error>
        {(error) => <ErrorScreen message={error.message} />}
      </HexDiAsyncContainerProvider.Error>

      <HexDiAsyncContainerProvider.Ready>
        <App />  {/* only rendered after initialize() resolves */}
      </HexDiAsyncContainerProvider.Ready>
    </HexDiAsyncContainerProvider>
  );
}
```

## Simple mode (inline fallbacks)

```tsx
<HexDiAsyncContainerProvider
  container={container}
  loadingFallback={<Spinner />}
  errorFallback={(err) => <ErrorScreen message={err.message} />}
>
  <App />
</HexDiAsyncContainerProvider>
```

- Pass the container **before** calling `initialize()` — the provider owns initialization
- `HexDiAsyncContainerProvider` only accepts root containers (type enforced — child containers have no `initialize()`)
- Children inside `.Ready` are only mounted after initialization completes
- `.Error` children support both static nodes and render-prop `(error) => ReactNode`
