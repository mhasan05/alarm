"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Logo } from "@/components/brand";
import { HandIcon, MeetingStatusChip, MicIcon, ShareLink, meetingWhen } from "@/components/meetings/meeting-bits";
import { audioTransport } from "@/lib/audio-room";
import { useMe } from "@/lib/auth-client";
import { bn, bnDate, bnTime } from "@/lib/db/format";
import {
  HEARTBEAT_MS,
  accessOf,
  areaLabel,
  activePresence,
  canEnter,
  decideJoin,
  endMeeting,
  enterRoom,
  heartbeat,
  identifyForMeeting,
  leaveRoom,
  meetingByCode,
  participantNames,
  pendingRequests,
  removeFromMeeting,
  requestJoin,
  roleLabel,
  setHand,
  setMuted,
  startMeeting,
  type MeetingIdentity,
} from "@/lib/db/meetings";
import { alarmIdOf, roleOfId } from "@/lib/db/selectors";
import { useDb } from "@/lib/db/store";
import type { Database, Meeting } from "@/lib/db/types";
import { HOME } from "@/lib/session";
import { useMounted, useNow } from "@/lib/use-client";
import { useMicrophone, type MicState } from "@/lib/use-microphone";

// The ALARM ID someone joined with is remembered for this tab (sessionStorage), read as an
// external store so it renders the same on the server and needs no effect.
const idListeners = new Set<() => void>();
function saveId(code: string, id: string | null) {
  try {
    if (id) sessionStorage.setItem(idKey(code), id);
    else sessionStorage.removeItem(idKey(code));
  } catch {}
  idListeners.forEach((l) => l());
}
function useSavedId(code: string) {
  return useSyncExternalStore(
    (l) => {
      idListeners.add(l);
      return () => idListeners.delete(l);
    },
    () => {
      try {
        return sessionStorage.getItem(idKey(code));
      } catch {
        return null;
      }
    },
    () => null,
  );
}

/** Seconds → "১২:০৫" or "১:০২:০৫". */
function clock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return bn(h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`);
}

function untilText(ms: number) {
  const min = Math.ceil(ms / 60_000);
  if (min <= 0) return "নির্ধারিত সময় হয়েছে";
  if (min < 60) return `${bn(min)} মিনিট পর`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${bn(h)} ঘণ্টা পর`;
  return `${bn(Math.floor(h / 24))} দিন পর`;
}

const idKey = (code: string) => `alarm-meet-id:${code}`;

export function MeetView({ code }: { code: string }) {
  const db = useDb();
  const session = useMe();
  const m = meetingByCode(db, code);
  // Without a sign-in, people join with their ALARM ID; it's remembered for this tab only.
  const ready = useMounted();
  const saved = useSavedId(code);
  // Re-checked on every render, so a suspension takes effect straight away.
  const remembered = saved ? identifyForMeeting(db, saved) : null;
  const guest = remembered?.ok ? remembered.identity : null;
  const me: MeetingIdentity | null = session ? { userId: session.userId, role: session.role } : guest;
  const identify = (id: MeetingIdentity | null) => saveId(code, id ? alarmIdOf(db, id.userId) : null);
  // Time-dependent values start at 0 so the server and first client render match.
  const now = useNow(1000);

  const home = session ? HOME[session.role] : "/";

  return (
    <div lang="bn" className="flex min-h-screen flex-col bg-surface font-bn text-ink">
      <header className="flex h-14 flex-none items-center gap-3 border-b border-line bg-white px-4 sm:px-6">
        <Link href={home} className="flex items-center gap-2" aria-label="নিজের পোর্টালে ফিরুন">
          <Logo size={38} priority />
          <span className="font-sans text-[16px] font-bold tracking-[0.13em] text-primary">ALARM</span>
        </Link>
        <span className="text-line">|</span>
        <span className="truncate text-[13.5px] font-semibold text-muted">মিটিং</span>
        {guest && !session && (
          <span className="ml-auto hidden items-center gap-2 text-[12.5px] text-muted sm:inline-flex">
            আইডি: <span className="font-sans font-semibold text-ink">{alarmIdOf(db, guest.userId)}</span>
          </span>
        )}
        {guest && !session ? (
          <button type="button" onClick={() => identify(null)} className="ml-auto inline-flex h-8 cursor-pointer items-center rounded-button border border-line px-3 text-[12.5px] font-semibold text-primary hover:border-primary sm:ml-0">
            আইডি পরিবর্তন
          </button>
        ) : (
          <Link href={home} className="ml-auto inline-flex h-8 items-center rounded-button border border-line px-3 text-[12.5px] font-semibold text-primary hover:border-primary">
            {session ? "পোর্টালে ফিরুন" : "হোমপেজ"}
          </Link>
        )}
      </header>
      <main className="flex flex-1 flex-col">
        {!m ? (
          <Notice tone="neutral" title="মিটিং পাওয়া যায়নি" body="লিংকটি সঠিক নয় অথবা মিটিংটি মুছে ফেলা হয়েছে। যিনি লিংক পাঠিয়েছেন তাঁর কাছ থেকে নতুন লিংক নিন।" home={home} />
        ) : !me ? (
          ready ? <IdForm db={db} m={m} onIdentify={identify} /> : null
        ) : (
          <MeetingFlow key={me.userId} db={db} m={m} me={me} now={now} home={home} />
        )}
      </main>
    </div>
  );
}

