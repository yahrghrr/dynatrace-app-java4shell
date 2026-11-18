import React, { useMemo, useState } from "react";

import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { DataTable, type DataTableColumnDef } from "@dynatrace/strato-components/tables";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { useDql } from "@dynatrace-sdk/react-hooks";

import {
  JAVA_PROCESS_QUERY,
  TOTAL_PROCESS_QUERY,
  type JavaProcessRow,
  type Status,
} from "../queries";

/* ------------------------------------------------------------------ palette */

const RED = "#ff2d46";
const RED_DEEP = "#b3001b";
const ORANGE = "#ff8a1f";
const GREEN = "#2fd27a";
const AMBER = "#ffc233";

const STATUS_META: Record<Status, { label: string; color: string; rank: number }> = {
  VULNERABLE_VERSION: { label: "Vulnerable version", color: RED, rank: 2 },
  NON_LTS_UNPATCHED: { label: "Non-LTS, unpatched", color: ORANGE, rank: 1 },
  OK: { label: "Patched", color: GREEN, rank: 0 },
};

/* ------------------------------------------------------------------ data */

interface ProcessSummary {
  id: string;
  host: string;
  status: Status;
  mitigated: boolean;
}

function summarize(rows: JavaProcessRow[]) {
  // A process can report more than one Java version; keep its worst status.
  const byId = new Map<string, ProcessSummary>();
  for (const r of rows) {
    const id = r["process.id"];
    const prev = byId.get(id);
    const status: Status = r.status in STATUS_META ? r.status : "OK";
    if (!prev) {
      byId.set(id, { id, host: r.host ?? "unknown", status, mitigated: !!r.mitigation_flag });
    } else {
      if (STATUS_META[status].rank > STATUS_META[prev.status].rank) prev.status = status;
      prev.mitigated = prev.mitigated || !!r.mitigation_flag;
    }
  }
  const procs = [...byId.values()];
  const impacted = procs.filter((p) => p.status !== "OK");
  return {
    javaTotal: procs.length,
    impacted: impacted.length,
    vulnerable: impacted.filter((p) => p.status === "VULNERABLE_VERSION").length,
    nonLts: impacted.filter((p) => p.status === "NON_LTS_UNPATCHED").length,
    mitigated: impacted.filter((p) => p.mitigated).length,
    unmitigated: impacted.filter((p) => !p.mitigated).length,
    javaOk: procs.length - impacted.length,
    hostsAffected: new Set(impacted.map((p) => p.host)).size,
  };
}

/* ------------------------------------------------------------------ styles */

const KEYFRAMES = `
@keyframes j4s-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,45,70,.55), 0 0 32px rgba(255,45,70,.35); }
                       50%     { box-shadow: 0 0 0 10px rgba(255,45,70,0), 0 0 48px rgba(255,45,70,.55); } }
@keyframes j4s-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes j4s-blink { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
`;

const card = (accent: string, glow = false): React.CSSProperties => ({
  position: "relative",
  flex: "1 1 180px",
  minWidth: 180,
  padding: "18px 20px",
  borderRadius: 14,
  background: `linear-gradient(160deg, ${accent}22 0%, ${accent}08 60%, transparent 100%)`,
  border: `1px solid ${accent}66`,
  boxShadow: glow ? `0 0 28px ${accent}40` : "none",
  overflow: "hidden",
});

/* ------------------------------------------------------------------ pieces */

