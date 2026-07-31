/**
 * Extreme field-log densification: one message every 15 minutes of field time,
 * driven by each project's duration (industry schedule) and active phase/vendor.
 *
 * Work model (default):
 *  - Mon–Fri field days
 *  - 07:00–15:00 local field clock (8h) → 32 logs/day
 *  - interval = 15 minutes
 *
 * Self-contained for Node harness (--experimental-strip-types).
 * Full streams can be huge (thousands/project). Persist sample + timeline meta.
 */

export type CommKind =
  | "status_update"
  | "handoff"
  | "inspection_request"
  | "inspection_result"
  | "bd_lane"
  | "ack"
  | "escalation"
  | "pin_request"
  | "site_pack";

export type CommPhase =
  | "mobilization"
  | "walkdown"
  | "active_work"
  | "inspection"
  | "deficiency"
  | "resolution"
  | "closeout";

export type CommRoleId =
  | "super"
  | "foreman"
  | "crew"
  | "inspector"
  | "owner"
  | "bd"
  | "system";

export interface CommOrgPerson {
  id: string;
  name: string;
  roleId: string;
}
export interface CommOrgDivision {
  code: string;
  leadId: string;
}
export interface CommOrgContract {
  id: string;
  vendorId: string;
  divisions: string[];
  name?: string;
  contractor?: string;
}
export interface CommOrg {
  people: CommOrgPerson[];
  divisions: CommOrgDivision[];
  contracts: CommOrgContract[];
  vendors?: Array<{ id: string; contractIds: string[] }>;
}

export interface ProjectComm {
  id: string;
  projectId: string;
  kind: CommKind;
  phase: CommPhase;
  division: string;
  scopes?: string[];
  fromRole: CommRoleId;
  toRoles: CommRoleId[];
  fromName: string;
  toNames: string[];
  text: string;
  contractId?: string;
  vendorId?: string;
  ackRequired?: boolean;
  acked?: boolean;
  programMonth?: number;
  createdAt: string;
  routingGap?: string;
}

function routingGap(
  phase: CommPhase | undefined,
  toRoles: CommRoleId[] | undefined,
): string | undefined {
  if (!phase || !toRoles?.length) {
    return "No recipients — message has nowhere to land";
  }
  if (toRoles.includes("system")) return undefined;
  const required: Record<CommPhase, CommRoleId[]> = {
    mobilization: ["super", "foreman", "crew"],
    walkdown: ["super", "foreman"],
    active_work: ["foreman", "crew"],
    inspection: ["super", "inspector"],
    deficiency: ["super", "foreman"],
    resolution: ["super", "foreman", "inspector"],
    closeout: ["super", "owner"],
  };
  const need = required[phase];
  const missing = need.filter((r) => !toRoles.includes(r));
  if (missing.length === need.length) {
    return `Routing gap in ${phase}: none of required roles (${need.join(", ")})`;
  }
  if (
    phase === "deficiency" &&
    !toRoles.includes("super") &&
    !toRoles.includes("foreman")
  ) {
    return "P0/deficiency must include super or foreman";
  }
  if (
    phase === "inspection" &&
    !toRoles.includes("inspector") &&
    !toRoles.includes("super")
  ) {
    return "Inspection traffic must include inspector or super";
  }
  if (
    phase === "closeout" &&
    toRoles.includes("crew") &&
    !toRoles.includes("super")
  ) {
    return "Closeout cannot go crew-only — super/owner required";
  }
  return undefined;
}

export const FIELD_LOG_INTERVAL_MIN = 15;
export const WORKDAY_START_HOUR = 7;
export const WORKDAY_END_HOUR = 15; // exclusive end → 07:00–14:45
export const WORKDAYS_ONLY = true;

/** Industry typical durations (aligned with schedules.ts INDUSTRY_SCHEDULES). */
export const INDUSTRY_DURATION_DAYS: Record<string, number> = {
  single_family: 120,
  multi_family: 280,
  commercial: 240,
  industrial: 200,
  civil: 160,
  renovation: 90,
  hospitality: 300,
  healthcare: 320,
  education: 260,
};

/** Soft UI / localStorage sample cap per project */
export const COMM_SAMPLE_CAP = 480;

export interface IntervalTimeline {
  startYmd: string;
  endYmd: string;
  durationCalendarDays: number;
  fieldWorkDays: number;
  intervalMinutes: number;
  workdayStartHour: number;
  workdayEndHour: number;
  workdaysOnly: boolean;
  intervalsPerWorkday: number;
  /** Exact expected message count for full stream */
  totalIntervals: number;
}

