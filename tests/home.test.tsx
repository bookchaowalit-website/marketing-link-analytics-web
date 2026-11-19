// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { LinkReport } from "@/components/link-report";
import { REPORTS, ROWS } from "@/lib/report";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const button = (text: string) => [...host.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement;
const press = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
const stats = () => [...host.querySelectorAll(".ds-stat")].map((tile) => tile.textContent);
const callout = () => host.querySelector(".ds-callout")?.textContent;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Home />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("link analytics page", () => {
  it("gives each row's status dot and share bar the same tone from its status", () => {
    const rows = [...host.querySelectorAll(".ds-rows .ds-row")];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const dot = row.querySelector(".ds-dot")!.getAttribute("data-tone");
      const bar = row.querySelector(".ds-meter")!.getAttribute("data-tone");
      expect(bar).toBe(dot);
      expect(dot).toBe(row.textContent!.includes("Active") ? "green" : "grey");
    }
  });

  it("opens on 7 days with the headline figures and the sample notice", () => {
    expect(host.querySelector("h1")?.textContent).toBe("Link clicks");
    expect(button("7 days").getAttribute("aria-pressed")).toBe("true");
    expect(stats()).toEqual(["Clicks8,420+14.8% on the period before", "Short links3in the sample set", "Click rate3.4%clicks per view, estimated", "Top regionThailandTH · by clicks"]);
    // The top bar counts the links with the same number and words as the stat tile.
    expect(host.querySelector(".ds-top")?.textContent).toContain("3 sample short links");
    expect(host.querySelector(".ds-pill")?.textContent).toBe("Sample data");
    expect(host.textContent).toContain("No backend is connected");
    // The chart's text names the low and high intervals it draws, not only the count and trend.
    expect(host.querySelector("svg")?.getAttribute("aria-label")).toBe("Illustrative clicks for the last 7 days, 12 intervals: lowest 370 (−7d to −6.4d), highest 1,064 (−14h to now); trending +14.8%.");
    // The chart is in clicks, says so on its own axis, and its intervals add up to the Clicks stat.
    expect(host.querySelector(".ds-chart-unit")?.textContent).toBe("clicks");
    expect(host.querySelector(".ds-chart-peak-row")?.textContent).toBe("Peak 1064 clicks · −14h to now");
    expect(host.querySelector(".ds-chart-panel")?.textContent).toContain("Last 7 days · clicks per interval, 8,420 in all");
    // The links the visitor picks from come first in the DOM (so on phones and in Tab order), in the narrow column on wide screens.
    expect(host.querySelector(".ds-grid.ds-grid-narrow-first > section:first-child #links-heading")).not.toBeNull();
    expect(host.querySelector(".ds-phone-first")).toBeNull();
  });

  it("splits the clicks across the links so they add up to the headline", () => {
    const values = [...host.querySelectorAll(".ds-row-value")].map((cell) => Number(cell.textContent?.replace(/,/g, "")));
    expect(values.reduce((sum, n) => sum + n, 0)).toBe(8420);
    expect([...host.querySelectorAll(".ds-row-name")].map((name) => name.textContent)).toEqual(["/go/github", "/go/resume", "/go/notes"]);
  });

  it("switches the period, the axis ends and the chart table", () => {
    press(button("30 days"));
    expect(stats()[0]).toBe("Clicks31,840+22.4% on the period before");
    expect([...host.querySelectorAll(".ds-chart-x span")].map((span) => span.textContent)).toEqual(["−30d", "−22.5d", "−15d", "−7.5d", "now"]);
    // 12 intervals: the last point (−2.5d to now) sits at its interval's centre, not on "now".
    const last = (host.querySelector(".ds-chart-line")?.getAttribute("points") ?? "").split(" ").at(-1);
    expect(Number(last?.split(",")[0])).toBeCloseTo((11.5 / 12) * 1000);
    expect([...host.querySelectorAll<HTMLElement>(".ds-chart-x span")].map((span) => span.style.left)).toEqual(["0%", "25%", "50%", "75%", "100%"]);
    const details = host.querySelector("details.ds-chart-switch") as HTMLDetailsElement;
    press(details.querySelector("summary") as HTMLElement);
    expect(details.open).toBe(true);
    const rows = host.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(12);
    expect(rows[11].textContent).toBe("−2.5d to now4555 (peak)");
    expect(rows[0].textContent).toBe("−30d to −27.5d1044");
  });

  it("selects a link, explains it, and clears it on a second press", () => {
    expect(callout()).toContain("Pick a link");
    press(button("/go/resume"));
    expect(button("/go/resume").getAttribute("aria-pressed")).toBe("true");
    expect(callout()).toContain("/go/resume3,115 sample clicks (37%) in the last 7 days. Goes to bookchaowalit.com/about.");
    expect(host.querySelector(".ds-callout a")?.getAttribute("href")).toBe("https://bookchaowalit.com/about");
    press(button("/go/resume"));
    expect(callout()).toContain("Pick a link");
  });

  it("downloads the CSV for the chosen period", () => {
    const created = vi.fn(() => "blob:sample");
    const revoked = vi.fn();
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked });
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    press(button("24 hours"));
    expect(button("Download CSV")?.textContent).toBe("Download CSV (24 hours)");
    press(button("Download CSV"));
    expect(created).toHaveBeenCalledOnce();
    expect(clicked).toHaveBeenCalledOnce();
    expect(revoked).toHaveBeenCalledWith("blob:sample");
  });
});

