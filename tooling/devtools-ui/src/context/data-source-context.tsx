/**
 * DataSourceProvider and useDataSource for InspectorDataSource context.
 *
 * Provides InspectorDataSource to all descendant panels and hooks.
 * DevTools wraps its RemoteInspectorAPI in a DataSourceProvider;
 * Playground wraps its PlaygroundInspectorBridge in the same provider.
 * Panels beneath either provider work identically.
 *
 * @packageDocumentation
 */

import { createContext, useContext } from "react";
import type { InspectorDataSource } from "../data/inspector-data-source.js";

/**
 * React Context for the InspectorDataSource.
 *
 * The context value is null when outside a DataSourceProvider.
 * useDataSource checks for null and throws an error.
 *
 * @internal
 */
const DataSourceContext = createContext<InspectorDataSource | null>(null);
DataSourceContext.displayName = "HexDI.DataSourceContext";

/**
 * Props for the DataSourceProvider component.
 */
interface DataSourceProviderProps {
  readonly dataSource: InspectorDataSource;
  readonly children: React.ReactNode;
}

/**
 * Provides InspectorDataSource to all descendant panels and hooks.
 */
function DataSourceProvider(props: DataSourceProviderProps): React.ReactElement {
  return (
    <DataSourceContext.Provider value={props.dataSource}>
      {props.children}
    </DataSourceContext.Provider>
  );
}

/**
 * Access the current InspectorDataSource from context.
 *
 * @throws {Error} If used outside a DataSourceProvider.
 */
function useDataSource(): InspectorDataSource {
  const context = useContext(DataSourceContext);

  if (context === null) {
    throw new Error(
      "useDataSource must be used within a DataSourceProvider. " +
        "Ensure your component is wrapped in a DataSourceProvider component."
    );
  }

  return context;
}

export { DataSourceProvider, useDataSource };
