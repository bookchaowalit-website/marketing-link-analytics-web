// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

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
    press(button("Show table"));
    const rows = host.querySelectorAll("tbody tr");
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
