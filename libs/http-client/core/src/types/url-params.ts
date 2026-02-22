/**
 * Immutable URL search parameters supporting multi-value params.
 * @packageDocumentation
 */

const URL_PARAMS_SYMBOL: unique symbol = Symbol("UrlParams");

/**
 * Supported input formats for creating UrlParams.
 */
export type UrlParamsInput =
  | Readonly<Record<string, string | number | boolean | ReadonlyArray<string>>>
  | ReadonlyArray<readonly [string, string]>;

/**
 * Immutable URL search parameters stored as ordered tuples.
 * Supports multiple values per key.
 */
export interface UrlParams {
  readonly [URL_PARAMS_SYMBOL]: true;
  readonly entries: ReadonlyArray<readonly [string, string]>;
}

function stringifyValue(value: string | number | boolean): string {
  return String(value);
}

function inputToEntries(
  init: UrlParamsInput,
): ReadonlyArray<readonly [string, string]> {
  if (Array.isArray(init)) {
    return init;
  }
  const entries: Array<readonly [string, string]> = [];
  for (const [key, value] of Object.entries(init)) {
    if (typeof value === "object") {
      for (const v of value) {
        entries.push([key, v]);
      }
    } else {
      entries.push([key, stringifyValue(value)]);
    }
  }
  return entries;
}

/** Create a new UrlParams collection. */
export function createUrlParams(init?: UrlParamsInput): UrlParams {
  const entries = init ? inputToEntries(init) : [];
  return Object.freeze({
    [URL_PARAMS_SYMBOL]: true as const,
    entries: Object.freeze(entries),
  });
}

/** Set a parameter (replaces all existing values for this key). */
export function setParam(
  key: string,
  value: string,
): (params: UrlParams) => UrlParams {
  return (params) => {
    const filtered = params.entries.filter(([k]) => k !== key);
    return createUrlParams([...filtered, [key, value] as const]);
  };
}

/** Append a parameter value (preserves existing values for this key). */
export function appendParam(
  key: string,
  value: string,
): (params: UrlParams) => UrlParams {
  return (params) => createUrlParams([...params.entries, [key, value] as const]);
}

/** Get the first value for a parameter key. */
export function getParam(key: string): (params: UrlParams) => string | undefined {
  return (params) => {
    const entry = params.entries.find(([k]) => k === key);
    return entry?.[1];
  };
}

/** Get all values for a parameter key. */
export function getParamAll(key: string): (params: UrlParams) => readonly string[] {
  return (params) =>
    params.entries.filter(([k]) => k === key).map(([, v]) => v);
}

/** Remove all values for a parameter key. */
export function removeParam(key: string): (params: UrlParams) => UrlParams {
  return (params) => createUrlParams(params.entries.filter(([k]) => k !== key));
}

/** Check if a parameter exists. */
export function hasParam(key: string): (params: UrlParams) => boolean {
  return (params) => params.entries.some(([k]) => k === key);
}

/** Merge two UrlParams (right appends to left). */
export function mergeParams(right: UrlParams): (left: UrlParams) => UrlParams {
  return (left) => createUrlParams([...left.entries, ...right.entries]);
}

/** Serialize to query string (without leading '?'). */
export function toQueryString(params: UrlParams): string {
  return params.entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

/** Parse a query string into UrlParams (strips leading '?'). */
export function fromQueryString(query: string): UrlParams {
  const stripped = query.startsWith("?") ? query.slice(1) : query;
  if (!stripped) return createUrlParams();
  const entries: Array<readonly [string, string]> = stripped
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) return [decodeURIComponent(part), ""] as const;
      return [
        decodeURIComponent(part.slice(0, eqIdx)),
        decodeURIComponent(part.slice(eqIdx + 1)),
      ] as const;
    });
  return createUrlParams(entries);
}
