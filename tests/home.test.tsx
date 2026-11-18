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
  it("opens on 7 days with the headline figures and the sample notice", () => {
    expect(host.querySelector("h1")?.textContent).toBe("Link clicks");
    expect(button("7 days").getAttribute("aria-pressed")).toBe("true");
    expect(stats()).toEqual(["Clicks8,420+14.8% on the period before", "Live links24in the sample set", "Click rate3.4%estimated", "Top regionTHby clicks"]);
    expect(host.querySelector(".ds-pill")?.textContent).toBe("Sample data");
    expect(host.textContent).toContain("No backend is connected");
    // The chart's text names the low and high intervals it draws, not only the count and trend.
    expect(host.querySelector("svg")?.getAttribute("aria-label")).toBe("Illustrative click volume for the last 7 days, 12 intervals: lowest 32 (−7d to −6.4d), highest 92 (−14h to now); trending +14.8%.");
  });

  it("splits the clicks across the links so they add up to the headline", () => {
    const values = [...host.querySelectorAll(".ds-row-value")].map((cell) => Number(cell.textContent?.replace(/,/g, "")));
    expect(values.reduce((sum, n) => sum + n, 0)).toBe(8420);
    expect([...host.querySelectorAll(".ds-row-name")].map((name) => name.textContent)).toEqual(["/go/github", "/go/resume", "/go/notes"]);
  });

  it("switches the period, the axis ends and the chart table", () => {
    press(button("30 days"));
    expect(stats()[0]).toBe("Clicks31,840+22.4% on the period before");
    expect([...host.querySelectorAll(".ds-chart-x span")].map((span) => span.textContent)).toEqual(["−30d", "now"]);
    const details = host.querySelector("details.ds-chart-switch") as HTMLDetailsElement;
    press(details.querySelector("summary") as HTMLElement);
    expect(details.open).toBe(true);
    const rows = details.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(12);
    expect(rows[11].textContent).toBe("−2.5d to now96 (peak)");
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
    press(button("Download CSV"));
    expect(created).toHaveBeenCalledOnce();
    expect(clicked).toHaveBeenCalledOnce();
    expect(revoked).toHaveBeenCalledWith("blob:sample");
  });
});

describe("link analytics empty states", () => {
  const zero = { clicks: 0, links: 3, ctr: 0, geo: "TH", change: 0, bars: Array(12).fill(0) };
  const quiet = { "24h": zero, "7d": zero, "30d": REPORTS["30d"] };

  it("says there are no links instead of showing empty rows", () => {
    const none = { "24h": { ...zero, links: 0 }, "7d": { ...zero, links: 0 }, "30d": { ...zero, links: 0 } };
    act(() => root.render(<LinkReport reports={none} rows={[]} />));
    expect(host.querySelectorAll(".ds-row")).toHaveLength(0);
    expect(host.querySelector("#links-heading")?.closest("section")?.textContent).toContain("No short links yet");
    expect(host.textContent).toContain("There are no short links yet, so there is nothing to chart.");
    expect(host.querySelector(".ds-chart")).toBeNull();
    expect(button("Download CSV")).toBeUndefined();
    expect(stats()[1]).toBe("Live links0in the sample set");
  });

  it("keeps the links and top region when clicks exist but the chart has no interval data", () => {
    const flat = { ...REPORTS, "7d": { ...REPORTS["7d"], bars: [0, 0, 0] } };
    act(() => root.render(<LinkReport reports={flat} rows={ROWS} />));
    expect(host.querySelector(".ds-chart")).toBeNull();
    expect(host.querySelector("#volume-heading")?.closest("section")?.textContent).toContain("No interval data for the last 7 days8,420 clicks were counted, but not split by interval, so there is nothing to chart.");
    expect(host.textContent).not.toContain("No clicks in the last");
    expect(host.querySelectorAll(".ds-row")).toHaveLength(3);
    expect(stats()[3]).toBe("Top regionTHby clicks");
  });

  it("says a period had no clicks instead of drawing a flat chart, and recovers on a busy period", () => {
    act(() => root.render(<LinkReport reports={quiet} rows={ROWS} />));
    expect(host.querySelector(".ds-chart")).toBeNull();
    expect(host.querySelector("details.ds-chart-switch")).toBeNull();
    const statuses = [...host.querySelectorAll('[role="status"]')].map((note) => note.textContent);
    expect(statuses).toEqual([
      "No clicks in the last 7 daysYour short links got no clicks in this period, so there is nothing to chart.",
      "No clicks in the last 7 daysYour short links got no clicks in this period. Try a longer period.",
    ]);
    expect(host.querySelectorAll(".ds-row")).toHaveLength(0);
    expect(stats()[3]).toBe("Top region—no clicks yet");
    press(button("30 days"));
    expect(host.querySelector(".ds-chart")).not.toBeNull();
    expect(host.querySelectorAll(".ds-row")).toHaveLength(3);
  });
});
