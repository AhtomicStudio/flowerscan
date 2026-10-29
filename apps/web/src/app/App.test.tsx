import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fakeFetch } from "../test/fixtures";
import { NOW, renderApp } from "../test/render-app";
import { AGE_DECLINED_KEY, DECLINE_BLOCK_MS, memoryStore } from "./age-gate";
import { matchRoute } from "./router";

describe("age gate (component)", () => {
  it("asks first, focuses the question, and loads nothing behind it", () => {
    const { fetch } = renderApp({ confirmed: false });
    const heading = screen.getByRole("heading", { level: 1, name: "Are you 21 or older?" });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByRole("button", { name: "I'm 21 or older" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Leave" })).toBeTruthy();
    expect(fetch.calls).toEqual([]);
  });

  it("opens search after yes, and remembers it", async () => {
    const { store, fetch } = renderApp({ confirmed: false });
    fireEvent.click(screen.getByRole("button", { name: "I'm 21 or older" }));
    expect(await screen.findByRole("searchbox", { name: "Search strains" })).toBeTruthy();
    expect(fetch.calls[0]).toBe("/data/latest.json");
    expect(store.getItem("flowerscan.age_confirmed_at")).toBe(NOW.toISOString());
  });

  it("Leave shows only the exit screen, and keeps showing it on every route for 24 hours", () => {
    const store = memoryStore();
    const first = renderApp({ confirmed: false, store });
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(
      screen.getByRole("heading", { name: "FlowerScan is for adults 21 and older." }),
    ).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(store.getItem(AGE_DECLINED_KEY)).toBe(NOW.toISOString());
    first.unmount();

    const fetch = fakeFetch();
    const later = new Date(NOW.getTime() + DECLINE_BLOCK_MS - 1000);
    const second = renderApp({
      confirmed: false,
      store,
      fetch,
      path: "/s/kestrel-haze",
      now: () => later,
    });
    expect(screen.getByText(/stays closed on this device for 24 hours/)).toBeTruthy();
    expect(fetch.calls).toEqual([]);
    second.unmount();

    const dayLater = new Date(NOW.getTime() + DECLINE_BLOCK_MS);
    renderApp({ confirmed: false, store, now: () => dayLater });
    expect(screen.getByRole("heading", { name: "Are you 21 or older?" })).toBeTruthy();
  });

  it("returns to a deep link after yes", async () => {
    renderApp({ confirmed: false, path: "/s/kestrel-haze" });
    expect(screen.getByRole("heading", { name: "Are you 21 or older?" })).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "I'm 21 or older" }));
    });
    expect(await screen.findByRole("heading", { level: 1, name: "Kestrel Haze" })).toBeTruthy();
    expect(window.location.pathname).toBe("/s/kestrel-haze");
  });
});

describe("routes", () => {
  it("matches the beta's routes", () => {
    expect(matchRoute("/")).toEqual({ name: "search" });
    expect(matchRoute("/about")).toEqual({ name: "about" });
    expect(matchRoute("/about/")).toEqual({ name: "about" });
    expect(matchRoute("/s/blue-dream")).toEqual({ name: "result", id: "blue-dream" });
    expect(matchRoute("/s/%E0%A4%A")).toEqual({ name: "not-found" });
    expect(matchRoute("/scan")).toEqual({ name: "not-found" });
  });

  it("shows a friendly page for an unknown path", async () => {
    renderApp({ path: "/nope" });
    expect(screen.getByRole("heading", { name: "We can't find that page." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Search strains" }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(await screen.findByRole("searchbox")).toBeTruthy();
  });
});