export interface IntervalCommLog {
  version: 2;
  projectId: string;
  mode: "interval_15m";
  intervalMinutes: 15;
  timeline: IntervalTimeline;
  /** True when messages[] is a sample of the full stream */
  sampled: boolean;
  sampleCap: number;
  /** Full stream size (always) */
  fullMessageCount: number;
  messages: ProjectComm[];
  generatedAt: string;
}

export interface IntervalMetaInput {
  id: string;
  name: string;
  stateCode: string;
  city?: string;
  industry: string;
  env?: string[];
  blurb?: string;
  projectStartDate?: string;
  /** Override duration (calendar days) */
  durationDays?: number;
  /** From project phase for progress bias */
  phase?: string;
  /** National vendor ids attached to this project (overlap tags) */
  nationalVendorIds?: string[];
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  return formatYmd(d);
}

function isWeekend(ymd: string): boolean {
  const d = parseYmd(ymd);
  const day = d.getDay();
  return day === 0 || day === 6;
}

function intervalsPerWorkday(
  startH = WORKDAY_START_HOUR,
  endH = WORKDAY_END_HOUR,
  intervalMin = FIELD_LOG_INTERVAL_MIN,
): number {
  return ((endH - startH) * 60) / intervalMin;
}

/** Count field work days in [start, end) calendar range */
export function countFieldWorkDays(
  startYmd: string,
  durationCalendarDays: number,
  workdaysOnly = WORKDAYS_ONLY,
): number {
  let n = 0;
  for (let i = 0; i < durationCalendarDays; i++) {
    const ymd = addDays(startYmd, i);
    if (workdaysOnly && isWeekend(ymd)) continue;
    n++;
  }
  return n;
}

export function computeIntervalTimeline(
  meta: IntervalMetaInput,
): IntervalTimeline {
  const durationCalendarDays =
    meta.durationDays ??
    INDUSTRY_DURATION_DAYS[meta.industry] ??
    180;
  const startYmd =
    meta.projectStartDate ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - Math.floor(durationCalendarDays * 0.55));
      return formatYmd(d);
    })();
  const endYmd = addDays(startYmd, durationCalendarDays);
  const fieldWorkDays = countFieldWorkDays(
    startYmd,
    durationCalendarDays,
    WORKDAYS_ONLY,
  );
  const ipw = intervalsPerWorkday();
  const totalIntervals = fieldWorkDays * ipw;

  return {
    startYmd,
    endYmd,
    durationCalendarDays,
    fieldWorkDays,
    intervalMinutes: FIELD_LOG_INTERVAL_MIN,
    workdayStartHour: WORKDAY_START_HOUR,
    workdayEndHour: WORKDAY_END_HOUR,
    workdaysOnly: WORKDAYS_ONLY,
    intervalsPerWorkday: ipw,
    totalIntervals,
  };
}

function phaseAtProgress(p: number): CommPhase {
  if (p < 0.04) return "mobilization";
  if (p < 0.1) return "walkdown";
  if (p < 0.12) return "inspection";
  if (p >= 0.92) return "closeout";
  if (p >= 0.88) return "inspection";
  // sparse deficiency windows
  const window = Math.floor(p * 100) % 17;
  if (window === 0) return "deficiency";
  if (window === 1) return "resolution";
  if (window === 8) return "inspection";
  return "active_work";
}

function divisionForProgress(
  org: CommOrg,
  progress: number,
  phase: CommPhase,
): string {
  const codes = org.divisions.map((d) => d.code);
  if (phase === "mobilization" || phase === "closeout") return "01";
  if (phase === "inspection") return codes.includes("AHJ") ? "AHJ" : "01";
  if (phase === "deficiency" || phase === "resolution") {
    if (codes.includes("ENV") && progress > 0.2 && progress < 0.5) return "ENV";
    return "01";
  }
  // Active work: rotate trades by progress band
  const trades = codes.filter((c) => !["AHJ", "BD"].includes(c));
  if (!trades.length) return "01";
  const idx = Math.min(
    trades.length - 1,
    Math.floor(((progress - 0.1) / 0.8) * trades.length),
  );
  return trades[Math.max(0, idx)] ?? "01";
}

function contractForDivision(org: CommOrg, division: string) {
  return (
    org.contracts.find((c) => c.divisions.includes(division)) ??
    org.contracts.find((c) => c.vendorId === "v_gc") ??
    org.contracts[0]
  );
}

function personByRole(org: CommOrg, role: CommRoleId) {
  return org.people.find((p) => p.roleId === role) ?? org.people[0]!;
}

function personById(org: CommOrg, id: string) {
  return org.people.find((p) => p.id === id);
}

