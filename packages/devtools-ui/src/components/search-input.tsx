/**
 * SearchInput component with debounced onChange and Escape to clear.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface SearchInputProps {
  readonly placeholder?: string;
  readonly value?: string;
  readonly onChange: (value: string) => void;
  readonly debounceMs?: number;
}

/**
 * Search input with debounced value emission and Escape-to-clear.
 */
function SearchInput({
  placeholder = "Search...",
  value: controlledValue,
  onChange,
  debounceMs = 200,
}: SearchInputProps): React.ReactElement {
  const [internalValue, setInternalValue] = useState(controlledValue ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInternalValue(newValue);

      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        setInternalValue("");
        if (timerRef.current !== undefined) {
          clearTimeout(timerRef.current);
        }
        onChange("");
      }
    },
    [onChange]
  );

  return (
    <input
      type="text"
      role="searchbox"
      placeholder={placeholder}
      value={internalValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        width: "100%",
        padding: "var(--hex-space-xs) var(--hex-space-sm)",
        border: isFocused ? "1px solid var(--hex-accent)" : "1px solid var(--hex-border)",
        borderRadius: "var(--hex-radius-sm)",
        backgroundColor: "var(--hex-bg-primary)",
        color: "var(--hex-text-primary)",
        fontFamily: "var(--hex-font-sans)",
        fontSize: "var(--hex-font-size-sm)",
        outline: "none",
        boxShadow: isFocused ? "var(--hex-shadow-focus)" : "none",
        transition:
          "border-color var(--hex-transition-fast), box-shadow var(--hex-transition-fast)",
      }}
    />
  );
}

export { SearchInput };
export type { SearchInputProps };
