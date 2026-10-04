// The ALARM data model. One record per real-world thing; every portal derives its view from these.
// Shaped like the future backend's resources so the mock store can be swapped for API calls.

export type Category = "ইতিবাচক" | "নেতিবাচক";
export type Role = "admin" | "reviewer" | "staff" | "politician";

/** Every submission is either accepted or rejected — nothing else. Pending until someone decides. */
export type SubmissionState = "Pending" | "Accepted" | "Rejected";

export type Evidence = {
  id: string;
  /** Short type label shown on the thumbnail, e.g. "নথি · PDF", "ছবি · ৪টি". */
  kind: string;
  title: string;
  meta: string;
  /**
   * The uploaded file, when there is one. `data` is a data URL kept for previews of small files only;
   * the backend will store the real file and return a URL instead.
   */
  file?: EvidenceFile;
};

export type EvidenceFile = { name: string; type: string; size: number; data?: string };

export type SubmissionEvent = {
  at: string; // ISO
  /** User id of whoever acted (staff, politician, reviewer or admin). */
  by: string;
  type: "submitted" | "edited" | "accepted" | "rejected";
  note?: string;
};

/** Extra detail captured by the field app for staff submissions. */
export type FieldDetail = {
  task: string;
  visitTime?: string;
  device: string;
  note?: string;
  checks: { status: "ok" | "warn" | "bad"; label: string; detail: string }[];
};

export type Submission = {
  code: string;
  profileId: string;
  origin: "staff" | "self";
  /** Staff id for staff submissions. */
  staffId?: string;
  category: Category;
  title: string;
  /** Short source line, safe for every audience. */
  source: string;
  body: string;
  facts: [string, string][];
  evidence: Evidence[];
  state: SubmissionState;
  submittedAt: string; // ISO
  decidedAt?: string;
  /** Reviewer or admin user id. */
  decidedBy?: string;
  /** Recorded decision reason. */
  reason?: string;
  field?: FieldDetail;
  events: SubmissionEvent[];
};

export type AccountStatus = "Active" | "Suspended" | "Deactivated";

export type Profile = {
  id: string;
  name: string;
  initial: string;
  post: string;
  party: string;
  seat: string;
  division: string;
  district: string;
  /** Upazila or city corporation. */
  upazila: string;
  /** Thana or union — with district, this is the coverage key reviewers and staff are matched on. */
  thana: string;
  wards: string;
  phone: string;
  /** Masked; the full number is never stored in the frontend. */
  nid: string;
  dob: string;
  email: string;
  facebook: string;
  office: string;
  since: string;
  /** When the admin created the account. */
  registeredAt: string;
  account: AccountStatus;
  audit: { code: string; opened: string };
};

/**
 * A dispute is either rejected (the submission stays as it is) or accepted (the submission is
 * rejected and leaves the profile). Open until someone decides.
 */
export type DisputeState = "Open" | "Kept" | "Removed";

export type Dispute = {
  code: string;
  submissionCode: string;
  profileId: string;
  reason: string;
  claim: string;
  /** File names the রাজনৈতিক কর্মী attached (kept for older records). */
  attachments: string[];
  /** The attached files themselves, previewable when small enough. */
  files?: Evidence[];
  filedAt: string;
  state: DisputeState;
  decidedAt?: string;
  decidedBy?: string;
  decisionReason?: string;
};

export type StaffStatus = "On duty" | "On leave" | "Suspended" | "Deactivated";

export type Staff = {
  id: string;
  name: string;
  nameBn: string;
  initials: string;
  phone: string;
  email: string;
  nid: string;
  division: string;
  district: string;
  upazila: string;
  thana: string;
  seat: string;
  wards: string;
  status: StaffStatus;
  joined: string;
  completed: number;
  device: { app: string; lastSync: string; pending: number };
  note?: string;
};

export type Assignment = {
  id: string;
  staffId: string;
  profileId: string;
  brief: string;
  wards: string;
  due: string; // ISO date
  open: boolean;
};

export type ReviewerStatus = "Active" | "On leave" | "Suspended" | "Deactivated";

export type Reviewer = {
  id: string;
  name: string;
  nameBn: string;
  initials: string;
  phone: string;
  email: string;
  nid: string;
  status: ReviewerStatus;
  /** Coverage keys: "district · thana". */
  areas: string[];
  joined: string;
  /** Decisions and timing earlier this month, before the seeded records. */
  history: { decided: number; accepted: number; avgHours: number };
  note?: string;
};

export type ReportFinding = {
  text: string;
  refs: number[];
  since: number;
  kind?: string;
  remark?: string;
  chain?: { text: string; meta: string }[];
};

export type ReportVersion = { v: number; title: string; why: string; date: string; positive: number; negative: number };