function recipientsForPhase(
  org: CommOrg,
  phase: CommPhase,
): { fromId: string; toIds: string[] } {
  switch (phase) {
    case "mobilization":
      return { fromId: "owner", toIds: ["super", "foreman", "bd"] };
    case "walkdown":
      return { fromId: "super", toIds: ["foreman"] };
    case "inspection":
      return { fromId: "super", toIds: ["inspector", "foreman"] };
    case "deficiency":
      return { fromId: "foreman", toIds: ["super", "foreman"] };
    case "resolution":
      return { fromId: "super", toIds: ["foreman", "inspector"] };
    case "closeout":
      return { fromId: "super", toIds: ["owner", "bd"] };
    default:
      return { fromId: "foreman", toIds: ["super", "foreman"] };
  }
}

function kindForPhase(phase: CommPhase, tick: number): CommKind {
  if (phase === "inspection")
    return tick % 2 === 0 ? "inspection_request" : "inspection_result";
  if (phase === "deficiency") return "escalation";
  if (phase === "mobilization" && tick < 4) return "handoff";
  if (phase === "closeout" && tick % 5 === 0) return "bd_lane";
  if (phase === "walkdown" && tick % 20 === 0) return "site_pack";
  return "status_update";
}

function textForTick(opts: {
  meta: IntervalMetaInput;
  phase: CommPhase;
  division: string;
  progress: number;
  ymd: string;
  hour: number;
  minute: number;
  vendorName?: string;
  nationalHint?: string;
  env?: string[];
}): string {
  const clock = `${pad2(opts.hour)}:${pad2(opts.minute)}`;
  const pct = Math.round(opts.progress * 100);
  const envBit =
    opts.env?.length && pct % 11 === 0
      ? ` Env watch: ${opts.env[pct % opts.env.length]}.`
      : "";
  const nat = opts.nationalHint ? ` National supply: ${opts.nationalHint}.` : "";
  const vendor = opts.vendorName ? ` Vendor ${opts.vendorName}.` : "";

  switch (opts.phase) {
    case "mobilization":
      return `[${opts.ymd} ${clock}] MOB Div ${opts.division} — site setup / access / stop-work brief. Progress ${pct}%.${vendor}${nat}`;
    case "walkdown":
      return `[${opts.ymd} ${clock}] WALK Div ${opts.division} — limits, stakes, and prep confirmed. Progress ${pct}%.${envBit}${nat}`;
    case "inspection":
      return `[${opts.ymd} ${clock}] INSP Div ${opts.division} — inspection traffic / readiness note. Progress ${pct}%.${vendor}`;
    case "deficiency":
      return `[${opts.ymd} ${clock}] HOLD Div ${opts.division} — field hold logged; super/foreman on path. Progress ${pct}%.${envBit}`;
    case "resolution":
      return `[${opts.ymd} ${clock}] FIX Div ${opts.division} — corrective work / evidence path. Progress ${pct}%.${vendor}`;
    case "closeout":
      return `[${opts.ymd} ${clock}] CLOSE Div ${opts.division} — closeout package / as-built trail. Progress ${pct}%.${nat}`;
    default:
      return `[${opts.ymd} ${clock}] WORK Div ${opts.division} — production interval log. Progress ${pct}%.${vendor}${envBit}${nat}`;
  }
}

/**
 * Generate the FULL 15-minute interval stream for one project (can be large).
 */