describe("link analytics empty states", () => {
  const zero = { clicks: 0, ctr: 0, geo: "TH", change: 0, bars: Array(12).fill(0) };
  const quiet = { "24h": zero, "7d": zero, "30d": REPORTS["30d"] };

  it("says there are no links instead of showing empty rows", () => {
    const none = { "24h": zero, "7d": zero, "30d": zero };
    act(() => root.render(<LinkReport reports={none} rows={[]} />));
    expect(host.querySelectorAll(".ds-row")).toHaveLength(0);
    expect(host.querySelector("#links-heading")?.closest("section")?.textContent).toContain("No short links yet");
    expect(host.textContent).toContain("There are no short links yet, so there is nothing to chart.");
    expect(host.querySelector(".ds-chart")).toBeNull();
    expect(button("Download CSV")).toBeUndefined();
    expect(stats()[1]).toBe("Short links0in the sample set");
    expect(host.querySelector(".ds-top")?.textContent).toContain("0 sample short links");
  });

  it("counts a single link in the singular, the same in the top bar and the tile", () => {
    act(() => root.render(<LinkReport reports={REPORTS} rows={[ROWS[0]]} />));
    expect(host.querySelector(".ds-top")?.textContent).toContain("1 sample short link");
    expect(host.querySelector(".ds-top")?.textContent).not.toContain("links");
    expect(stats()[1]).toBe("Short links1in the sample set");
  });

  it("keeps the links and top region when clicks exist but the chart has no interval data", () => {
    const flat = { ...REPORTS, "7d": { ...REPORTS["7d"], bars: [0, 0, 0] } };
    act(() => root.render(<LinkReport reports={flat} rows={ROWS} />));
    expect(host.querySelector(".ds-chart")).toBeNull();
    expect(host.querySelector("#volume-heading")?.closest("section")?.textContent).toContain("No interval data for the last 7 days8,420 clicks were counted, but not split by interval, so there is nothing to chart.");
    expect(host.textContent).not.toContain("No clicks in the last");
    expect(host.querySelectorAll(".ds-row")).toHaveLength(3);
    expect(stats()[3]).toBe("Top regionThailandTH · by clicks");
  });

  it("says a period had no clicks instead of drawing a flat chart, and recovers on a busy period", () => {
    act(() => root.render(<LinkReport reports={quiet} rows={ROWS} />));
    expect(host.querySelector(".ds-chart")).toBeNull();
    expect(host.querySelector("details.ds-chart-switch")).toBeNull();
    const statuses = [...host.querySelectorAll('[role="status"]')].map((note) => note.textContent);
    // DOM order: the links panel first, then the chart panel.
    expect(statuses).toEqual([
      "No clicks in the last 7 daysYour short links got no clicks in this period. Try a longer period.",
      "No clicks in the last 7 daysYour short links got no clicks in this period, so there is nothing to chart.",
    ]);
    expect(host.querySelectorAll(".ds-row")).toHaveLength(0);
    expect(stats()[3]).toBe("Top region—no clicks yet");
    press(button("30 days"));
    expect(host.querySelector(".ds-chart")).not.toBeNull();
    expect(host.querySelectorAll(".ds-row")).toHaveLength(3);
  });
});
