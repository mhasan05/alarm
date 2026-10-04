"use client";

import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { toSafeHtml } from "@/lib/rich-text";

/** Shows a rich-text value (or older plain text) with the same styles everywhere. */
export function RichText({ value, className = "" }: { value: string; className?: string }) {
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: toSafeHtml(value) }} />;
}

type Cmd = { cmd: string; arg?: string; label: string; title: string; state?: string };

const ICON = {
  bold: <path d="M5 3h4.2a2.4 2.4 0 0 1 0 4.8H5zM5 7.8h4.8a2.6 2.6 0 0 1 0 5.2H5z" strokeLinejoin="round" />,
  italic: <path d="M9.6 3H6.4M9.6 13H6.4M8.8 3 7.2 13" strokeLinecap="round" />,
  underline: <path d="M5 3v4.4a3 3 0 0 0 6 0V3M4 13.4h8" strokeLinecap="round" />,
  heading: <path d="M3.6 3v10M9.6 3v10M3.6 8h6M12.2 8.4l1.4-1v5.6" strokeLinecap="round" strokeLinejoin="round" />,
  ul: <path d="M6.4 4.4h6.8M6.4 8h6.8M6.4 11.6h6.8M3.2 4.4h.2M3.2 8h.2M3.2 11.6h.2" strokeLinecap="round" strokeWidth="1.8" />,
  ol: <path d="M6.6 4.4h6.6M6.6 8h6.6M6.6 11.6h6.6M2.8 3.4l.8-.4v2.6M2.6 7.2h1.4L2.6 9h1.6M2.6 10.6h1.4l-.7.8.7.8H2.6" strokeLinecap="round" strokeLinejoin="round" />,
  quote: <path d="M3 4.4h4v4H4.6L3 11V4.4ZM9 4.4h4v4h-2.4L9 11V4.4Z" strokeLinejoin="round" />,
  undo: <path d="M5.4 4.6 3 7l2.4 2.4M3.4 7H10a3 3 0 0 1 0 6H7" strokeLinecap="round" strokeLinejoin="round" />,
  redo: <path d="M10.6 4.6 13 7l-2.4 2.4M12.6 7H6a3 3 0 0 0 0 6h3" strokeLinecap="round" strokeLinejoin="round" />,
  clear: <path d="M4 3.6h8M8 3.6 6.4 12.4M3.4 13.4l9.2-9.2" strokeLinecap="round" />,
};

const GROUPS: (Cmd & { icon: keyof typeof ICON })[][] = [
  [
    { cmd: "bold", label: "B", title: "মোটা লেখা (Ctrl+B)", state: "bold", icon: "bold" },
    { cmd: "italic", label: "I", title: "বাঁকা লেখা (Ctrl+I)", state: "italic", icon: "italic" },
    { cmd: "underline", label: "U", title: "নিচে দাগ (Ctrl+U)", state: "underline", icon: "underline" },
  ],
  [
    { cmd: "formatBlock", arg: "h3", label: "H", title: "শিরোনাম", icon: "heading" },
    { cmd: "insertUnorderedList", label: "•", title: "বুলেট তালিকা", state: "insertUnorderedList", icon: "ul" },
    { cmd: "insertOrderedList", label: "১.", title: "নম্বর দেওয়া তালিকা", state: "insertOrderedList", icon: "ol" },
    { cmd: "formatBlock", arg: "blockquote", label: "❝", title: "উদ্ধৃতি", icon: "quote" },
  ],
  [
    { cmd: "undo", label: "↶", title: "আগের অবস্থায় (Ctrl+Z)", icon: "undo" },
    { cmd: "redo", label: "↷", title: "আবার করুন (Ctrl+Y)", icon: "redo" },
    { cmd: "removeFormat", label: "✕", title: "ফরম্যাট মুছুন", icon: "clear" },
  ],
];

/**
 * A Word-like editor for description fields: bold, italic, underline, heading, lists, quote, undo/redo.
 * The value is safe HTML (see lib/rich-text). Pasted text keeps simple formatting and nothing else.
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  invalid = false,
  minHeight = 160,
  describedBy,
  label,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  invalid?: boolean;
  minHeight?: number;
  describedBy?: string;
  /** Accessible name when there is no <label htmlFor>. */
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [focused, setFocused] = useState(false);

  // Put the value in the editor when it changes from outside (not while typing, to keep the caret).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = toSafeHtml(value);
    if (document.activeElement !== el && el.innerHTML !== html) el.innerHTML = html;
  }, [value]);

  const refreshState = () => {
    const next: Record<string, boolean> = {};
    for (const g of GROUPS) for (const c of g) if (c.state) next[c.state] = document.queryCommandState(c.state);
    setActive(next);
  };
  useEffect(() => {
    if (!focused) return;
    document.addEventListener("selectionchange", refreshState);
    return () => document.removeEventListener("selectionchange", refreshState);
  }, [focused]);

  const emit = () => onChange(ref.current?.innerHTML ?? "");
  const run = (c: Cmd) => {
    ref.current?.focus();
    document.execCommand(c.cmd, false, c.arg);
    emit();
    refreshState();
  };
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertHTML", false, html ? toSafeHtml(html) : toSafeHtml(text));
    emit();
  };
  const empty = !value || toSafeHtml(value) === "";

  return (
    <div className={`overflow-hidden rounded-input border bg-white transition-shadow ${invalid ? "border-danger" : focused ? "border-primary shadow-[0_0_0_3px_rgba(0,106,78,0.10)]" : "border-line"}`}>
      <div role="toolbar" aria-label="লেখার ফরম্যাট" className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface/70 px-1.5 py-1">
        {GROUPS.map((g, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />}
            {g.map((c) => {
              const on = c.state ? active[c.state] : false;
              return (
                <button
                  key={c.title}
                  type="button"
                  title={c.title}
                  aria-label={c.title}
                  aria-pressed={c.state ? on : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => run(c)}
                  className={`flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors ${on ? "bg-primary text-white" : "text-ink/75 hover:bg-white hover:text-primary"}`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    {ICON[c.icon]}
                  </svg>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="relative">
        {empty && placeholder && (
          <span className="pointer-events-none absolute top-3 left-3.5 text-[14px] text-muted" aria-hidden="true">
            {placeholder}
          </span>
        )}
        <div
          id={id}
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onPaste={onPaste}
          onFocus={() => {
            setFocused(true);
            refreshState();
          }}
          onBlur={() => setFocused(false)}
          style={{ minHeight }}
          className="rich-text rich-text-editor max-h-[480px] overflow-y-auto px-3.5 py-3 text-[14px] leading-[1.8] text-ink outline-none"
        />
      </div>
    </div>
  );
}
