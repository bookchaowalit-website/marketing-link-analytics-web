"use client";

import { useMemo, useState } from "react";
import { ChartPanel, DashFoot, DashTop, Pill, Segmented, Stat } from "@/components/dashboard-shell";
import { axisTicks, chartExtremes, chartRows, formatChange, formatCount, hasNoChartData, hasNoClicks, RANGES, regionName, reportCsv, rowsForRange, type LinkRow, type Range, type Report } from "@/lib/report";

const RANGE_LABELS: Record<Range, string> = { "24h": "24 hours", "7d": "7 days", "30d": "30 days" };
const PERIODS = RANGES.map((id) => ({ id, label: RANGE_LABELS[id] }));

/** The whole report for a set of links; takes the data so empty sets can be rendered and tested. */
export function LinkReport({ reports, rows: links }: { reports: Record<Range, Report>; rows: LinkRow[] }) {
  const [range, setRange] = useState<Range>("7d");
  const [selected, setSelected] = useState<string | null>(null);
  const report = reports[range];
  const rows = useMemo(() => rowsForRange(range, links, reports), [range, links, reports]);
  const intervals = useMemo(() => chartRows(range, reports), [range, reports]);
  const highlight = rows.find((row) => row.name === selected);
  const period = RANGE_LABELS[range];
  const noLinks = links.length === 0;
  const noClicks = hasNoClicks(report);
  const noChart = noClicks || hasNoChartData(report);
  const extremes = chartExtremes(range, reports);
  const extremesText = extremes ? `: lowest ${formatCount(extremes.low.clicks)} (${extremes.low.label}), highest ${formatCount(extremes.high.clicks)} (${extremes.high.label})` : "";
  const axis = axisTicks(range, intervals.length);
  // The top bar and the stat tile count the same thing: the short links in this set.
  const linkCount = `${links.length} sample short ${links.length === 1 ? "link" : "links"}`;

  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob([reportCsv(range, links, reports)], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `link-analytics-sample-${range}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ds">
      <a className="ds-skip" href="#main">Skip to content</a>
      <DashTop name="Link analytics" tagline={linkCount} />

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
          <Stat label="Short links" value={links.length} note="in the sample set" />
          <Stat label="Click rate" value={`${report.ctr.toFixed(1)}%`} note="clicks per view, estimated" />
          <Stat label="Top region" value={noClicks ? "—" : regionName(report.geo)} note={noClicks ? "no clicks yet" : `${report.geo.toUpperCase()} · by clicks`} />
        </ul>

        {/* The links come first in the DOM, so they lead on phones and in Tab order; on wide screens they take the narrow column. */}
        <div className="ds-grid ds-grid-narrow-first">
          <section className="ds-panel" aria-labelledby="links-heading">
            <div className="ds-panel-head">
              <div>
                <h2 id="links-heading">Short links</h2>
                <p>Clicks and share of the period</p>
              </div>
              {noLinks ? null : <button type="button" className="ds-plain" onClick={downloadCsv}>Download CSV ({period})</button>}
            </div>
            {noLinks ? (
              <p className="ds-callout" role="status">
                <strong>No short links yet</strong>
                <span>Create a short link to see its clicks and share of the period here.</span>
              </p>
            ) : noClicks ? (
              <p className="ds-callout" role="status">
                <strong>No clicks in the last {period}</strong>
                <span>Your short links got no clicks in this period. Try a longer period.</span>
              </p>
            ) : (
              <>
                <ul className="ds-rows">
                  {rows.map((row) => {
                    // One tone per row, from its status, for both the dot and the share bar.
                    const tone = row.status === "active" ? "green" : "grey";
                    return (
                      <li key={row.name}>
                        <button type="button" className="ds-row" aria-pressed={selected === row.name} onClick={() => setSelected(selected === row.name ? null : row.name)}>
                          <span className="ds-row-name"><span className="ds-dot" data-tone={tone} aria-hidden="true" />{row.name}</span>
                          <span className="ds-row-detail">{row.status === "active" ? "Active" : "Quiet"} · {row.share}% of clicks</span>
                          <span className="ds-row-value">{formatCount(row.clicks)}</span>
                          <span className="ds-meter" data-tone={tone} aria-hidden="true"><span style={{ width: `${row.share}%` }} /></span>
                        </button>
                      </li>
                    );
                  })}
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
              </>
            )}
          </section>

          {noChart ? (
            <section className="ds-panel" aria-labelledby="volume-heading">
              <div className="ds-panel-head">
                <div>
                  <h2 id="volume-heading">Click volume</h2>
                  <p>Last {period}</p>
                </div>
              </div>
              {noClicks ? (
                <p className="ds-callout" role="status">
                  <strong>No clicks in the last {period}</strong>
                  <span>{noLinks ? "There are no short links yet, so there is nothing to chart." : "Your short links got no clicks in this period, so there is nothing to chart."}</span>
                </p>
              ) : (
                <p className="ds-callout" role="status">
                  <strong>No interval data for the last {period}</strong>
                  <span>{formatCount(report.clicks)} clicks were counted, but not split by interval, so there is nothing to chart.</span>
                </p>
              )}
            </section>
          ) : (
            <ChartPanel
              title="Click volume"
              subtitle={`Last ${period} · clicks per interval, ${formatCount(report.clicks)} in all`}
              summary={`Illustrative clicks for the last ${period}, ${intervals.length} intervals${extremesText}; trending ${formatChange(report.change)}.`}
              values={intervals.map((row) => row.clicks)}
              labels={intervals.map((row) => row.label)}
              // Each point counts one interval, so it sits at the interval's centre; the ticks mark interval edges.
              ticks={axis.ticks}
              tickLabels={axis.labels}
              buckets
              max={Math.max(...intervals.map((row) => row.clicks))}
              unit="Clicks"
              yUnit="clicks"
              labelHeading="Interval"
            />
          )}
        </div>

        <p className="ds-note">All figures are illustrative and stay in this browser view. No backend is connected, and no click is sent or stored from this page.</p>
      </main>

      <DashFoot source="https://github.com/bookchaowalit-website/marketing-link-analytics-web" />
    </div>
  );
}