const StatTile = ({
  label,
  value,
  hint,
  accent,
  glow,
  big,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent: string;
  glow?: boolean;
  big?: boolean;
}) => (
  <div style={{ ...card(accent, glow), animation: glow ? "j4s-pulse 2.4s ease-in-out infinite" : undefined }}>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: accent }} />
    <div style={{ fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", opacity: 0.8 }}>{label}</div>
    <div
      style={{
        fontSize: big ? 56 : 38,
        fontWeight: 800,
        lineHeight: 1.1,
        color: accent,
        textShadow: `0 0 18px ${accent}80`,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </div>
    {hint && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{hint}</div>}
  </div>
);

/** Ring showing the impacted share of all processes. */
const ThreatRing = ({ impacted, total }: { impacted: number; total: number }) => {
  const r = 70;
  const c = 2 * Math.PI * r;
  const share = total > 0 ? impacted / total : 0;
  const pct = total > 0 ? (share * 100).toFixed(share > 0 && share < 0.001 ? 2 : 1) : "0";
  return (
    <svg viewBox="0 0 180 180" width={180} height={180} role="img" aria-label={`${pct}% of processes impacted`}>
      <circle cx="90" cy="90" r={r} fill="none" stroke={`${GREEN}55`} strokeWidth="16" />
      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke={RED}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={`${share * c} ${c}`}
        transform="rotate(-90 90 90)"
        style={{ filter: `drop-shadow(0 0 8px ${RED})`, transition: "stroke-dasharray .8s ease" }}
      />
      <text x="90" y="88" textAnchor="middle" fontSize="30" fontWeight="800" fill={impacted > 0 ? RED : GREEN}>
        {pct}%
      </text>
      <text x="90" y="110" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.75" letterSpacing="1.5">
        IMPACTED
      </text>
    </svg>
  );
};

const StatusBadge = ({ status }: { status: Status }) => {
  const m = STATUS_META[status] ?? STATUS_META.OK;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: m.color,
        background: `${m.color}1f`,
        border: `1px solid ${m.color}80`,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />
      {m.label}
    </span>
  );
};

/* ------------------------------------------------------------------ page */

export const Detector = () => {
  const javaQuery = useDql({ query: JAVA_PROCESS_QUERY });
  const totalQuery = useDql({ query: TOTAL_PROCESS_QUERY });
  const [showAll, setShowAll] = useState(false);
  const [showQuery, setShowQuery] = useState(false);

  const rows = useMemo(
    () => (javaQuery.data?.records ?? []) as unknown as JavaProcessRow[],
    [javaQuery.data],
  );
  const s = useMemo(() => summarize(rows), [rows]);

  const totalRaw = totalQuery.data?.records?.[0]?.total;
  const totalProcesses = totalRaw != null ? Number(totalRaw) : s.javaTotal;
  const notImpacted = Math.max(totalProcesses - s.impacted, 0);

  // isFetching covers the first load and every Rescan; isLoading is only true for the first load.
  const isLoading = javaQuery.isFetching || totalQuery.isFetching;
  const error = javaQuery.error ?? totalQuery.error;
  const scanned = !isLoading && !error && !!javaQuery.data;
  const underAttack = s.impacted > 0;

  const tableRows = useMemo(
    () => (showAll ? rows : rows.filter((r) => r.status !== "OK")),
    [rows, showAll],
  );

  const columns = useMemo<DataTableColumnDef<JavaProcessRow>[]>(
    () => [
      {
        id: "status",
        header: "Status",
        accessor: "status",
        width: 190,
        cell: ({ value }) => (
          <DataTable.DefaultCell>
            <StatusBadge status={value as Status} />
          </DataTable.DefaultCell>
        ),
      },
      {
        id: "mitigation",
        header: "Mitigation",
        accessor: "mitigation_flag",
        width: 150,
        cell: ({ value }) => (
          <DataTable.DefaultCell>
            {value ? (
              <span style={{ color: AMBER, fontWeight: 700 }}>🛡 Flag set</span>
            ) : (
              <span style={{ color: RED, fontWeight: 700 }}>✕ None</span>
            )}
          </DataTable.DefaultCell>
        ),
      },
      { id: "host", header: "Host", accessor: "host" },
      { id: "arch", header: "Arch", accessor: (r) => r["host.arch"], width: 100 },
      { id: "process", header: "Process", accessor: "process" },
      { id: "pg", header: "Process group", accessor: "process_group" },
      { id: "edition", header: "Java edition", accessor: (r) => r["java.edition"], width: 140 },
      {
        id: "version",
        header: "Java version",
        accessor: (r) => r["java.version"],
        width: 130,
        cell: ({ value, rowData }) => (
          <DataTable.DefaultCell>
            <code style={{ color: STATUS_META[rowData.status]?.color, fontWeight: 700 }}>{String(value ?? "")}</code>
          </DataTable.DefaultCell>
        ),
      },
    ],
    [],
  );

  const rescan = () => {
    // forceRefetch bypasses the hook's 60 s cache, so Rescan always queries Grail again.
    void javaQuery.forceRefetch();
    void totalQuery.forceRefetch();
  };

  return (
    <Flex flexDirection="column" gap={24} padding={24}>
      <style>{KEYFRAMES}</style>

      {/* ---------------- hero ---------------- */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          padding: "28px 32px",
          color: "#fff",
          background: `radial-gradient(1200px 400px at 0% 0%, ${RED_DEEP}cc 0%, transparent 60%),
                       linear-gradient(135deg, #1a0306 0%, #0a0103 100%)`,
          border: `1px solid ${RED}55`,
          boxShadow: `0 10px 40px ${RED}30`,
        }}
      >
        {/* radar sweep */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${RED}00 0deg, ${RED}55 40deg, ${RED}00 70deg)`,
            animation: "j4s-sweep 4s linear infinite",
            opacity: 0.6,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <Flex alignItems="center" gap={24} flexWrap="wrap" style={{ position: "relative" }}>
          <img
            src="./assets/java4shell-logo.svg"
            alt="Java4Shell logo"
            width={96}
            height={96}
            style={{ filter: `drop-shadow(0 0 18px ${RED})` }}
          />
          <Flex flexDirection="column" gap={4} style={{ flex: "1 1 320px" }}>
            <span style={{ fontSize: 12, letterSpacing: 3, color: "#ff9aa6", fontWeight: 700 }}>
              THREAT SCANNER · SMARTSCAPE
            </span>
            <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1 }}>
              Java4Shell <span style={{ color: RED, textShadow: `0 0 18px ${RED}` }}>Vulnerability</span> Detector
            </span>
            <span style={{ opacity: 0.8, maxWidth: 720 }}>
              Scans every Java process in this environment for unpatched JDK versions and checks whether the
              mitigation flags (<code>-XX:-UseBASE64Intrinsics</code> or <code>-XX:UseAVX=2</code>) are set.
            </span>
          </Flex>

          <Flex flexDirection="column" alignItems="flex-end" gap={12}>
            <span
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                fontWeight: 900,
                letterSpacing: 2,
                fontSize: 14,
                color: !scanned ? "#fff" : underAttack ? "#fff" : "#062",
                background: !scanned ? "#ffffff22" : underAttack ? RED : GREEN,
                boxShadow: scanned ? `0 0 24px ${underAttack ? RED : GREEN}` : "none",
                animation: scanned && underAttack ? "j4s-blink 1.6s ease-in-out infinite" : undefined,
              }}
            >
              {isLoading ? "SCANNING…" : error ? "SCAN FAILED" : underAttack ? "⚠ EXPOSED" : "✓ ALL CLEAR"}
            </span>
            <Button variant="emphasized" color="critical" onClick={rescan} disabled={isLoading}>
              {isLoading ? "Scanning…" : "Rescan"}
            </Button>
          </Flex>
        </Flex>
      </div>

      {error && (
        <div style={{ ...card(RED), color: Colors.Text.Critical.Default }}>
          <strong>Query failed:</strong> {error.message}
          <Paragraph>
            The app needs the <code>storage:smartscape:read</code> permission. Check that your user has it in this
            environment.
          </Paragraph>
        </div>
      )}

      {/* ---------------- headline numbers ---------------- */}
      <Flex gap={16} flexWrap="wrap" alignItems="stretch">
        <div style={{ ...card(RED, underAttack), flex: "0 0 auto", display: "flex", alignItems: "center", gap: 20 }}>
          <ThreatRing impacted={s.impacted} total={totalProcesses} />
          <Flex flexDirection="column" gap={6}>
            <Text style={{ fontSize: 12, letterSpacing: 1.4, opacity: 0.8 }}>PROCESSES SCANNED</Text>
            <span style={{ fontSize: 30, fontWeight: 800 }}>{isLoading ? "–" : totalProcesses}</span>
            <Text style={{ fontSize: 12, opacity: 0.75 }}>
              {isLoading ? "" : `${s.javaTotal} running Java`}
            </Text>
          </Flex>
        </div>

        <StatTile
          big
          glow={underAttack}
          accent={RED}
          label="Impacted processes"
          value={isLoading ? "–" : s.impacted}
          hint={isLoading ? undefined : `${s.unmitigated} without mitigation flag`}
        />
        <StatTile
          big
          accent={GREEN}
          label="Not impacted"
          value={isLoading ? "–" : notImpacted}
          hint={isLoading ? undefined : `${s.javaOk} patched Java + ${Math.max(notImpacted - s.javaOk, 0)} non-Java`}
        />
      </Flex>

      <Flex gap={16} flexWrap="wrap">
        <StatTile accent={RED} label="Vulnerable version" value={isLoading ? "–" : s.vulnerable} hint="Known-vulnerable LTS build" />
        <StatTile accent={ORANGE} label="Non-LTS unpatched" value={isLoading ? "–" : s.nonLts} hint="Java 18+ non-LTS release" />
        <StatTile accent={AMBER} label="Mitigation flag set" value={isLoading ? "–" : s.mitigated} hint="Impacted, but workaround applied" />
        <StatTile accent={RED} label="Hosts affected" value={isLoading ? "–" : s.hostsAffected} hint="Hosts running impacted processes" />
      </Flex>

      {/* ---------------- detail table ---------------- */}
      <Flex flexDirection="column" gap={12}>
        <Flex justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
          <Heading level={4}>
            {showAll ? "All Java processes" : "Impacted processes"}{" "}
            <span style={{ color: RED }}>({tableRows.length})</span>
          </Heading>
          <Flex gap={8}>
            <Button onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show impacted only" : "Show all Java processes"}
            </Button>
            <Button onClick={() => setShowQuery((v) => !v)}>{showQuery ? "Hide query" : "Show query"}</Button>
          </Flex>
        </Flex>

        {showQuery && (
          <pre
            style={{
              margin: 0,
              padding: 16,
              borderRadius: 12,
              background: "#0d0204",
              color: "#ffd2d7",
              border: `1px solid ${RED}44`,
              fontSize: 12,
              overflowX: "auto",
            }}
          >
            {JAVA_PROCESS_QUERY}
          </pre>
        )}

        <div style={{ borderRadius: 12, border: `1px solid ${RED}44`, overflow: "hidden" }}>
          <DataTable
            data={tableRows}
            columns={columns}
            loading={isLoading}
            sortable
            fullWidth
            variant={{ verticalAlignment: "center" }}
          >
            <DataTable.Pagination defaultPageSize={25} pageSizeOptions={[10, 25, 50, 100]} />
            <DataTable.EmptyState>
              {scanned ? "🎉 No impacted Java processes found." : "Waiting for scan results…"}
            </DataTable.EmptyState>
          </DataTable>
        </div>
      </Flex>
    </Flex>
  );
};