type Me = MeetingIdentity;

/** Entry for people who aren't signed in: their ALARM ID decides whether they join or must ask. */
function IdForm({ db, m, onIdentify }: { db: Database; m: Meeting; onIdentify: (id: MeetingIdentity) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<{ text: string; login?: boolean } | null>(null);
  const closed = m.status === "ended" || m.status === "cancelled";
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-md overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="relative overflow-hidden bg-[linear-gradient(120deg,#006A4E_0%,#045C44_50%,#003D2C_100%)] px-6 py-5 text-white">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] font-semibold">অডিও মিটিং</span>
            {m.status === "live" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-0.5 text-[11.5px] font-semibold">
                <span className="size-1.5 animate-pulse rounded-full bg-white" /> এখন চলছে
              </span>
            )}
          </div>
          <h1 className="mt-2.5 text-[19px] font-bold leading-[1.45] text-balance">{m.title}</h1>
          <p className="mt-1 text-[12.5px] text-primary-soft">{meetingWhen(m)}</p>
          <p className="mt-1 text-[12.5px] text-primary-soft">এলাকা: {areaLabel(m.area)}</p>
        </div>
        {closed ? (
          <p className="px-6 py-6 text-center text-[13px] text-muted">{m.status === "ended" ? "এই মিটিং শেষ হয়ে গেছে।" : "এই মিটিং বাতিল করা হয়েছে।"}</p>
        ) : (
          <form
            noValidate
            className="px-6 py-6"
            onSubmit={(e) => {
              e.preventDefault();
              const r = identifyForMeeting(db, value);
              if (r.ok) onIdentify(r.identity);
              else setError({ text: r.error, login: r.needsLogin });
            }}
          >
            <label htmlFor="alarm-id" className="block text-[13.5px] font-semibold">
              আপনার ALARM আইডি
            </label>
            <p className="mt-0.5 text-[12px] leading-[1.6] text-muted">লগইন লাগবে না — শুধু আইডি দিন। আপনার এলাকা মিটিংয়ের অন্তর্ভুক্ত হলে সরাসরি যোগ দিতে পারবেন, না হলে প্রধান নির্বাহী সম্পাদকের কাছে অনুরোধ পাঠাতে পারবেন।</p>
            <input
              id="alarm-id"
              value={value}
              onChange={(e) => {
                setValue(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="যেমন KAR-123456"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby={error ? "alarm-id-error" : "alarm-id-hint"}
              className={`mt-3 h-12 w-full rounded-input border px-4 font-mono text-[16px] tracking-[0.06em] outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,106,78,0.10)] ${error ? "border-danger" : "border-line"}`}
            />
            {error ? (
              <p id="alarm-id-error" role="alert" className="mt-2 text-[12.5px] text-danger">
                {error.text}{" "}
                {error.login && (
                  <Link href={`/login?next=${encodeURIComponent(`/meet/${m.code}`)}`} className="font-semibold underline">
                    লগইন করুন
                  </Link>
                )}
              </p>
            ) : (
              <p id="alarm-id-hint" className="mt-2 text-[11.5px] leading-[1.6] text-muted">
                আপনার ALARM আইডি KAR দিয়ে শুরু — পোর্টালের বাম পাশে নামের নিচে ও সেটিংস পাতায় দেখা যায়।
              </p>
            )}
            <button type="submit" className="mt-5 h-12 w-full cursor-pointer rounded-button bg-primary text-[15px] font-semibold text-white hover:bg-primary-hover">
              এগিয়ে যান
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function MeetingFlow({ db, m, me, now, home }: { db: Database; m: Meeting; me: Me; now: number; home: string }) {
  const access = accessOf(db, m, me.userId, me.role);
  const mic = useMicrophone();
  const [inRoom, setInRoom] = useState(false);
  const mine = m.presence.find((p) => p.userId === me.userId);

  // Leave cleanly when the meeting ends or the admin removes this user.
  const kicked = inRoom && (m.status !== "live" || m.removed.includes(me.userId));
  const stopMic = mic.stop;
  useEffect(() => {
    if (!kicked) return;
    stopMic();
    audioTransport.disconnect();
  }, [kicked, stopMic]);

  if (m.status === "cancelled") return <Notice tone="neutral" title="মিটিংটি বাতিল করা হয়েছে" body={`“${m.title}” — প্রধান নির্বাহী সম্পাদক মিটিংটি বাতিল করেছেন।`} home={home} />;
  if (m.status === "ended") {
    const mins = m.startedAt && m.endedAt ? Math.round((new Date(m.endedAt).getTime() - new Date(m.startedAt).getTime()) / 60_000) : 0;
    return (
      <Notice
        tone="neutral"
        title="মিটিং শেষ হয়েছে"
        body={`“${m.title}” ${m.endedAt ? `${bnDate(m.endedAt)} ${bnTime(m.endedAt)}-এ` : ""} শেষ হয়েছে${mins ? ` · ${bn(mins)} মিনিট চলেছে` : ""} · ${bn(m.attended.length)} জন অংশ নিয়েছেন।`}
        home={home}
      />
    );
  }
  if (access === "removed") return <Notice tone="danger" title="আপনাকে মিটিং থেকে সরানো হয়েছে" body="প্রধান নির্বাহী সম্পাদক আপনাকে এই মিটিং থেকে সরিয়ে দিয়েছেন। প্রয়োজনে প্রধান নির্বাহী সম্পাদকের সাথে যোগাযোগ করুন।" home={home} />;
  if (access === "declined") return <Notice tone="danger" title="যোগ দেওয়ার অনুরোধ গৃহীত হয়নি" body="প্রধান নির্বাহী সম্পাদক আপনার অনুরোধ অনুমোদন করেননি। প্রয়োজনে প্রধান নির্বাহী সম্পাদকের সাথে যোগাযোগ করুন।" home={home} />;
  if (access === "outside" || access === "pending") return <RequestCard m={m} me={me} pending={access === "pending"} />;

  if (inRoom && !kicked && mine && canEnter(access)) return <Room db={db} m={m} me={me} now={now} mic={mic} onLeave={() => setInRoom(false)} />;

  return (
    <Lobby
      db={db}
      m={m}
      me={me}
      now={now}
      access={access}
      mic={mic}
      onEnter={async (muted) => {
        if (me.role === "admin" && m.status === "scheduled") startMeeting(m.id, me.userId);
        const stream = mic.stream ?? (await mic.start());
        if (stream) audioTransport.connect(m.id, me.userId, stream);
        enterRoom(m.id, me.userId, muted || !stream);
        setInRoom(true);
      }}
    />
  );
}

// ── States ──────────────────────────────────────────────────────────────────

function Notice({ tone, title, body, home, children }: { tone: "neutral" | "danger" | "wait"; title: string; body: string; home?: string; children?: ReactNode }) {
  const ring = tone === "danger" ? "bg-danger/10 text-danger" : tone === "wait" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary";
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-card border border-line bg-white px-6 py-8 text-center shadow-card">
        <span className={`mx-auto flex size-14 items-center justify-center rounded-full ${ring}`}>
          {tone === "wait" ? (
            <span className="size-6 animate-spin rounded-full border-[3px] border-current border-t-transparent" aria-hidden="true" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {tone === "danger" ? <path d="M10 6v5M10 14h.01M10 2.5 18 17H2Z" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M3 6.5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3Zm12 3 3-2v6l-3-2" strokeLinejoin="round" />}
            </svg>
          )}
        </span>
        <h1 className="mt-4 text-[18px] font-semibold leading-[1.5]">{title}</h1>
        <p className="mt-2 text-[13px] leading-[1.8] text-muted text-pretty">{body}</p>
        {children}
        {home && (
          <Link href={home} className="mt-6 inline-flex h-10 items-center rounded-button border border-line px-4 text-[13px] font-semibold text-primary hover:border-primary">
            {home === "/" ? "হোমপেজে ফিরুন" : "নিজের পোর্টালে ফিরুন"}
          </Link>
        )}
      </section>
    </div>
  );
}

function RequestCard({ m, me, pending }: { m: Meeting; me: Me; pending: boolean }) {
  const [note, setNote] = useState("");
  if (pending)
    return (
      <Notice tone="wait" title="প্রধান নির্বাহী সম্পাদকের অনুমোদনের অপেক্ষায়" body={`“${m.title}” — আপনার অনুরোধ পাঠানো হয়েছে। অনুমোদন হলে এই পাতা নিজে থেকেই মিটিংয়ে যোগ দেওয়ার জন্য খুলে যাবে।`}>
        <p className="mt-3 text-[12px] text-muted">{meetingWhen(m)}</p>
      </Notice>
    );
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-lg overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="border-b border-line px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <MeetingStatusChip status={m.status} />
            <span className="text-[12px] text-muted">{meetingWhen(m)}</span>
          </div>
          <h1 className="mt-2 text-[19px] font-semibold leading-[1.5]">{m.title}</h1>
        </div>
        <form
          className="px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            requestJoin(m.id, me.userId, note.trim());
          }}
        >
          <p className="flex gap-2.5 rounded-card border border-l-[3px] border-line border-l-warning bg-warning/5 px-4 py-3 text-[12.5px] leading-[1.75] text-ink">
            <span>
              <span className="font-semibold">আপনি এই মিটিংয়ের এলাকার বাইরে।</span> মিটিংটি শুধু <span className="font-semibold">{areaLabel(m.area)}</span>-এর জন্য। যোগ দিতে চাইলে প্রধান নির্বাহী সম্পাদকের কাছে অনুরোধ পাঠান — অনুমোদন দিলে যোগ দিতে পারবেন।
            </span>
          </p>
          <label htmlFor="join-note" className="mt-4 block text-[12.5px] font-semibold">
            প্রধান নির্বাহী সম্পাদকের জন্য বার্তা <span className="font-normal text-muted">(ঐচ্ছিক)</span>
          </label>
          <textarea
            id="join-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="কেন যোগ দিতে চান, সংক্ষেপে লিখুন"
            className="mt-1.5 w-full resize-none rounded-input border border-line px-3 py-2.5 text-[13.5px] outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,106,78,0.10)]"
          />
          <button type="submit" className="mt-4 h-11 w-full cursor-pointer rounded-button bg-primary text-[14px] font-semibold text-white hover:bg-primary-hover">
            যোগ দেওয়ার অনুরোধ পাঠান
          </button>
        </form>
      </section>
    </div>
  );
}

function LevelMeter({ level, state }: { level: number; state: MicState }) {
  const bars = 16;
  const lit = Math.round(level * bars);
  return (
    <div className="flex h-6 items-end gap-[3px]" role="meter" aria-label="মাইক্রোফোনের শব্দের মাত্রা" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={`w-[6px] rounded-sm transition-colors ${state === "ready" && i < lit ? (i > 12 ? "bg-warning" : "bg-success") : "bg-line"}`}
          style={{ height: `${30 + (i / bars) * 70}%` }}
        />
      ))}
    </div>
  );
}

