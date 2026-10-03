"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-client";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from "react";

// Profile photo + the header profile menu, shared by the role portals.

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export type ProfileUser = {
  initial: string;
  name: string;
  role: string;
  /** Role colour for the initial avatar. */
  color?: string;
};

type PhotoContext = {
  user: ProfileUser | null;
  settingsHref?: string;
  photo: string;
  error: string;
  /** Validate and store a new profile photo. */
  choose: (file: File | undefined) => void;
  remove: () => void;
};

// The photo lives in localStorage; subscribe to it so every avatar (and other tabs) stay in sync.
const PHOTO_EVENT = "alarm:photo";
function readPhoto(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return ""; // Storage unavailable (private mode).
  }
}
function subscribePhoto(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PHOTO_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PHOTO_EVENT, onChange);
  };
}

const PhotoCtx = createContext<PhotoContext>({
  user: null,
  photo: "",
  error: "",
  choose: () => {},
  remove: () => {},
});

export const useProfile = () => useContext(PhotoCtx);

/**
 * Holds the signed-in user's profile photo. Until the backend exists it is kept in this browser
 * (localStorage, as a data URL) so it survives reloads.
 */
export function ProfileProvider({
  storageKey,
  user,
  settingsHref,
  children,
}: {
  storageKey: string;
  user: ProfileUser;
  settingsHref?: string;
  children: ReactNode;
}) {
  const key = `alarm.photo.${storageKey}`;
  // Kept for this session if storage refuses it (e.g. quota); otherwise read from storage.
  const [sessionPhoto, setSessionPhoto] = useState("");
  const stored = useSyncExternalStore(subscribePhoto, () => readPhoto(key), () => "");
  const photo = sessionPhoto || stored;
  const [error, setError] = useState("");

  const save = (url: string) => {
    try {
      if (url) localStorage.setItem(key, url);
      else localStorage.removeItem(key);
      setSessionPhoto("");
    } catch {
      setSessionPhoto(url); // Too large for storage — keep it for this session only.
    }
    window.dispatchEvent(new Event(PHOTO_EVENT));
  };

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return setError("শুধু JPG, PNG বা WebP ছবি দেওয়া যাবে।");
    if (file.size > PHOTO_MAX_BYTES) return setError("ছবিটি ২ MB-এর বেশি — ছোট ছবি দিন।");
    const reader = new FileReader();
    reader.onload = () => {
      setError("");
      save(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const remove = () => {
    setError("");
    save("");
  };

  return <PhotoCtx.Provider value={{ user, settingsHref, photo, error, choose, remove }}>{children}</PhotoCtx.Provider>;
}

/** The user's avatar: their photo, or their initial on a role-colour tint. */
export function UserAvatar({ className = "", onDark = false }: { className?: string; onDark?: boolean }) {
  const { user, photo } = useProfile();
  if (!user) return null;
  const color = user.color ?? "#006A4E";
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- user-chosen data URL
    return <img src={photo} alt={user.name} className={`flex-none rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full font-semibold ${className}`}
      style={onDark ? { color: "#FFFFFF", background: "rgba(255,255,255,0.16)" } : { color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {user.initial}
    </span>
  );
}

/** Hidden file input wired to the profile photo. Wrap it in a <label>. */
export function PhotoInput() {
  const { choose } = useProfile();
  return (
    <input
      type="file"
      accept={PHOTO_TYPES.join(",")}
      className="sr-only"
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        choose(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );
}

/** Top-right profile button with a dropdown: who you are, settings, log out. */
export function ProfileMenu({ onDark = false }: { onDark?: boolean }) {
  const { user, settingsHref } = useProfile();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const item = "flex w-full cursor-pointer items-center gap-2.5 rounded-button px-3 py-2.5 text-left text-[13px] font-medium hover:bg-surface";

  return (
    <div ref={ref} className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="প্রোফাইল মেনু"
        className={`flex cursor-pointer items-center rounded-full ${onDark ? "" : "ring-offset-2 hover:ring-2 hover:ring-line"}`}
      >
        <UserAvatar className={onDark ? "size-8 text-[13px]" : "size-9 text-[14px]"} onDark={onDark} />
      </button>

      {open && (
        <div role="menu" className="absolute top-full right-0 z-50 mt-2 w-[260px] rounded-card border border-line bg-white p-1.5 text-ink shadow-[0_8px_24px_rgba(13,31,23,0.14)]">
          <div className="flex items-center gap-3 border-b border-line px-3 pt-2 pb-3">
            <UserAvatar className="size-10 text-[15px]" />
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold leading-normal">{user.name}</div>
              <div className="truncate text-[11.5px] leading-normal text-muted">{user.role}</div>
            </div>
          </div>

          <div className="flex flex-col py-1">
            {settingsHref && (
              <Link role="menuitem" href={settingsHref} onClick={() => setOpen(false)} className={item}>
                <MenuIcon d="M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM13 8c0-.4 0-.7-.1-1.1l1.4-1.1-1.4-2.4-1.7.6a5 5 0 0 0-1.9-1.1L9 1.2H7l-.3 1.7a5 5 0 0 0-1.9 1.1l-1.7-.6-1.4 2.4 1.4 1.1a5 5 0 0 0 0 2.2l-1.4 1.1 1.4 2.4 1.7-.6a5 5 0 0 0 1.9 1.1l.3 1.7h2l.3-1.7a5 5 0 0 0 1.9-1.1l1.7.6 1.4-2.4-1.4-1.1c.1-.4.1-.7.1-1.1Z" />
                সেটিংস
              </Link>
            )}
          </div>

          <div className="border-t border-line pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                logout();
                router.replace("/login?signedOut=1");
                router.refresh();
              }}
              className={`${item} w-full cursor-pointer text-left text-danger hover:bg-danger/6`}
            >
              <MenuIcon d="M6.4 2.4H3.6a1 1 0 0 0-1 1v9.2a1 1 0 0 0 1 1h2.8M9.6 5.2 12.8 8l-3.2 2.8M12.6 8H6.2" />
              লগ আউট
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Settings-page avatar: click the photo to choose a new one. */
export function EditableAvatar({ className = "size-14 text-[20px]" }: { className?: string }) {
  const { photo, error } = useProfile();
  return (
    <div className="flex flex-col items-center gap-1">
      <label
        title="ছবি পরিবর্তন করতে ক্লিক করুন · JPG, PNG বা WebP · সর্বোচ্চ ২ MB"
        className="group relative flex-none cursor-pointer rounded-full"
      >
        <UserAvatar className={className} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.4 4.8h11.2v8H2.4zM5.6 4.8l1-1.6h2.8l1 1.6M8 10.6a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="sr-only">{photo ? "প্রোফাইল ছবি পরিবর্তন করুন" : "প্রোফাইল ছবি যোগ করুন"}</span>
        <PhotoInput />
      </label>
      {error && (
        <span role="alert" className="max-w-[160px] text-center text-[11px] font-semibold text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

function MenuIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none">
      <path d={d} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
