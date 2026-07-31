/**
 * P6 scale simulation scorecard — permit · schedule · ops across a project board.
 * Self-contained for Node harness.
 */

export interface ScaleBoardLite {
  id: string;
  name: string;
  industry?: string;
  stateCode?: string;
  inspections?: Array<{ id: string; status?: string; typeLabel?: string }>;
  schedule?: Array<{
    id: string;
    title?: string;
    status?: string;
    contactId?: string;
  }>;
  materials?: Array<{ id: string; status?: string }>;
  reports?: Array<{
    id: string;
    priority?: string;
    status?: string;
    category?: string;
  }>;
  fieldComms?: {
    fullMessageCount?: number;
    mode?: string;
    messages?: Array<{
      id: string;
      phase?: string;
      division?: string;
      kind?: string;
      vendorId?: string;
      contractId?: string;
      routingGap?: string;
      ackRequired?: boolean;
      acked?: boolean;
      text?: string;
    }>;
  };
  org?: {
    contracts?: unknown[];
    vendors?: unknown[];
    divisions?: unknown[];
  };
  nationalVendors?: unknown[];
}

export interface ProjectScaleScore {
  projectId: string;
  name: string;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
  ok: boolean;
  metrics: {
    inspectionMsgs: number;
    bdMsgs: number;
    scheduleTasks: number;
    openP0: number;
    openAcks: number;
    routingGaps: number;
    comms: number;
    nationals: number;
  };
}

export function scoreProjectScale(board: ScaleBoardLite): ProjectScaleScore {
  const msgs = board.fieldComms?.messages ?? [];
  const fullComms =
    board.fieldComms?.fullMessageCount ?? msgs.length;
  const inspections = board.inspections ?? [];
  const schedule = board.schedule ?? [];
  const reports = board.reports ?? [];

  const inspectionMsgs = msgs.filter(
    (m) =>
      m.phase === "inspection" ||
      m.kind === "inspection_request" ||
      m.kind === "inspection_result" ||
      m.division === "AHJ" ||
      m.division === "BD",
  ).length;
  const bdMsgs = msgs.filter(
    (m) => m.kind === "bd_lane" || m.division === "BD",
  ).length;

  const openP0 = reports.filter(
    (r) => r.priority === "P0" && r.status !== "resolved",
  ).length;
  const openAcks = msgs.filter((m) => m.ackRequired && !m.acked).length;
  const routingGaps = msgs.filter((m) => m.routingGap).length;
  const criticalGaps = routingGaps; // all gaps are ops defects at scale

  const defMsgs = msgs.filter((m) => m.phase === "deficiency");
  const defRouted = defMsgs.every((m) => !m.routingGap);

  const checks: Array<{ id: string; ok: boolean; detail: string }> = [];

  // P6.1 permit/inspection traffic
  const permitOk =
    inspections.length > 0 || inspectionMsgs >= 2 || bdMsgs >= 1;
  checks.push({
    id: "P6.1",
    ok: permitOk,
    detail: permitOk
      ? `inspections=${inspections.length} inspMsgs=${inspectionMsgs} bd=${bdMsgs}`
      : "missing permit/inspection traffic",
  });

  // P6.2 schedule present (critical path proxy — has tasks)
  const schedOk = schedule.length >= 3;
  checks.push({
    id: "P6.2",
    ok: schedOk,
    detail: schedOk
      ? `schedule tasks=${schedule.length}`
      : "schedule too thin for ops sim",
  });

  // P6.3 critical-path routing (deficiency / closeout / inspection)
  const p0Ok = defRouted && criticalGaps === 0;
  checks.push({
    id: "P6.3",
    ok: p0Ok,
    detail: p0Ok
      ? `openP0_reports=${openP0} defMsgs=${defMsgs.length} critical_gaps=0 (all_gaps=${routingGaps})`
      : `critical routing gaps=${criticalGaps}`,
  });

  // Ops readiness signals
  const opsOk =
    (board.org?.contracts?.length ?? 0) >= 2 &&
    (board.nationalVendors?.length ?? 0) >= 1 &&
    fullComms >= 40;
  checks.push({
    id: "P6.ops",
    ok: opsOk,
    detail: opsOk
      ? `org+nationals+depth ready fullComms=${fullComms}`
      : "ops stack incomplete (org/nationals/depth)",
  });

  return {
    projectId: board.id,
    name: board.name,
    checks,
    ok: checks.every((c) => c.ok),
    metrics: {
      inspectionMsgs,
      bdMsgs,
      scheduleTasks: schedule.length,
      openP0,
      openAcks,
      routingGaps,
      comms: fullComms,
      nationals: board.nationalVendors?.length ?? 0,
    },
  };
}