type Mic = ReturnType<typeof useMicrophone>;

function Lobby({ m, me, now, access, mic, onEnter }: { db: Database; m: Meeting; me: Me; now: number; access: string; mic: Mic; onEnter: (muted: boolean) => void }) {
  const [joinMuted, setJoinMuted] = useState(true);
  const [busy, setBusy] = useState(false);
  const host = me.role === "admin";
  const live = m.status === "live";
  const inside = now ? activePresence(m, now).length : 0;
  const waitingStart = !live && !host;

  return (
    <div className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="relative overflow-hidden bg-[linear-gradient(120deg,#006A4E_0%,#045C44_50%,#003D2C_100%)] px-6 py-6 text-white">
          <div aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_18px)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] font-semibold">অডিও মিটিং</span>
              {live && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-0.5 text-[11.5px] font-semibold">
                  <span className="size-1.5 animate-pulse rounded-full bg-white" /> এখন চলছে
                </span>
              )}
            </div>
            <h1 className="mt-3 text-[22px] font-bold leading-[1.45] text-balance">{m.title}</h1>
            <p className="mt-1 text-[13px] text-primary-soft">{meetingWhen(m)}</p>
          </div>
        </div>
        <dl className="grid gap-px bg-line sm:grid-cols-3">
          {[
            ["এলাকা", areaLabel(m.area)],
            ["আয়োজক", "প্রধান নির্বাহী সম্পাদক"],
            [live ? "এখন যুক্ত" : "অবস্থা", live ? `${bn(inside)} জন` : now && new Date(m.scheduledAt).getTime() > now ? untilText(new Date(m.scheduledAt).getTime() - now) : "শুরুর অপেক্ষায়"],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-5 py-3.5">
              <dt className="text-[11.5px] text-muted">{k}</dt>
              <dd className="mt-0.5 text-[14px] font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-line px-6 py-5">
          <h2 className="text-[13.5px] font-semibold">আলোচ্যসূচি</h2>
          <p className="mt-1.5 whitespace-pre-line text-[13px] leading-[1.85] text-muted">{m.agenda || "আলোচ্যসূচি দেওয়া হয়নি।"}</p>
        </div>
        {host && (
          <div className="border-t border-line px-6 py-5">
            <h2 className="mb-2 text-[13.5px] font-semibold">আমন্ত্রণ লিংক</h2>
            <ShareLink code={m.code} />
          </div>
        )}
      </section>

      <section className="self-start rounded-card border border-line bg-white px-5 py-5 shadow-card">
        <h2 className="text-[15px] font-semibold">যোগ দেওয়ার আগে</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          {access === "approved" ? "প্রধান নির্বাহী সম্পাদক আপনার অনুরোধ অনুমোদন করেছেন।" : access === "invited" ? "আপনি এই মিটিংয়ে আমন্ত্রিত।" : access === "area" ? "আপনার এলাকা এই মিটিংয়ের অন্তর্ভুক্ত।" : "আপনি এই মিটিংয়ের আয়োজক।"}
        </p>

        <div className="mt-4 rounded-card border border-line bg-surface/60 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className={`flex size-10 flex-none items-center justify-center rounded-full ${mic.state === "ready" ? "bg-success/10 text-success" : mic.state === "denied" || mic.state === "unavailable" ? "bg-danger/10 text-danger" : "bg-white text-muted ring-1 ring-line"}`}>
              <MicIcon muted={mic.state === "denied" || mic.state === "unavailable"} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold">মাইক্রোফোন</div>
              <div className="text-[11.5px] text-muted">
                {mic.state === "ready"
                  ? "কথা বলে দেখুন — শব্দের মাত্রা নিচে দেখা যাবে"
                  : mic.state === "requesting"
                    ? "ব্রাউজারে অনুমতি দিন…"
                    : mic.state === "denied"
                      ? "অনুমতি দেওয়া হয়নি — ব্রাউজারের ঠিকানা-বারের পাশ থেকে অনুমতি দিন"
                      : mic.state === "unavailable"
                        ? "এই ডিভাইসে মাইক্রোফোন পাওয়া যায়নি — শুধু শুনতে পারবেন"
                        : "যোগ দেওয়ার আগে পরীক্ষা করে নিন"}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <LevelMeter level={mic.level} state={mic.state} />
            {mic.state !== "ready" && (
              <button type="button" onClick={() => mic.start()} disabled={mic.state === "requesting"} className="ml-auto h-8 cursor-pointer rounded-button border border-line bg-white px-3 text-[12px] font-semibold text-primary hover:border-primary disabled:opacity-60">
                পরীক্ষা করুন
              </button>
            )}
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[13px]">
          <input type="checkbox" checked={joinMuted} onChange={(e) => setJoinMuted(e.target.checked)} className="size-4 accent-[#006A4E]" />
          মাইক্রোফোন বন্ধ রেখে যোগ দিন
        </label>

        {waitingStart ? (
          <p className="mt-5 rounded-button bg-role-reviewer/8 px-4 py-3 text-center text-[12.5px] leading-[1.7] text-ink">
            মিটিং এখনও শুরু হয়নি। প্রধান নির্বাহী সম্পাদক শুরু করলে এখান থেকেই যোগ দিতে পারবেন — পাতাটি খোলা রাখুন।
          </p>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onEnter(joinMuted);
              setBusy(false);
            }}
            className="mt-5 h-12 w-full cursor-pointer rounded-button bg-primary text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70"
          >
            {host && !live ? "মিটিং শুরু করুন ও যোগ দিন" : "মিটিংয়ে যোগ দিন"}
          </button>
        )}
        {host && pendingRequests(m).length > 0 && (
          <p className="mt-3 text-center text-[12px] text-warning">{bn(pendingRequests(m).length)}টি যোগ দেওয়ার অনুরোধ অপেক্ষায় — মিটিংয়ের ভেতরে অনুমোদন দিতে পারবেন।</p>
        )}
      </section>
    </div>
  );
}

