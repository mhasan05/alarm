import type { ComponentProps, ReactNode } from "react";

/** 44px input, 4px radius, green focus ring — Design System §05. */
export const inputClass =
  "h-11 w-full rounded-input border border-line bg-white px-[13px] text-[14px] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,106,78,0.10)]";

export const selectClass =
  "h-11 w-full cursor-pointer rounded-input border border-line bg-white px-[11px] font-bn text-[14px] outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,106,78,0.10)] disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-70";

/** Tone of a field's border and helper message after validation. */
export type FieldTone = "idle" | "ok" | "error";

export const toneBorder: Record<FieldTone, string> = {
  idle: "border-line",
  ok: "border-success!",
  error: "border-danger!",
};

export const toneText: Record<FieldTone, string> = {
  idle: "text-muted",
  ok: "text-success",
  error: "text-danger",
};

export function Required() {
  return <span className="text-danger">*</span>;
}

export function Field({
  id,
  label,
  required,
  children,
  hint,
  hintClassName = "text-muted",
}: {
  id?: string;
  label: ReactNode;
  required?: boolean;
  children: ReactNode;
  hint?: ReactNode;
  hintClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="font-bn text-[12.5px] font-semibold leading-[1.6]">
        {label} {required && <Required />}
      </label>
      {children}
      {hint != null && (
        <div id={id ? `${id}-msg` : undefined} className={`font-bn text-[11.5px] leading-[1.65] text-pretty ${hintClassName}`}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function SectionHeader({ num, children }: { num: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line pb-[9px]">
      <span className="text-[11px] font-bold text-muted">{num}</span>
      <h2 className="font-bn text-[15px] font-semibold leading-[1.6]">{children}</h2>
    </div>
  );
}

/** Dashed drop zone for photo / document uploads. With `previewUrl`, shows the chosen image instead. */
export function UploadBox({
  icon,
  title,
  note,
  selected,
  previewUrl,
  onRemove,
  error,
  className = "",
  onChange,
  ...inputProps
}: {
  icon: ReactNode;
  title: ReactNode;
  note: ReactNode;
  /** Name of the chosen file, shown in place of the note. */
  selected?: string;
  /** Object URL of a chosen image to preview. */
  previewUrl?: string;
  onRemove?: () => void;
  /** Validation message shown in place of the note. */
  error?: string;
  className?: string;
} & Omit<ComponentProps<"input">, "type" | "className" | "title">) {
  const input = (
    <input
      type="file"
      className="sr-only"
      onChange={(e) => {
        onChange?.(e);
        // Clear so choosing the same file again still fires onChange.
        e.currentTarget.value = "";
      }}
      {...inputProps}
    />
  );

  if (previewUrl) {
    return (
      <div className={`group relative overflow-hidden rounded-card border-[1.5px] border-line bg-surface ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
        <img src={previewUrl} alt={selected ? `Preview of ${selected}` : "Preview"} className="size-full object-cover" />
        <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center gap-2 bg-ink/65 px-3 py-2 text-white hover:bg-ink/80">
          <span className="min-w-0 flex-1 truncate text-left text-[11.5px] font-semibold">{selected}</span>
          <span className="flex-none font-bn text-[11.5px] font-semibold underline underline-offset-2">বদলান</span>
          {input}
        </label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="ছবি সরান"
            className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink shadow-card hover:bg-white hover:text-danger"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-line bg-surface p-4 text-center hover:border-primary hover:bg-[#EFF7F4] ${
        error ? "border-danger!" : ""
      } ${className}`}
    >
      {icon}
      <span className="font-bn text-[12.5px] font-semibold leading-[1.6] text-primary">{title}</span>
      {error ? (
        <span role="alert" className="font-bn text-[11.5px] font-semibold leading-[1.6] text-danger text-pretty">
          {error}
        </span>
      ) : selected ? (
        <span className="max-w-full truncate text-[11.5px] font-semibold text-success">✓ {selected}</span>
      ) : (
        <span className="font-bn text-[11px] leading-[1.6] text-muted text-pretty">{note}</span>
      )}
      {input}
    </label>
  );
}