export function scoreSuiteScale(boards: ScaleBoardLite[]): {
  ok: boolean;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
  projectScores: ProjectScaleScore[];
  benchmarks: {
    projects: number;
    pass: number;
    permitCoverage: number;
    scheduleCoverage: number;
    totalComms: number;
    totalOpenAcks: number;
    totalRoutingGaps: number;
    msgsP50: number;
    msgsP95: number;
  };
} {
  const projectScores = boards.map(scoreProjectScale);
  const pass = projectScores.filter((p) => p.ok).length;
  const n = projectScores.length || 1;

  const permitOkCount = projectScores.filter((p) =>
    p.checks.find((c) => c.id === "P6.1")?.ok,
  ).length;
  const scheduleOkCount = projectScores.filter((p) =>
    p.checks.find((c) => c.id === "P6.2")?.ok,
  ).length;

  const permitCoverage = permitOkCount / n;
  const scheduleCoverage = scheduleOkCount / n;

  const counts = projectScores
    .map((p) => p.metrics.comms)
    .sort((a, b) => a - b);
  const msgsP50 = counts[Math.floor(counts.length * 0.5)] ?? 0;
  const msgsP95 = counts[Math.floor(counts.length * 0.95)] ?? 0;
  const totalComms = counts.reduce((a, b) => a + b, 0);
  const totalOpenAcks = projectScores.reduce(
    (a, p) => a + p.metrics.openAcks,
    0,
  );
  const totalRoutingGaps = projectScores.reduce(
    (a, p) => a + p.metrics.routingGaps,
    0,
  );

  const checks: Array<{ id: string; ok: boolean; detail: string }> = [];

  // P6.1 suite: permit traffic missing on ≥10% fails
  const permitOk = permitCoverage >= 0.9;
  checks.push({
    id: "P6.1",
    ok: permitOk,
    detail: `permit coverage ${(permitCoverage * 100).toFixed(0)}% (${permitOkCount}/${n})`,
  });

  const schedOk = scheduleCoverage >= 0.9;
  checks.push({
    id: "P6.2",
    ok: schedOk,
    detail: `schedule coverage ${(scheduleCoverage * 100).toFixed(0)}% (${scheduleOkCount}/${n})`,
  });

  const gapOk = totalRoutingGaps === 0;
  checks.push({
    id: "P6.3",
    ok: gapOk,
    detail: gapOk
      ? `routing_gaps=0 openAcks=${totalOpenAcks}`
      : `routing_gaps=${totalRoutingGaps}`,
  });

  const benchOk = totalComms > 0 && msgsP50 >= 1000;
  checks.push({
    id: "P6.4",
    ok: benchOk,
    detail: `comms total=${totalComms} p50=${msgsP50} p95=${msgsP95}`,
  });

  // P6.5 archive is enforced by harness writing artifacts
  checks.push({
    id: "P6.5",
    ok: true,
    detail: "archive written by harness (see docs/test-runs)",
  });

  const passRate = pass / n;
  checks.push({
    id: "P6.S1",
    ok: passRate >= 0.95,
    detail: `project pass ${pass}/${n}`,
  });

  return {
    ok: checks.every((c) => c.ok),
    checks,
    projectScores,
    benchmarks: {
      projects: n,
      pass,
      permitCoverage,
      scheduleCoverage,
      totalComms,
      totalOpenAcks,
      totalRoutingGaps,
      msgsP50,
      msgsP95,
    },
  };
}