// ── Room ────────────────────────────────────────────────────────────────────

function Room({ db, m, me, now, mic, onLeave }: { db: Database; m: Meeting; me: Me; now: number; mic: Mic; onLeave: () => void }) {
  const host = me.role === "admin";
  const people = activePresence(m, now);
  const mine = m.presence.find((p) => p.userId === me.userId)!;
  const names = participantNames(db, me.userId, me.role, people.map((p) => p.userId));
  const requests = pendingRequests(m);
  const [panel, setPanel] = useState<"people" | "requests" | "info">("people");
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Keep the track in step with the shared mute state (the admin may mute anyone).
  const setEnabled = mic.setEnabled;
  useEffect(() => setEnabled(!mine.muted), [mine.muted, setEnabled]);

  // Check in while the tab is open; leave when the room closes or the tab goes away.
  useEffect(() => {
    const t = setInterval(() => heartbeat(m.id, me.userId), HEARTBEAT_MS);
    const bye = () => leaveRoom(m.id, me.userId);
    window.addEventListener("pagehide", bye);
    return () => {
      clearInterval(t);
      window.removeEventListener("pagehide", bye);
    };
  }, [m.id, me.userId]);

  const leave = () => {
    leaveRoom(m.id, me.userId);
    audioTransport.disconnect();
    mic.stop();
    onLeave();
  };

  const toggleMic = async () => {
    if (mine.muted && mic.state !== "ready") {
      const s = await mic.start();
      if (!s) return;
      audioTransport.connect(m.id, me.userId, s);
    }
    setMuted(m.id, me.userId, !mine.muted);
  };

  const elapsed = m.startedAt && now ? (now - new Date(m.startedAt).getTime()) / 1000 : 0;
  const speaking = !mine.muted && mic.level > 0.08;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white px-5 py-4 shadow-card">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold leading-[1.5]">{m.title}</h1>
              <p className="text-[12px] text-muted">অডিও মিটিং · {bn(people.length)} জন যুক্ত</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 font-sans text-[13px] font-semibold text-danger tabular-nums">
              <span className="size-2 animate-pulse rounded-full bg-danger" />
              {clock(elapsed)}
            </span>
          </div>

          {!audioTransport.relays && (
            <p className="rounded-card border border-l-[3px] border-line border-l-role-reviewer bg-white px-4 py-3 text-[12px] leading-[1.7] text-muted shadow-card">
              অংশগ্রহণকারীদের মধ্যে কণ্ঠস্বর আদান-প্রদান সার্ভার যুক্ত হলে চালু হবে। এখন মাইক্রোফোন শুধু আপনার ডিভাইসে কাজ করছে; কে যুক্ত, কে কথা বলতে চান ও মিউট — সবই সবার কাছে হালনাগাদ থাকে।
            </p>
          )}

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {people.map((p) => {
              const self = p.userId === me.userId;
              const name = names.get(p.userId) ?? "";
              const isHost = roleOfId(db, p.userId) === "admin";
              const talk = self && speaking;
              return (
                <li key={p.userId} className={`relative flex flex-col items-center rounded-card border bg-white px-3 py-5 text-center shadow-card transition-colors ${talk ? "border-success" : "border-line"}`}>
                  {p.hand && (
                    <span className="absolute top-2.5 left-2.5 flex size-7 items-center justify-center rounded-full bg-warning/15 text-warning" title="কথা বলতে চান">
                      <HandIcon size={15} />
                    </span>
                  )}
                  <span className={`absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full ${p.muted ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`} title={p.muted ? "মিউট" : "মাইক্রোফোন চালু"}>
                    <MicIcon muted={p.muted} size={14} />
                  </span>
                  <span className={`flex size-16 items-center justify-center rounded-full text-[22px] font-semibold ring-4 transition-shadow ${isHost ? "bg-primary text-white" : "bg-primary/10 text-primary"} ${talk ? "ring-success/40" : "ring-transparent"}`}>
                    {name.replace(/^মোঃ\s*/, "").slice(0, 1)}
                  </span>
                  <div className="mt-3 w-full truncate text-[13.5px] font-semibold">{name}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    {self ? "আপনি" : isHost ? "আয়োজক" : name.startsWith(roleLabel(db, p.userId)) ? "অংশগ্রহণকারী" : roleLabel(db, p.userId)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="flex flex-col self-start overflow-hidden rounded-card border border-line bg-white shadow-card lg:sticky lg:top-5">
          <div role="tablist" className="flex border-b border-line">
            {([
              ["people", `অংশগ্রহণকারী (${bn(people.length)})`],
              ...(host ? [["requests", `অনুরোধ${requests.length ? ` (${bn(requests.length)})` : ""}`] as const] : []),
              ["info", "তথ্য"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={panel === k}
                onClick={() => setPanel(k)}
                className={`relative h-11 flex-1 cursor-pointer border-b-2 px-2 text-[12.5px] font-semibold ${panel === k ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}
              >
                {label}
                {k === "requests" && requests.length > 0 && panel !== k && <span className="absolute top-2.5 right-2 size-2 rounded-full bg-warning" />}
              </button>
            ))}
          </div>

          {panel === "people" && (
            <ul className="max-h-[420px] overflow-y-auto">
              {people.map((p) => (
                <PersonRow key={p.userId} db={db} m={m} me={me} userId={p.userId} name={names.get(p.userId) ?? ""} muted={p.muted} hand={p.hand} host={host} />
              ))}
            </ul>
          )}
          {panel === "requests" && host && (
            <ul className="max-h-[420px] overflow-y-auto">
              {requests.length === 0 && <li className="px-5 py-8 text-center text-[12.5px] text-muted">কোনো অনুরোধ অপেক্ষায় নেই।</li>}
              {requests.map((r) => (
                <li key={r.userId} className="border-b border-line/70 px-5 py-3.5 last:border-b-0">
                  <div className="text-[13.5px] font-semibold">{participantNames(db, me.userId, me.role, [r.userId]).get(r.userId)}</div>
                  <div className="text-[11.5px] text-muted">
                    {roleLabel(db, r.userId)} · {bnTime(r.at)}
                  </div>
                  {r.note && <p className="mt-1.5 rounded-input bg-surface px-2.5 py-1.5 text-[12px] leading-[1.6]">{r.note}</p>}
                  <div className="mt-2.5 flex gap-2">
                    <button type="button" onClick={() => decideJoin(m.id, r.userId, true, me.userId)} className="h-8 cursor-pointer rounded-button bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary-hover">
                      অনুমোদন
                    </button>
                    <button type="button" onClick={() => decideJoin(m.id, r.userId, false, me.userId)} className="h-8 cursor-pointer rounded-button border border-danger/50 px-3 text-[12px] font-semibold text-danger hover:bg-danger/5">
                      প্রত্যাখ্যান
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {panel === "info" && (
            <div className="flex flex-col gap-4 px-5 py-4">
              <div>
                <div className="text-[11.5px] text-muted">সময়</div>
                <div className="text-[13px] font-semibold">{meetingWhen(m)}</div>
              </div>
              <div>
                <div className="text-[11.5px] text-muted">আলোচ্যসূচি</div>
                <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-[1.8]">{m.agenda || "—"}</p>
              </div>
              {host && (
                <div>
                  <div className="mb-1.5 text-[11.5px] text-muted">আমন্ত্রণ লিংক</div>
                  <ShareLink code={m.code} compact />
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Controls */}
      <div className="sticky bottom-0 z-10 border-t border-line bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleMic}
            aria-pressed={!mine.muted}
            className={`inline-flex h-12 cursor-pointer items-center gap-2 rounded-full px-5 text-[13.5px] font-semibold ${mine.muted ? "bg-danger/10 text-danger hover:bg-danger/15" : "bg-primary text-white hover:bg-primary-hover"}`}
          >
            <MicIcon muted={mine.muted} size={18} />
            {mine.muted ? "মাইক চালু করুন" : "মিউট করুন"}
          </button>
          <button
            type="button"
            onClick={() => setHand(m.id, me.userId, !mine.hand)}
            aria-pressed={mine.hand}
            className={`inline-flex h-12 cursor-pointer items-center gap-2 rounded-full px-5 text-[13.5px] font-semibold ${mine.hand ? "bg-warning text-white" : "border border-line bg-white text-ink hover:border-warning"}`}
          >
            <HandIcon size={18} />
            {mine.hand ? "হাত নামান" : "কথা বলতে চাই"}
          </button>
          <button type="button" onClick={leave} className="inline-flex h-12 cursor-pointer items-center rounded-full border border-danger bg-white px-5 text-[13.5px] font-semibold text-danger hover:bg-danger/5">
            বেরিয়ে যান
          </button>
          {host &&
            (confirmEnd ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-[12.5px] text-danger">সবার জন্য শেষ করবেন?</span>
                <button type="button" onClick={() => endMeeting(m.id, me.userId)} className="h-10 cursor-pointer rounded-full bg-danger px-4 text-[13px] font-semibold text-white hover:bg-danger-hover">
                  হ্যাঁ, শেষ করুন
                </button>
                <button type="button" onClick={() => setConfirmEnd(false)} className="h-10 cursor-pointer rounded-full border border-line px-3 text-[13px] font-semibold text-muted">
                  না
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmEnd(true)} className="inline-flex h-12 cursor-pointer items-center rounded-full bg-danger px-5 text-[13.5px] font-semibold text-white hover:bg-danger-hover">
                মিটিং শেষ করুন
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

function PersonRow({ db, m, me, userId, name, muted, hand, host }: { db: Database; m: Meeting; me: Me; userId: string; name: string; muted: boolean; hand: boolean; host: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const self = userId === me.userId;
  const isHost = roleOfId(db, userId) === "admin";
  return (
    <li className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-b-0">
      <span className={`flex size-9 flex-none items-center justify-center rounded-full text-[14px] font-semibold ${isHost ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{name.replace(/^মোঃ\s*/, "").slice(0, 1)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">
          {name}
          {self && <span className="font-normal text-muted"> (আপনি)</span>}
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-muted">
          {isHost ? "আয়োজক" : name.startsWith(roleLabel(db, userId)) ? "অংশগ্রহণকারী" : roleLabel(db, userId)}
          {hand && <span className="inline-flex items-center gap-1 text-warning"><HandIcon size={12} /> কথা বলতে চান</span>}
        </div>
      </div>
      <span className={muted ? "text-danger" : "text-success"} title={muted ? "মিউট" : "মাইক্রোফোন চালু"}>
        <MicIcon muted={muted} size={15} />
      </span>
      {host && !self && (
        <div className="flex flex-none gap-1.5">
          {!muted && (
            <button type="button" onClick={() => setMuted(m.id, userId, true)} className="h-7 cursor-pointer rounded-button border border-line px-2 text-[11px] font-semibold text-muted hover:border-primary hover:text-primary">
              মিউট
            </button>
          )}
          {confirm ? (
            <button type="button" onClick={() => removeFromMeeting(m.id, userId, me.userId)} className="h-7 cursor-pointer rounded-button bg-danger px-2 text-[11px] font-semibold text-white">
              নিশ্চিত
            </button>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="h-7 cursor-pointer rounded-button border border-danger/40 px-2 text-[11px] font-semibold text-danger hover:bg-danger/5">
              সরান
            </button>
          )}
        </div>
      )}
    </li>
  );
}
