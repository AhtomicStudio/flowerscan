import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fakeFetch, STRAINS } from "../../test/fixtures";
import { renderApp } from "../../test/render-app";

async function openResult(id: string, options: Parameters<typeof renderApp>[0] = {}) {
  const utils = renderApp({ path: `/s/${id}`, ...options });
  await screen.findByTestId("answer-word");
  return utils;
}

function openHowWeKnow() {
  fireEvent.click(screen.getByRole("button", { name: /How we know/ }));
}

const answer = () => screen.getByTestId("answer-word").textContent;
const basis = () => screen.getByTestId("basis-line").textContent;

describe("result view", () => {
  it("traced Sativa: name, icon + one huge word, details, lean only in How we know", async () => {
    await openResult("kestrel-haze");
    const name = screen.getByRole("heading", { level: 1, name: "Kestrel Haze" });
    expect(document.activeElement).toBe(name);
    expect(answer()).toBe("Sativa");
    expect(screen.getByRole("main").getAttribute("data-class")).toBe("sativa");
    expect(screen.getByRole("button", { name: "Details" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Search another/ })).toBeTruthy();
    // No Save in the beta (hidden, not faked) and no Share.
    expect(screen.queryByRole("button", { name: /save|share/i })).toBeNull();
    expect(basis()).toBe("Lineage traced: an estimate from its family tree, not a lab test.");
    // Dominance stays out of the answer and the basis line (D14)…
    expect(screen.getByTestId("lean-line").closest("[hidden]")).not.toBeNull();
    openHowWeKnow();
    // …and appears only inside How we know.
    expect(screen.getByTestId("lean-line").textContent).toBe("Leans sativa (sativa-dominant).");
    expect(screen.getByText("Reported type:", { exact: false }).textContent).toBe(
      "Reported type: Sativa-dominant.",
    );
    expect(screen.getByText(/Breeder:/).textContent).toBe("Breeder: Breeder X.");
    expect(screen.getByText(/Based on 5 sources\./)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "How classification works" }).getAttribute("href"),
    ).toBe("/about#classification");
  });

  it("shows effect chips from the taxonomy, negatives as one Also reported line, no flavors", async () => {
    await openResult("kestrel-haze");
    const effects = screen.getByTestId("effects");
    expect(within(effects).getByRole("heading", { name: "Commonly reported" })).toBeTruthy();
    const chips = within(effects)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(chips).toEqual(["Uplifted", "Creative"]);
    expect(within(effects).getByText("Also reported: dry mouth.")).toBeTruthy();
    expect(screen.queryByText("Pine")).toBeNull();
  });

  it("draws the family tree: class pills only, links to parents, disputed badge with explanation", async () => {
    await openResult("kestrel-haze");
    openHowWeKnow();
    const tree = screen.getByRole("list", { name: "Family tree" });
    expect(within(tree).getByText("Kestrel Haze")).toBeTruthy();
    const parent = within(tree).getByRole("link", { name: "Strain A" });
    expect(parent.getAttribute("href")).toBe("/s/strain-a");
    expect(within(tree).getAllByText("Landrace").length).toBeGreaterThan(0);
    const badge = within(tree).getByRole("button", { name: /Lineage disputed/ });
    const explanation = document.getElementById(badge.getAttribute("aria-controls") ?? "");
    expect(explanation?.hidden).toBe(true);
    fireEvent.click(badge);
    expect(explanation?.hidden).toBe(false);
    expect(explanation?.textContent).toContain("Sources disagree");
    expect(screen.getByRole("button", { name: /How we know/ }).textContent).toContain(
      "Strain A × Landrace C · 5 sources · 1 disputed",
    );
  });

  it("partly traced Indica: basis, unknown parent, zero tags renders no effects section", async () => {
    await openResult("marsh-wren");
    expect(answer()).toBe("Indica");
    expect(basis()).toBe(
      "Partly traced: an estimate from part of its family tree, not a lab test.",
    );
    expect(screen.queryByTestId("effects")).toBeNull();
    expect(screen.queryByText("Commonly reported")).toBeNull();
    openHowWeKnow();
    expect(screen.getByTestId("lean-line").textContent).toBe("Leans indica (indica-dominant).");
    expect(
      within(screen.getByRole("list", { name: "Family tree" })).getByText("Unknown parent"),
    ).toBeTruthy();
  });

  it("reported type: no lean line, origins unknown", async () => {
    await openResult("sandpiper");
    expect(answer()).toBe("Indica");
    expect(basis()).toBe(
      "Reported type: how sources describe it. We don't have enough of its family tree yet.",
    );
    openHowWeKnow();
    expect(screen.queryByTestId("lean-line")).toBeNull();
    expect(screen.getByText("Origins of Sandpiper are unknown.")).toBeTruthy();
    expect(screen.getByText(/Reported type:/, { selector: "p" }).textContent).toBe(
      "Reported type: Indica.",
    );
  });

  it("unknown lineage: gray Unknown lineage, never a value or a 50/50", async () => {
    await openResult("night-heron");
    expect(answer()).toBe("Unknown lineage");
    expect(screen.getByRole("main").getAttribute("data-class")).toBe("unknown");
    expect(basis()).toBe("We don't have enough of its family tree to say.");
    openHowWeKnow();
    expect(screen.queryByTestId("lean-line")).toBeNull();
    expect(screen.queryByText(/Reported type:/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/50\s*\/\s*50|balanced|%/);
  });

  it("landrace: landrace basis line and where the tree stops", async () => {
    await openResult("landrace-c");
    expect(answer()).toBe("Sativa");
    expect(basis()).toBe(
      "Landrace: a traditional regional population, where our family trees stop.",
    );
    openHowWeKnow();
    expect(screen.getByText("A landrace is where our family trees stop.")).toBeTruthy();
    expect(screen.queryByTestId("lean-line")).toBeNull();
    expect(screen.queryByRole("list", { name: "Family tree" })).toBeNull();
  });

  it("Hybrid through an inline cross: the cross is a tree node, not a link", async () => {
    await openResult("teal-finch");
    expect(answer()).toBe("Hybrid");
    openHowWeKnow();
    expect(screen.getByTestId("lean-line").textContent).toBe("An even mix (balanced).");
    const tree = screen.getByRole("list", { name: "Family tree" });
    expect(within(tree).getByText("Landrace K x Landrace C")).toBeTruthy();
    expect(within(tree).queryByRole("link", { name: "Landrace K x Landrace C" })).toBeNull();
    expect(within(tree).getByText("Cross")).toBeTruthy();
  });

  it("collapses past 8 chips with +N more", async () => {
    await openResult("goldcrest");
    const effects = screen.getByTestId("effects");
    expect(within(effects).getAllByRole("listitem")).toHaveLength(8);
    const more = within(effects).getByRole("button", { name: "+2 more" });
    fireEvent.click(more);
    expect(within(effects).getAllByRole("listitem")).toHaveLength(10);
    expect(within(effects).getByRole("button", { name: "Show fewer" })).toBeTruthy();
    expect(within(effects).getByText("Also reported: dry mouth, dry eyes.")).toBeTruthy();
  });

  it("always shows the footer and, for -dev data, the beta notice", async () => {
    await openResult("kestrel-haze");
    expect(screen.getByText("Effects vary person to person. Start low, go slow.")).toBeTruthy();
    expect(screen.getByText("Beta: our strain data is still being reviewed.")).toBeTruthy();
  });

  it("hides the beta notice for reviewed data", async () => {
    await openResult("kestrel-haze", { fetch: fakeFetch({ dataVersion: "2026.10.27-a1b2c3" }) });
    expect(screen.queryByText("Beta: our strain data is still being reviewed.")).toBeNull();
  });

  it("an unknown id gets a friendly page", async () => {
    renderApp({ path: "/s/does-not-exist" });
    expect(await screen.findByRole("heading", { name: "We can't find that strain." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search strains" })).toBeTruthy();
  });

  it("Search another returns to search with an empty, focused field", async () => {
    renderApp();
    const box = await screen.findByRole("searchbox");
    fireEvent.change(box, { target: { value: "kestrel" } });
    fireEvent.click(await screen.findByRole("link", { name: /Kestrel Haze/ }));
    await screen.findByTestId("answer-word");
    expect(window.location.pathname).toBe("/s/kestrel-haze");
    fireEvent.click(screen.getByRole("button", { name: /Search another/ }));
    // history.go(-1) is async in jsdom.
    const again = await screen.findByRole("searchbox");
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect((again as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(again);
  });

  it("Escape closes the result back to the search with the query kept", async () => {
    renderApp();
    fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "sandpiper" } });
    fireEvent.click(await screen.findByRole("link", { name: /Sandpiper/ }));
    await screen.findByTestId("answer-word");
    fireEvent.keyDown(window, { key: "Escape" });
    const box = await screen.findByRole("searchbox");
    await waitFor(() => expect((box as HTMLInputElement).value).toBe("sandpiper"));
  });
});

/** No percentages, potency, or filler anywhere, for every fixture strain with everything expanded. */
describe("filler sweep", () => {
  const BANNED = [/%/, /\bTHCa?\b/i, /\bCBD\b/i, /potency/i, /\bN\/A\b/, /50\s*\/\s*50/];

  for (const strain of STRAINS) {
    it(`${strain.id}: no %, THC/CBD, potency, N/A or 50/50`, async () => {
      await openResult(strain.id);
      openHowWeKnow();
      for (const badge of screen.queryAllByRole("button", { name: /Lineage disputed/ })) {
        fireEvent.click(badge);
      }
      const more = screen.queryByRole("button", { name: /more$/ });
      if (more) fireEvent.click(more);
      const text = document.body.textContent ?? "";
      for (const pattern of BANNED) expect(text).not.toMatch(pattern);
    });
  }

  it("search results and About carry no % or potency either", async () => {
    const app = renderApp();
    fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "a" } });
    await screen.findByRole("list", { name: "Search strains" });
    for (const pattern of BANNED) expect(document.body.textContent).not.toMatch(pattern);
    app.unmount();
    renderApp({ path: "/about" });
    await screen.findByText("Data version", { exact: false });
    for (const pattern of BANNED) expect(document.body.textContent).not.toMatch(pattern);
  });
});