export function generateIntervalCommsFull(
  meta: IntervalMetaInput,
  org: CommOrg,
): { timeline: IntervalTimeline; messages: ProjectComm[] } {
  const timeline = computeIntervalTimeline(meta);
  const messages: ProjectComm[] = [];
  const env = meta.env ?? [];
  const nationals = meta.nationalVendorIds ?? [];
  let seq = 0;
  let fieldDayIndex = 0;

  for (let day = 0; day < timeline.durationCalendarDays; day++) {
    const ymd = addDays(timeline.startYmd, day);
    if (timeline.workdaysOnly && isWeekend(ymd)) continue;

    const dayProgressBase = fieldDayIndex / Math.max(1, timeline.fieldWorkDays);
    fieldDayIndex += 1;

    let slot = 0;
    for (
      let minutes = timeline.workdayStartHour * 60;
      minutes < timeline.workdayEndHour * 60;
      minutes += timeline.intervalMinutes
    ) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const slotProgress =
        slot / Math.max(1, timeline.intervalsPerWorkday - 1);
      const progress = Math.min(
        0.999,
        dayProgressBase + slotProgress / Math.max(1, timeline.fieldWorkDays),
      );
      slot += 1;
      seq += 1;

      const phase = phaseAtProgress(progress);
      const division = divisionForProgress(org, progress, phase);
      const { fromId, toIds } = recipientsForPhase(org, phase);
      const from = personById(org, fromId) ?? personByRole(org, "super");
      const tos = toIds
        .map((id) => personById(org, id))
        .filter(Boolean) as typeof org.people;
      let toRoles = [
        ...new Set(tos.map((p) => p.roleId as CommRoleId)),
      ] as CommRoleId[];
      let toNames = tos.map((p) => p.name);

      // Force critical routing
      if (phase === "deficiency") {
        const s = personByRole(org, "super");
        const f = personByRole(org, "foreman");
        toRoles = ["super", "foreman"];
        toNames = [s.name, f.name];
      }
      if (phase === "inspection" && !toRoles.includes("inspector") && !toRoles.includes("super")) {
        const s = personByRole(org, "super");
        const insp = personByRole(org, "inspector");
        toRoles = ["super", "inspector"];
        toNames = [s.name, insp.name];
      }

      const c = contractForDivision(org, division);
      const gap = routingGap(phase, toRoles);
      const kind = kindForPhase(phase, seq);
      const nationalHint =
        nationals.length > 0 && seq % 37 === 0
          ? nationals[seq % nationals.length]
          : undefined;

      // ISO timestamp approx for sorting
      const createdAt = new Date(
        `${ymd}T${pad2(hour)}:${pad2(minute)}:00.000Z`,
      ).toISOString();

      messages.push({
        id: `cm15_${meta.id}_${seq}`,
        projectId: meta.id,
        kind,
        phase,
        division,
        scopes: [division, "01"].filter((x, i, a) => a.indexOf(x) === i),
        fromRole: from.roleId as CommRoleId,
        toRoles,
        fromName: from.name,
        toNames,
        text: textForTick({
          meta,
          phase,
          division,
          progress,
          ymd,
          hour,
          minute,
          vendorName: c?.contractor,
          nationalHint,
          env,
        }),
        contractId: c?.id ?? "C-GC-01",
        vendorId: c?.vendorId ?? "v_gc",
        ackRequired: phase === "deficiency" || kind === "handoff",
        acked: false,
        programMonth: Math.floor(progress * (timeline.durationCalendarDays / 30)),
        createdAt,
        routingGap: gap,
      });
    }
  }

  return { timeline, messages };
}

/** Uniform + milestone sample for UI / localStorage */
export function sampleIntervalMessages(
  messages: ProjectComm[],
  cap: number = COMM_SAMPLE_CAP,
): ProjectComm[] {
  if (messages.length <= cap) return messages;
  const out: ProjectComm[] = [];
  const take = new Set<number>();
  // head + tail
  for (let i = 0; i < Math.min(40, messages.length); i++) take.add(i);
  for (let i = Math.max(0, messages.length - 40); i < messages.length; i++)
    take.add(i);
  // phase first hits
  const seenPhase = new Set<string>();
  for (let i = 0; i < messages.length; i++) {
    const ph = messages[i]!.phase;
    if (!seenPhase.has(ph)) {
      seenPhase.add(ph);
      take.add(i);
    }
  }
  // uniform fill
  const step = messages.length / (cap - take.size);
  for (let k = 0; k < cap && take.size < cap; k++) {
    take.add(Math.min(messages.length - 1, Math.floor(k * step)));
  }
  const idxs = [...take].sort((a, b) => a - b).slice(0, cap);
  for (const i of idxs) out.push(messages[i]!);
  return out;
}

/**
 * Build persistable interval log: full count + sample messages.
 * Optionally skip building full array when only meta needed (harness uses full).
 */
export function generateIntervalCommLog(
  meta: IntervalMetaInput,
  org: CommOrg,
  opts?: { materializeFull?: boolean; sampleCap?: number },
): IntervalCommLog {
  const sampleCap = opts?.sampleCap ?? COMM_SAMPLE_CAP;
  const { timeline, messages } = generateIntervalCommsFull(meta, org);
  const sampled = messages.length > sampleCap;
  const sample = sampleIntervalMessages(messages, sampleCap);

  return {
    version: 2,
    projectId: meta.id,
    mode: "interval_15m",
    intervalMinutes: 15,
    timeline,
    sampled,
    sampleCap,
    fullMessageCount: messages.length,
    messages: sample,
    generatedAt: new Date().toISOString(),
  };
}

export function expectedIntervalCount(meta: IntervalMetaInput): number {
  return computeIntervalTimeline(meta).totalIntervals;
}

