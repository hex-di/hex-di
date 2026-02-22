/**
 * Immutable, case-insensitive HTTP headers collection.
 * @packageDocumentation
 */

const HEADERS_SYMBOL: unique symbol = Symbol("Headers");

/**
 * Immutable, case-insensitive HTTP headers.
 * All keys are stored lowercase. Use combinators to transform.
 */
export interface Headers {
  readonly [HEADERS_SYMBOL]: true;
  readonly entries: Readonly<Record<string, string>>;
}

/** Create a new Headers collection. All keys are normalized to lowercase. */
export function createHeaders(init?: Readonly<Record<string, string>>): Headers {
  const entries: Record<string, string> = {};
  if (init) {
    for (const [key, value] of Object.entries(init)) {
      entries[key.toLowerCase()] = value;
    }
  }
  return Object.freeze({
    [HEADERS_SYMBOL]: true as const,
    entries: Object.freeze(entries),
  });
}

/** Set a header (overwrites existing). Returns new Headers. */
export function setHeader(key: string, value: string): (headers: Headers) => Headers {
  return (headers) => createHeaders({ ...headers.entries, [key.toLowerCase()]: value });
}

/** Append a value to an existing header (comma-separated per RFC 9110 §5.3). Returns new Headers. */
export function appendHeader(key: string, value: string): (headers: Headers) => Headers {
  return (headers) => {
    const k = key.toLowerCase();
    const existing = headers.entries[k];
    const newValue = existing !== undefined ? `${existing}, ${value}` : value;
    return createHeaders({ ...headers.entries, [k]: newValue });
  };
}

/** Get a header value by key (case-insensitive). */
export function getHeader(key: string): (headers: Headers) => string | undefined {
  return (headers) => headers.entries[key.toLowerCase()];
}

/** Check if a header exists (case-insensitive). */
export function hasHeader(key: string): (headers: Headers) => boolean {
  return (headers) => key.toLowerCase() in headers.entries;
}

/** Remove a header by key. Returns new Headers. */
export function removeHeader(key: string): (headers: Headers) => Headers {
  return (headers) => {
    const k = key.toLowerCase();
    const { [k]: _removed, ...rest } = headers.entries;
    return createHeaders(rest);
  };
}

/** Merge two header collections (right wins on conflict). Returns new Headers. */
export function mergeHeaders(right: Headers): (left: Headers) => Headers {
  return (left) => createHeaders({ ...left.entries, ...right.entries });
}

/** Convert headers to a plain Record for transport adapters. */
export function headersToRecord(headers: Headers): Readonly<Record<string, string>> {
  return headers.entries;
}