export type FinalReport = {
  code: string;
  profileId: string;
  state: "approved" | "pending";
  published: string; // ISO
  versions: ReportVersion[];
  subject: { name: string; father: string; nid: string; job: string; address: string };
  purpose: string;
  requester: string;
  reviewerId: string;
  confidence: { pct: number; label: string };
  summary: string;
  summaryNote: string;
  positive: ReportFinding[];
  negative: ReportFinding[];
  negativeIntro: string;
  sources: { title: string; meta: string }[];
  remark: string;
  adminNote?: string;
  approval?: { at: string; signature: string };
  /** Submission codes the current version was cut from. */
  basis: string[];
};

export type AiFinding = {
  id: string;
  profileId: string;
  category: Category;
  title: string;
  meta: string;
  sources: number;
  suggested: "keep" | "exclude";
};

export type AuditEntry = {
  at: string;
  /** User id, or "system". */
  actor: string;
  action: string;
  target: string;
};

export type User = {
  /** The person's ALARM ID — KAR- + 6 digits, unique across every account. The primary key everywhere. */
  id: string;
  role: Role;
  /** Login phone, digits only (01XXXXXXXXX). */
  phone: string;
  /** Demo-only password. Real passwords live in the backend, hashed. */
  password: string;
  /** Profile / staff / reviewer / admin record this account belongs to. */
  subjectId: string;
};

export type Party = { name: string; kind: "Party" | "Organisation" };

export type Settings = {
  org: string;
  language: "bn" | "en";
  timezone: string;
  footer: string;
  rules: { sources: number; dispute: number; caseload: number; window: number };
  notifications: Record<string, { sms: boolean; email: boolean }>;
  permissions: Record<string, Record<"admin" | "reviewer" | "staff", boolean>>;
  security: { twoFactor: boolean; timeout: number };
};

export type Admin = { id: string; name: string; nameBn?: string; initials: string; email: string; phone: string };

// ── Meetings ────────────────────────────────────────────────────────────────

export type MeetingStatus = "scheduled" | "live" | "ended" | "cancelled";

export type MeetingArea = { division: string; district: string; upazila: string; thana: string; ward: string };

/** A signed-in user who opened the link without an invitation. */
export type JoinRequest = {
  userId: string;
  at: string;
  note: string;
  state: "pending" | "approved" | "declined";
  decidedAt?: string;
  decidedBy?: string;
};

/** Someone currently in the audio room; `lastSeen` is refreshed while their tab is open. */
export type MeetingPresence = { userId: string; joinedAt: string; lastSeen: string; muted: boolean; hand: boolean };

export type Meeting = {
  id: string;
  /** Unguessable code used in the shared link: /meet/<code>. */
  code: string;
  title: string;
  agenda: string;
  scheduledAt: string;
  createdBy: string;
  createdAt: string;
  status: MeetingStatus;
  startedAt?: string;
  endedAt?: string;
  /**
   * Who may join without asking, as a chain: an empty level means "any". District only → that district;
   * district + thana → only that thana; all empty → everyone.
   */
  area: MeetingArea;
  /** Named people who may join even from outside the area. */
  invitees: string[];
  requests: JoinRequest[];
  presence: MeetingPresence[];
  /** Everyone who entered the room at least once. */
  attended: string[];
  /** Removed by the admin; they can't rejoin this meeting. */
  removed: string[];
};

export type Database = {
  version: number;
  admins: Admin[];
  users: User[];
  profiles: Profile[];
  submissions: Submission[];
  disputes: Dispute[];
  staff: Staff[];
  assignments: Assignment[];
  reviewers: Reviewer[];
  reports: FinalReport[];
  aiFindings: AiFinding[];
  parties: Party[];
  settings: Settings;
  meetings: Meeting[];
  audit: AuditEntry[];
};

// ── Organisations (multi-tenant) ────────────────────────────────────────────

/** The one account above every organisation: creates প্রধান নির্বাহী সম্পাদক accounts and can act as them. */
export type SuperAdmin = { id: string; name: string; phone: string; email: string; password: string };

export type OrgStatus = "Active" | "Suspended";

/**
 * One প্রধান নির্বাহী সম্পাদক's separate system. Everything inside `db` — accounts, submissions, reports,
 * meetings, audit log — belongs to this organisation only; no other organisation can read it.
 */
export type Org = {
  id: string;
  name: string;
  /** ALARM ID of the organisation's প্রধান নির্বাহী সম্পাদক. */
  adminId: string;
  status: OrgStatus;
  createdAt: string;
  suspendedAt?: string;
  /** Why the সুপার অ্যাডমিন suspended it. */
  suspendReason?: string;
  db: Database;
};

/** Everything the frontend stores: the সুপার অ্যাডমিন, every organisation, and the সুপার অ্যাডমিন's own log. */
export type RootStore = { version: number; superAdmin: SuperAdmin; orgs: Org[]; audit: AuditEntry[] };
