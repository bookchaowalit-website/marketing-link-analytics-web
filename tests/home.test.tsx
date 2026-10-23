import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the 7d sample report with every link row and the sample-data notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("trail of a click.");
    expect(html).toContain("8,420");
    for (const name of ["/go/github", "/go/resume", "/go/notes"]) expect(html).toContain(name);
    expect(html).toContain("no backend connected");
    expect(html).toContain("All figures are illustrative");
    expect(html).toContain("Download sample CSV");
  });
});
