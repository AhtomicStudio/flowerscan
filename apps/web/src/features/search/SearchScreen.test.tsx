import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fakeFetch } from "../../test/fixtures";
import { renderApp } from "../../test/render-app";
import { highlight } from "./highlight";

async function typeQuery(text: string) {
  const box = await screen.findByRole("searchbox", { name: "Search strains" });
  fireEvent.change(box, { target: { value: text } });
  return box;
}

describe("search screen", () => {
  it("is the home screen: the field is focused and an empty query shows only the tip", async () => {
    renderApp();
    const box = await screen.findByRole("searchbox", { name: "Search strains" });
    expect(document.activeElement).toBe(box);
    expect(screen.getByText("Try a nickname or how it's spelled on the package.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Search strains" })).toBeNull();
  });

  it("shows results as you type, with a class word pill per row", async () => {
    renderApp();
    await typeQuery("kestrel");
    const list = await screen.findByRole("list", { name: "Search strains" });
    const row = within(list).getByRole("link", { name: /Kestrel Haze/ });
    expect(row.getAttribute("href")).toBe("/s/kestrel-haze");
    expect(within(row).getByText("Sativa")).toBeTruthy();
    expect(screen.getByText("1 result")).toBeTruthy();
    expect(window.location.search).toBe("?q=kestrel");
  });

  it("tolerates typos", async () => {
    renderApp();
    await typeQuery("kestral hze");
    const list = await screen.findByRole("list", { name: "Search strains" });
    expect(within(list).getByRole("link", { name: /Kestrel Haze/ })).toBeTruthy();
  });

  it("explains alias hits", async () => {
    renderApp();
    await typeQuery("K. Haze");
    const list = await screen.findByRole("list", { name: "Search strains" });
    const row = within(list).getByRole("link", { name: /Kestrel Haze/ });
    expect(row.textContent).toContain("Also called “K. Haze”");
  });

  it("says we don't have it yet, with no Request it", async () => {
    renderApp();
    await typeQuery("zzqx");
    expect(await screen.findByText("We don't have that strain yet.")).toBeTruthy();
    expect(screen.getByText(/Nothing matches “zzqx”/)).toBeTruthy();
    expect(screen.queryByText(/request/i)).toBeNull();
  });

  it("shows the beta notice only for -dev data", async () => {
    const beta = renderApp();
    expect(await screen.findByText("Beta: our strain data is still being reviewed.")).toBeTruthy();
    beta.unmount();
    renderApp({ fetch: fakeFetch({ dataVersion: "2026.10.27-a1b2c3" }) });
    await typeQuery("kestrel");
    await screen.findByRole("list", { name: "Search strains" });
    expect(screen.queryByText("Beta: our strain data is still being reviewed.")).toBeNull();
  });

  it("shows an error with Retry when the data fails, and recovers", async () => {
    const fetch = fakeFetch();
    fetch.fail = true;
    renderApp({ fetch });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Strain data didn't load.");
    fetch.fail = false;
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await typeQuery("sandpiper");
    expect(await screen.findByRole("link", { name: /Sandpiper/ })).toBeTruthy();
  });

  it("Escape clears the field", async () => {
    renderApp();
    const box = await typeQuery("kestrel");
    fireEvent.keyDown(box, { key: "Escape" });
    expect((box as HTMLInputElement).value).toBe("");
  });
});

describe("highlight", () => {
  it("bolds the start of each word a query word starts", () => {
    expect(highlight("Kestrel Haze", "kes ha")).toEqual([
      { text: "Kes", hit: true },
      { text: "trel ", hit: false },
      { text: "Ha", hit: true },
      { text: "ze", hit: false },
    ]);
  });

  it("leaves typos and empty queries unmarked", () => {
    expect(highlight("Kestrel Haze", "")).toEqual([{ text: "Kestrel Haze", hit: false }]);
    expect(highlight("Kestrel", "xyz")).toEqual([{ text: "Kestrel", hit: false }]);
  });
});