export function validateIntervalCommLog(
  log: IntervalCommLog | null | undefined,
  meta: IntervalMetaInput,
  org: CommOrg,
): {
  ok: boolean;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
  fullCount?: number;
  expected?: number;
} {
  const checks: Array<{ id: string; ok: boolean; detail: string }> = [];
  if (!log) {
    return {
      ok: false,
      checks: [{ id: "IX.0", ok: false, detail: "log missing" }],
    };
  }

  const expected = expectedIntervalCount(meta);
  // Prefer full generation for hard count check
  const full = generateIntervalCommsFull(meta, org);
  const fullCount = full.messages.length;

  const countOk = fullCount === expected && expected > 0;
  checks.push({
    id: "IX.1",
    ok: countOk,
    detail: countOk
      ? `fullCount=${fullCount} matches expected=${expected}`
      : `count mismatch full=${fullCount} expected=${expected}`,
  });

  const durationOk = (meta.durationDays ?? INDUSTRY_DURATION_DAYS[meta.industry] ?? 0) >= 90;
  checks.push({
    id: "IX.2",
    ok: full.timeline.durationCalendarDays >= 60,
    detail: `durationDays=${full.timeline.durationCalendarDays} fieldDays=${full.timeline.fieldWorkDays}`,
  });

  const keyed = full.messages.every((m) => m.vendorId && m.contractId && m.division);
  checks.push({
    id: "IX.3",
    ok: keyed,
    detail: keyed ? "all interval msgs division+vendor+contract keyed" : "keying failed",
  });

  const criticalGaps = full.messages.filter(
    (m) =>
      m.routingGap &&
      (m.phase === "deficiency" ||
        m.phase === "closeout" ||
        m.phase === "inspection"),
  );
  checks.push({
    id: "IX.4",
    ok: criticalGaps.length === 0,
    detail:
      criticalGaps.length === 0
        ? "no critical routing gaps in full stream"
        : `critical gaps=${criticalGaps.length}`,
  });

  const phases = new Set(full.messages.map((m) => m.phase));
  const phaseOk =
    phases.has("mobilization") &&
    phases.has("active_work") &&
    phases.has("closeout");
  checks.push({
    id: "IX.5",
    ok: phaseOk,
    detail: phaseOk
      ? `phases=${[...phases].join(",")}`
      : "missing mobilization/active/closeout",
  });

  // Persist shape
  const intervalLog = log as IntervalCommLog;
  const metaOk =
    intervalLog.mode === "interval_15m" &&
    intervalLog.fullMessageCount === expected &&
    (intervalLog.messages?.length ?? 0) > 0 &&
    (intervalLog.messages?.length ?? 0) <= (intervalLog.sampleCap ?? COMM_SAMPLE_CAP) + 50;
  checks.push({
    id: "IX.6",
    ok: metaOk,
    detail: metaOk
      ? `persisted sample=${intervalLog.messages?.length} fullMessageCount=${intervalLog.fullMessageCount}`
      : "persist meta/sample shape invalid",
  });

  // Vendor diversity across stream
  const vendors = new Set(full.messages.map((m) => m.vendorId));
  checks.push({
    id: "IX.7",
    ok: vendors.size >= 2,
    detail: `vendors in stream=${vendors.size}`,
  });

  return {
    ok: checks.every((c) => c.ok),
    checks,
    fullCount,
    expected,
  };
}

/** Suite-level stats without holding all full streams */
export function estimateSuiteIntervalStats(
  projects: IntervalMetaInput[],
): {
  projects: number;
  totalMessages: number;
  min: number;
  max: number;
  p50: number;
  byIndustry: Record<string, { n: number; msgs: number; days: number }>;
} {
  const counts: number[] = [];
  const byIndustry: Record<string, { n: number; msgs: number; days: number }> = {};
  for (const p of projects) {
    const t = computeIntervalTimeline(p);
    counts.push(t.totalIntervals);
    const ind = p.industry || "unknown";
    if (!byIndustry[ind]) byIndustry[ind] = { n: 0, msgs: 0, days: 0 };
    byIndustry[ind]!.n += 1;
    byIndustry[ind]!.msgs += t.totalIntervals;
    byIndustry[ind]!.days += t.durationCalendarDays;
  }
  counts.sort((a, b) => a - b);
  const totalMessages = counts.reduce((a, b) => a + b, 0);
  return {
    projects: counts.length,
    totalMessages,
    min: counts[0] ?? 0,
    max: counts[counts.length - 1] ?? 0,
    p50: counts[Math.floor(counts.length * 0.5)] ?? 0,
    byIndustry,
  };
}
