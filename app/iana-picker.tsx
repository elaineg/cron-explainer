"use client";

/**
 * IanaPicker — a searchable typeahead combobox over IANA timezone names.
 * Local and UTC are pinned at the top of the list.
 * The component is keyboard-operable (arrow/enter/escape, focus-visible ring).
 *
 * Props:
 *   value     — currently selected IANA tz string, OR "local" / "UTC" sentinel
 *   onChange  — called with the new value ("local", "UTC", or an IANA string)
 *   labelId   — id of the <label> element that labels this picker (aria)
 *   testId    — data-testid on the combobox input
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";

const noopSubscribe = () => () => {};

function getSystemZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

/** Return the human-readable label for a value. */
export function tzLabel(value: string, localTz: string): string {
  if (value === "local") return `Local (${localTz})`;
  return value; // "UTC" or an IANA string
}

interface IanaPickerProps {
  value: string; // "local" | "UTC" | IANA string
  onChange: (v: string) => void;
  labelId?: string;
  testId?: string;
  placeholder?: string;
}

export function IanaPicker({
  value,
  onChange,
  labelId,
  testId,
  placeholder = "Search timezone…",
}: IanaPickerProps) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const localTz = hydrated ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const zones = hydrated ? getSystemZones() : [];

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the full list: Local, UTC pinned at top, then IANA zones (excluding UTC)
  const allOptions: { value: string; label: string }[] = [
    { value: "local", label: `Local (${localTz})` },
    { value: "UTC", label: "UTC" },
    ...zones
      .filter((z) => z !== "UTC")
      .map((z) => ({ value: z, label: z })),
  ];

  const filtered = query.trim()
    ? allOptions.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase())
      )
    : allOptions;

  // The display text in the input: show the current value label when closed
  const displayLabel = hydrated ? tzLabel(value, localTz) : value;

  const closeList = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIdx(-1);
  }, []);

  const selectOption = useCallback(
    (v: string) => {
      onChange(v);
      closeList();
      inputRef.current?.blur();
    },
    [onChange, closeList]
  );

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeList();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closeList]);

  // Scroll active item into view
  useEffect(() => {
    if (!open || activeIdx < 0) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  if (!hydrated) {
    return (
      <div className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
        {value === "local" ? "Local" : value}
      </div>
    );
  }

  const listboxId = `iana-listbox-${testId ?? "picker"}`;

  return (
    <div ref={containerRef} className="relative min-w-0 w-full">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && activeIdx >= 0
            ? `${listboxId}-opt-${activeIdx}`
            : undefined
        }
        aria-labelledby={labelId}
        data-testid={testId}
        type="text"
        value={open ? query : displayLabel}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setActiveIdx(-1);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIdx(-1);
        }}
        onKeyDown={(e) => {
          if (!open) {
            if (e.key === "ArrowDown" || e.key === "Enter") {
              setOpen(true);
              e.preventDefault();
            }
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIdx >= 0 && filtered[activeIdx]) {
              selectOption(filtered[activeIdx].value);
            } else if (filtered.length === 1) {
              selectOption(filtered[0].value);
            }
          } else if (e.key === "Escape") {
            closeList();
          }
        }}
        className="w-full min-w-0 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 outline-none focus:ring-2 focus:ring-blue-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:focus:ring-blue-700"
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Timezone options"
          className="absolute left-0 z-50 mt-1 max-h-52 w-full min-w-[12rem] overflow-y-auto rounded-md border border-zinc-300 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {filtered.map((opt, idx) => (
            <li
              key={opt.value}
              id={`${listboxId}-opt-${idx}`}
              role="option"
              aria-selected={opt.value === value}
              onPointerDown={(e) => {
                e.preventDefault(); // prevent blur before click
                selectOption(opt.value);
              }}
              className={`cursor-pointer px-3 py-1.5 text-xs ${
                idx === activeIdx
                  ? "bg-blue-600 text-white"
                  : opt.value === value
                  ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
