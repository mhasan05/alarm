"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { AreaPicker, areaFromGeo } from "@/components/meetings/area-picker";
import { InvitePicker } from "@/components/meetings/invite-picker";
import { MeetingStatusChip, ShareLink, meetingWhen } from "@/components/meetings/meeting-bits";
import { RecordMissing } from "@/components/record-missing";
import { bn, bnDate, bnTime } from "@/lib/db/format";
import { activePresence, areaLabel, areaMembers, cancelMeeting, decideJoin, endMeeting, meetingById, pendingRequests, roleLabel, setInvitees, updateMeeting } from "@/lib/db/meetings";
import { alarmIdOf, nameBnOf } from "@/lib/db/selectors";
import type { Database, Meeting } from "@/lib/db/types";
import { useGeoCascade } from "@/lib/use-geo-cascade";
import { useAdmin } from "../../use-admin";

export function MeetingDetail({ id, created }: { id: string; created: boolean }) {
  const { db, adminId } = useAdmin();
  const m = meetingById(db, id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<"cancel" | "end" | null>(null);
  const [editingArea, setEditingArea] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  if (!m) return <RecordMissing title="মিটিং পাওয়া যায়নি" backHref="/admin/meetings" backLabel="মিটিং তালিকায় ফিরুন" />;

  const open = m.status === "live" || m.status === "scheduled";
  const inRoom = new Set(now ? activePresence(m, now).map((p) => p.userId) : []);
  const pending = pendingRequests(m);
  const decided = m.requests.filter((r) => r.state !== "pending");
  const late = m.status === "scheduled" && now > 0 && new Date(m.scheduledAt).getTime() < now;

  const personStatus = (uid: string) =>
    inRoom.has(uid) ? { label: "এখন রুমে", cls: "bg-success/10 text-success" } : m.attended.includes(uid) ? { label: "যোগ দিয়েছিলেন", cls: "bg-primary/8 text-primary" } : { label: m.status === "ended" ? "যোগ দেননি" : "এখনও যোগ দেননি", cls: "bg-surface text-muted" };

  return (
    <>
      <PageHeader
        backHref="/admin/meetings"
        crumb={
          <>
            <Link href="/admin/meetings" className="text-primary hover:text-primary-hover">
              মিটিং
            </Link>{" "}
            / {m.id}
          </>
        }
        title={<span className="font-bn">{m.title}</span>}
        action={
          open ? (
            <Link href={`/meet/${m.code}`} className={`inline-flex h-[38px] items-center gap-2 rounded-button px-4 font-bn text-[13.5px] font-semibold text-white ${m.status === "live" ? "bg-danger hover:bg-danger-hover" : "bg-primary hover:bg-primary-hover"}`}>
              {m.status === "live" && <span className="size-2 animate-pulse rounded-full bg-white" />}
              {m.status === "live" ? "রুমে যান" : "শুরু করুন ও যোগ দিন"}
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col gap-5 px-4 pt-[22px] pb-9 font-bn sm:px-7">
        {created && open && (
          <p role="status" className="rounded-card border border-l-[3px] border-line border-l-success bg-white px-5 py-3.5 text-[13px] shadow-card">
            <span className="font-semibold">মিটিং তৈরি হয়েছে।</span> নিচের লিংকটি আমন্ত্রিতদের সাথে শেয়ার করুন — তাঁরা লগইন করে সরাসরি যোগ দিতে পারবেন।
          </p>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-5">
            {open && (
              <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
                <h2 className="text-[15px] font-semibold">আমন্ত্রণ লিংক</h2>
                <p className="mt-0.5 mb-3 text-[12px] text-muted">
                  লগইন লাগবে না — লিংক খুলে নিজের ALARM আইডি (KAR-…) দিলেই চলবে। {areaLabel(m.area)}-এর আইডি সরাসরি যোগ দেবে; এলাকার বাইরের আইডি অনুরোধ পাঠাবে, আপনি অনুমোদন দেবেন।
                </p>
                <ShareLink code={m.code} />
              </section>
            )}

            {(open || m.requests.length > 0) && (
              <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
                <div className="flex items-center gap-2 border-b border-line px-5 py-4">
                  <h2 className="flex-1 text-[15px] font-semibold">যোগ দেওয়ার অনুরোধ</h2>
                  {pending.length > 0 && <span className="rounded-full bg-warning/12 px-2.5 py-0.5 text-[11.5px] font-semibold text-warning">{bn(pending.length)}টি অপেক্ষায়</span>}
                </div>
                {m.requests.length === 0 ? (
                  <p className="px-5 py-6 text-center text-[12.5px] text-muted">এখনও কেউ অনুরোধ পাঠাননি।</p>
                ) : (
                  <ul>
                    {[...pending, ...decided].map((r) => (
                      <li key={r.userId} className="flex flex-wrap items-start gap-3 border-b border-line/70 px-5 py-3.5 last:border-b-0">
                        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-primary/10 text-[14px] font-semibold text-primary">{nameBnOf(db, r.userId).replace(/^মোঃ\s*/, "").slice(0, 1)}</span>
                        <div className="min-w-[180px] flex-1">
                          <div className="text-[13.5px] font-semibold">{nameBnOf(db, r.userId)}</div>
                          <div className="text-[11.5px] text-muted">
                            {roleLabel(db, r.userId)} · <span className="font-sans">{alarmIdOf(db, r.userId)}</span> · {bnDate(r.at)} {bnTime(r.at)}
                          </div>
                          {r.note && <p className="mt-1.5 rounded-input bg-surface px-2.5 py-1.5 text-[12px] leading-[1.6]">{r.note}</p>}
                        </div>
                        {r.state === "pending" && open ? (
                          <div className="flex flex-none gap-2">
                            <button type="button" onClick={() => decideJoin(m.id, r.userId, true, adminId)} className="h-8 cursor-pointer rounded-button bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary-hover">
                              অনুমোদন
                            </button>
                            <button type="button" onClick={() => decideJoin(m.id, r.userId, false, adminId)} className="h-8 cursor-pointer rounded-button border border-danger/50 px-3 text-[12px] font-semibold text-danger hover:bg-danger/5">
                              প্রত্যাখ্যান
                            </button>
                          </div>
                        ) : (
                          <span className={`flex-none rounded-input px-2.5 py-1 text-[11.5px] font-semibold ${r.state === "approved" ? "bg-success/10 text-success" : r.state === "declined" ? "bg-danger/10 text-danger" : "bg-surface text-muted"}`}>
                            {r.state === "approved" ? "অনুমোদিত" : r.state === "declined" ? "প্রত্যাখ্যাত" : "অপেক্ষমাণ"}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {editingArea && <AreaEditor db={db} m={m} adminId={adminId} onDone={() => setEditingArea(false)} />}

            <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
              <div className="flex items-center gap-2 border-b border-line px-5 py-4">
                <div className="flex-1">
                  <h2 className="text-[15px] font-semibold">নাম ধরে আমন্ত্রিত ({bn(m.invitees.length)})</h2>
                  <p className="text-[12px] text-muted">এলাকার বাইরে থেকেও অনুরোধ ছাড়া যোগ দিতে পারবেন</p>
                  {m.status === "live" && <p className="text-[12px] text-muted">{bn(inRoom.size)} জন এখন রুমে</p>}
                </div>
                {open && !editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(m.invitees);
                      setEditing(true);
                    }}
                    className="h-8 cursor-pointer rounded-button border border-line px-3 text-[12px] font-semibold text-primary hover:border-primary"
                  >
                    আমন্ত্রণ সম্পাদনা
                  </button>
                )}
              </div>
              {editing ? (
                <div className="px-5 py-4">
                  <InvitePicker db={db} value={draft} onChange={setDraft} />
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(false)} className="h-9 cursor-pointer rounded-button border border-line px-3.5 text-[12.5px] font-semibold text-muted">
                      বাতিল
                    </button>
                    <button
                      type="button"
                      disabled={draft.length === 0}
                      onClick={() => {
                        setInvitees(m.id, draft, adminId);
                        setEditing(false);
                      }}
                      className="h-9 cursor-pointer rounded-button bg-primary px-4 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      সংরক্ষণ করুন
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="grid sm:grid-cols-2">
                  {m.invitees.map((uid) => {
                    const st = personStatus(uid);
                    return (
                      <li key={uid} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 sm:odd:border-r">
                        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-primary/10 text-[14px] font-semibold text-primary">{nameBnOf(db, uid).replace(/^মোঃ\s*/, "").slice(0, 1)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold">{nameBnOf(db, uid)}</div>
                          <div className="text-[11.5px] text-muted">
                            {roleLabel(db, uid)} · <span className="font-sans">{alarmIdOf(db, uid)}</span>
                          </div>
                        </div>
                        <span className={`flex-none rounded-input px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-5 xl:sticky xl:top-5">
            <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
              <div className="flex items-center gap-2 border-b border-line px-5 py-4">
                <h2 className="flex-1 text-[15px] font-semibold">বিস্তারিত</h2>
                <MeetingStatusChip status={m.status} />
              </div>
              <dl className="px-5 py-2">
                {[
                  ["সময়", meetingWhen(m)],
                  ["এলাকা", areaLabel(m.area)],
                  ["এলাকার সদস্য", `${bn(areaMembers(db, m.area).length)} জন`],
                  ["ধরন", "অডিও মিটিং"],
                  ["আইডি", m.id],
                  ...(m.startedAt ? [["শুরু", `${bnDate(m.startedAt)} ${bnTime(m.startedAt)}`]] : []),
                  ...(m.endedAt ? [["শেষ", `${bnDate(m.endedAt)} ${bnTime(m.endedAt)}`]] : []),
                  ...(m.status === "ended" ? [["অংশগ্রহণ", `${bn(m.attended.length)} জন`]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2.5 last:border-b-0">
                    <dt className="text-[12px] text-muted">{k}</dt>
                    <dd className="text-right text-[13px] font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {late && <p className="mx-5 mb-4 rounded-input bg-warning/10 px-3 py-2 text-[12px] text-warning">নির্ধারিত সময় পেরিয়েছে — শুরু করলে সবাই যোগ দিতে পারবেন।</p>}
              {open && !editingArea && (
                <div className="border-t border-line px-5 py-3">
                  <button type="button" onClick={() => setEditingArea(true)} className="h-8 cursor-pointer rounded-button border border-line px-3 text-[12px] font-semibold text-primary hover:border-primary">
                    এলাকা পরিবর্তন
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
              <h2 className="text-[14px] font-semibold">আলোচ্যসূচি</h2>
              <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-[1.85] text-muted">{m.agenda || "আলোচ্যসূচি দেওয়া হয়নি।"}</p>
            </section>

            {open && (
              <section className="rounded-card border border-line bg-white px-5 py-4 shadow-card">
                {confirm ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[12.5px] text-danger">{confirm === "end" ? "মিটিংটি সবার জন্য শেষ করবেন?" : "মিটিংটি বাতিল করবেন? আমন্ত্রিতরা আর যোগ দিতে পারবেন না।"}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm === "end") endMeeting(m.id, adminId);
                          else cancelMeeting(m.id, adminId);
                          setConfirm(null);
                        }}
                        className="h-9 cursor-pointer rounded-button bg-danger px-4 text-[12.5px] font-semibold text-white hover:bg-danger-hover"
                      >
                        হ্যাঁ, নিশ্চিত
                      </button>
                      <button type="button" onClick={() => setConfirm(null)} className="h-9 cursor-pointer rounded-button border border-line px-3 text-[12.5px] font-semibold text-muted">
                        ফিরে যান
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirm(m.status === "live" ? "end" : "cancel")}
                    className="h-9 w-full cursor-pointer rounded-button border border-danger/50 text-[12.5px] font-semibold text-danger hover:bg-danger/5"
                  >
                    {m.status === "live" ? "মিটিং শেষ করুন" : "মিটিং বাতিল করুন"}
                  </button>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

/** Change who may join without asking. */
function AreaEditor({ db, m, adminId, onDone }: { db: Database; m: Meeting; adminId: string; onDone: () => void }) {
  const geo = useGeoCascade({ division: m.area.division, district: m.area.district, upazila: m.area.upazila, area: m.area.thana, ward: m.area.ward });
  const members = areaMembers(db, areaFromGeo(geo)).length;
  return (
    <section className="rounded-card border border-primary/40 bg-white px-5 py-4 shadow-card">
      <h2 className="mb-3 text-[15px] font-semibold">মিটিংয়ের এলাকা পরিবর্তন</h2>
      <AreaPicker geo={geo} members={members} />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onDone} className="h-9 cursor-pointer rounded-button border border-line px-3.5 text-[12.5px] font-semibold text-muted">
          বাতিল
        </button>
        <button
          type="button"
          onClick={() => {
            updateMeeting(m.id, { area: areaFromGeo(geo) }, adminId);
            onDone();
          }}
          className="h-9 cursor-pointer rounded-button bg-primary px-4 text-[12.5px] font-semibold text-white hover:bg-primary-hover"
        >
          সংরক্ষণ করুন
        </button>
      </div>
    </section>
  );
}
