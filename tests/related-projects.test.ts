import { describe, expect, it } from "vitest";
import { PROJECT_CATEGORIES, projectHost, relatedProjects } from "@/lib/related-projects";

describe("relatedProjects", () => {
  it("excludes the current app from every category", () => {
    const result = relatedProjects("todo-board");
    const slugs = result.flatMap((category) => category.projects.map((project) => project.slug));
    expect(slugs).not.toContain("todo-board");
    expect(slugs.length).toBe(PROJECT_CATEGORIES.flatMap((category) => category.projects).length - 1);
  });

  it("drops categories that become empty", () => {
    const result = relatedProjects("solo", [{ id: "x", label: "X", projects: [{ name: "Solo", url: "https://solo.test", slug: "solo" }] }]);
    expect(result).toEqual([]);
  });

  it("uses unique slugs and https URLs in the catalog", () => {
    const projects = PROJECT_CATEGORIES.flatMap((category) => category.projects);
    expect(new Set(projects.map((project) => project.slug)).size).toBe(projects.length);
    for (const project of projects) expect(project.url.startsWith("https://")).toBe(true);
  });
});

describe("projectHost", () => {
  it("returns the host of a valid URL and the input otherwise", () => {
    expect(projectHost("https://bookchaowalit.com/path")).toBe("bookchaowalit.com");
    expect(projectHost("not a url")).toBe("not a url");
  });
});
