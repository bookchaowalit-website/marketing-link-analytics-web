"use client";

import { useMemo, useState } from "react";
import { ChartPanel, DashFoot, DashTop, Pill, Segmented, Stat } from "@/components/dashboard-shell";
import { AXIS_START, chartRows, formatChange, formatCount, RANGES, REPORTS, reportCsv, rowsForRange, type Range } from "@/lib/report";

const RANGE_LABELS: Record<Range, string> = { "24h": "24 hours", "7d": "7 days", "30d": "30 days" };
const PERIODS = RANGES.map((id) => ({ id, label: RANGE_LABELS[id] }));

export default function Home() {
  const [range, setRange] = useState<Range>("7d");
  const [selected, setSelected] = useState<string | null>(null);
  const report = REPORTS[range];
  const rows = useMemo(() => rowsForRange(range), [range]);
  const intervals = useMemo(() => chartRows(range), [range]);
  const highlight = rows.find((row) => row.name === selected);
  const period = RANGE_LABELS[range];

  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob([reportCsv(range)], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `link-analytics-sample-${range}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ds">
      <a className="ds-skip" href="#main">Skip to content</a>
      <DashTop name="Link analytics" tagline="Three sample short links" />

      <main id="main" tabIndex={-1} className="ds-main">
        <div className="ds-head">
          <div>
            <h1>Link clicks</h1>
            <p>Last {period} · clicks on short links <Pill tone="grey">Sample data</Pill></p>
          </div>
          <Segmented label="Period" options={PERIODS} value={range} onChange={(next) => setRange(next)} />
        </div>

        <ul className="ds-stats" aria-label={`Last ${period} at a glance`}>
          <Stat label="Clicks" value={formatCount(report.clicks)} note={`${formatChange(report.change)} on the period before`} />
          <Stat label="Live links" value={report.links} note="in the sample set" />
          <Stat label="Click rate" value={`${report.ctr.toFixed(1)}%`} note="estimated" />
          <Stat label="Top region" value={report.geo} note="by clicks" />
        </ul>

        <div className="ds-grid">
          <ChartPanel
            title="Click volume"
            subtitle={`Last ${period}, relative volume on a 0–100 scale`}
            summary={`Illustrative click volume for the last ${period}, ${report.bars.length} intervals, trending ${formatChange(report.change)}.`}
            values={report.bars}
            labels={intervals.map((row) => row.label)}
            ticks={[0, report.bars.length - 1]}
            tickLabels={[AXIS_START[range], "now"]}
            max={100}
            unit="Relative volume, %"
            labelHeading="Interval"
          />

          <section className="ds-panel" aria-labelledby="links-heading">
            <div className="ds-panel-head">
              <div>
                <h2 id="links-heading">Short links</h2>
                <p>Clicks and share of the period</p>
              </div>
              <button type="button" className="ds-plain" onClick={downloadCsv}>Download CSV</button>
            </div>
            <ul className="ds-rows">
              {rows.map((row) => (
                <li key={row.name}>
                  <button type="button" className="ds-row" aria-pressed={selected === row.name} onClick={() => setSelected(selected === row.name ? null : row.name)}>
                    <span className="ds-row-name"><span className="ds-dot" data-tone={row.status === "active" ? "green" : undefined} aria-hidden="true" />{row.name}</span>
                    <span className="ds-row-detail">{row.status === "active" ? "Active" : "Quiet"} · {row.share}% of clicks</span>
                    <span className="ds-row-value">{formatCount(row.clicks)}</span>
                    <span className="ds-meter" aria-hidden="true"><span style={{ width: `${row.share}%` }} /></span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="ds-callout" aria-live="polite">
              {highlight ? (
                <>
                  <strong>{highlight.name}</strong>
                  <span>{formatCount(highlight.clicks)} sample clicks ({highlight.share}%) in the last {period}. Goes to <a href={highlight.destination} target="_blank" rel="noopener noreferrer">{highlight.destination.replace(/^https:\/\//, "")}</a>.</span>
                </>
              ) : (
                <>
                  <strong>Pick a link</strong>
                  <span>Select a short link to see where it goes and its share of clicks.</span>
                </>
              )}
            </div>
          </section>
        </div>

        <p className="ds-note">All figures are illustrative and stay in this browser view. No backend is connected, and no click is sent or stored from this page.</p>
      </main>

      <DashFoot source="https://github.com/bookchaowalit-website/marketing-link-analytics-web" />
    </div>
  );
}
