// T-010: every QR kind (docs/06 §3 "From QR"; test-plan M-11): own deep link, COA, traceability,
// other URL (slug candidates), plain text, malformed URLs, our domain with an unknown id.
import { describe, expect, it } from "vitest";
import { classifyQr, decide, match, QR_KINDS, type QrFacts } from "../../src/index";
import { scanIndex } from "./fixtures";

const OWN = { ownOrigins: ["https://localhost:4173", "https://flowerscan.test"] } as const;

function candidateTexts(facts: QrFacts): string[] {
  return facts.kind === "url" || facts.kind === "text"
    ? facts.label.candidates.map((candidate) => candidate.text)
    : [];
}

describe("classifyQr: our deep link", () => {
  it.each([
    ["https://localhost:4173/s/blue-dream", "localhost:4173"],
    ["https://localhost:4173/s/blue-dream/", "localhost:4173"],
    ["https://localhost:4173/s/blue-dream?ref=jar#top", "localhost:4173"],
    ["http://localhost:4173/s/blue-dream", "localhost:4173"],
    ["  https://FLOWERSCAN.test/s/blue-dream  ", "flowerscan.test"],
    ["https://flowerscan.test:443/s/blue-dream", "flowerscan.test"],
  ])("reads %s as a direct strain id", (payload, host) => {
    expect(classifyQr(payload, OWN)).toEqual({
      kind: "deep_link",
      url: payload.trim(),
      host,
      strain_id: "blue-dream",
    });
  });

  it("returns an unknown id as is, for the result screen's friendly 404 (fixture qr-deeplink-unknown-id)", () => {
    expect(classifyQr("https://localhost:4173/s/not-a-real-strain", OWN)).toMatchObject({
      kind: "deep_link",
      strain_id: "not-a-real-strain",
    });
  });

  it("percent-decodes the id like the app router", () => {
    expect(classifyQr("https://localhost:4173/s/gelato%2D33", OWN)).toMatchObject({
      kind: "deep_link",
      strain_id: "gelato-33",
    });
  });

  it("needs the exact host and port of an own origin", () => {
    expect(classifyQr("https://localhost:5173/s/blue-dream", OWN).kind).toBe("url");
    expect(classifyQr("https://www.flowerscan.test/s/blue-dream", OWN).kind).toBe("url");
    expect(classifyQr("https://localhost:4173/s/blue-dream", { ownOrigins: [] }).kind).toBe("url");
    expect(
      classifyQr("https://localhost:4173/s/blue-dream", { ownOrigins: ["not a url"] }).kind,
    ).toBe("url");
  });

  it("is a deep link only for exactly /s/<id>", () => {
    for (const path of ["/s", "/s/", "/s/blue-dream/extra", "/about", "/x/blue-dream"]) {
      expect(classifyQr(`https://localhost:4173${path}`, OWN).kind, path).not.toBe("deep_link");
    }
  });

  it("still finds candidates in a path on our domain that isn't a strain link", () => {
    const facts = classifyQr("https://localhost:4173/x/blue-dream", OWN);
    expect(candidateTexts(facts)).toContain("blue dream");
  });
});

describe("classifyQr: COA links", () => {
  it.each([
    "https://coa.example.com/report/88213",
    "https://example.com/coa/gelato-33-batch-0423.pdf",
    "https://example.org/files/COA_88213.pdf",
    "https://example.com/lab-results?id=88213",
    "https://example.com/certificate-of-analysis/88213",
    "https://example.com/view?type=test-results&batch=0423",
    "https://acmelabs.example/r/88213",
    "https://lab.example.org/88213",
  ])("reads %s as a COA (never a strain decision)", (payload) => {
    const facts = classifyQr(payload, OWN);
    expect(facts.kind).toBe("coa");
    expect(facts).not.toHaveProperty("label");
    expect(facts).not.toHaveProperty("strain_id");
  });

  it("keeps the link's host for the not-a-strain sheet", () => {
    expect(classifyQr("https://coa.example.com/report/88213", OWN)).toEqual({
      kind: "coa",
      url: "https://coa.example.com/report/88213",
      host: "coa.example.com",
    });
  });

  it("doesn't read coa inside another word", () => {
    expect(classifyQr("https://example.com/products/cocoa-kush", OWN).kind).toBe("url");
  });
});

describe("classifyQr: traceability", () => {
  it.each([
    "https://retailid.metrc.com/u/8f2a91",
    "https://metrc.com/rid/8f2a91",
    "https://example.com/t/1A4050300013FED000097325",
    "https://example.com/lookup?uid=1A4050300013FED000097325",
  ])("reads %s as a track-and-trace code", (payload) => {
    const facts = classifyQr(payload, OWN);
    expect(facts.kind).toBe("traceability");
    expect(facts).not.toHaveProperty("label");
  });

  it("wins over the COA wording (a Retail ID page also shows the COA)", () => {
    expect(classifyQr("https://retailid.metrc.com/coa/8f2a91", OWN).kind).toBe("traceability");
  });

  it("reads a bare package UID as traceability with no link", () => {
    expect(classifyQr("1A4050300013FED000097325", OWN)).toEqual({
      kind: "traceability",
      url: null,
      host: null,
    });
  });

  it("is not fooled by a look-alike host", () => {
    expect(classifyQr("https://notmetrc.com/products/blue-dream", OWN).kind).toBe("url");
  });
});

describe("classifyQr: other URLs (slug candidates)", () => {
  it("turns /products/blue-dream-3-5g into the candidate 'blue dream' (docs/06 example)", () => {
    const facts = classifyQr("https://shop.example.com/products/blue-dream-3-5g", OWN);
    expect(facts.kind).toBe("url");
    expect(candidateTexts(facts)).toContain("blue dream");
    expect(candidateTexts(facts).join(" ")).not.toMatch(/products|3\.5g|\b5g\b/);
    expect(
      decide(match(scanIndex, facts.kind === "url" ? facts.label.candidates : [])),
    ).toMatchObject({
      kind: "accept",
      match: { strain_id: "blue-dream" },
    });
  });

  it("reads a menu slug's category letter, form and glued pheno number", () => {
    const facts = classifyQr("https://menu.example.com/menu/sunleaf-gelato-33-h-flower-3-5g", OWN);
    expect(facts).toMatchObject({
      kind: "url",
      host: "menu.example.com",
      label: { package_says: "hybrid", product_form: "flower", potency_readings: [] },
    });
    expect(candidateTexts(facts)).toContain("gelato 33");
  });

  it("drops shop words, ids, file extensions and one-letter routing segments", () => {
    const facts = classifyQr(
      "https://example.com/s/p/dispensaries/the-green-room/menu/purple-punch-4fdcba06-688d-48ab-a2d0-0dbf9af2adc5.html",
      OWN,
    );
    const texts = candidateTexts(facts);
    expect(texts).toContain("purple punch");
    expect(texts.join(" ")).not.toMatch(/4fdcba06|html|dispensaries|menu/);
    expect(facts.kind === "url" && facts.label.package_says).toBeNull();
  });

  it("treats glued digits and quantity x like label text (naming case 17)", () => {
    const facts = classifyQr("https://example.com/menu/lot420-gelato33-pre-roll-1x1g", OWN);
    expect(facts.kind === "url" && facts.label.product_form).toBe("pre-roll");
    expect(candidateTexts(facts)).toContain("gelato33");
    expect(candidateTexts(facts).join(" ")).not.toMatch(/1x1g/);
  });

  it("never reads potency from a URL", () => {
    const facts = classifyQr("https://example.com/products/gelato-thca-27-percent", OWN);
    expect(facts.kind === "url" && facts.label.potency_readings).toEqual([]);
  });

  it("reads www. links without a scheme as URLs", () => {
    expect(classifyQr("www.example.com/products/jack-herer", OWN)).toMatchObject({
      kind: "url",
      host: "www.example.com",
    });
  });

  it("returns no candidates for a bare domain", () => {
    expect(candidateTexts(classifyQr("https://example.com/", OWN))).toEqual([]);
  });
});

describe("classifyQr: plain text and malformed URLs", () => {
  it("parses plain text like OCR text, one line per text line", () => {
    const facts = classifyQr("SOUR DIESEL\nSativa\nTHC 21.5%", OWN);
    expect(facts).toMatchObject({
      kind: "text",
      text: "SOUR DIESEL\nSativa\nTHC 21.5%",
      label: {
        package_says: "sativa",
        potency_readings: [
          { analyte: "thc_unspecified", value: 21.5, qualifier: "exact", unit: "percent" },
        ],
      },
    });
    expect(candidateTexts(facts)).toContain("SOUR DIESEL");
  });

  it.each([
    "https://",
    "https:///s/blue-dream",
    "http//example.com/products/blue-dream",
    "https://exa mple.com/s/blue-dream",
    "https://-bad-.example/s/blue-dream",
    "ftp://example.com/blue-dream",
    "https://[::1]/s/blue-dream",
  ])("treats the malformed or non-web URL %s as text, never as a deep link", (payload) => {
    expect(classifyQr(payload, OWN).kind).toBe("text");
  });

  it("returns empty facts for an empty payload", () => {
    expect(classifyQr("   ", OWN)).toMatchObject({
      kind: "text",
      label: { candidates: [], package_says: null, potency_readings: [], brand: null },
    });
  });

  it("covers every documented kind", () => {
    const kinds = new Set(
      [
        "https://localhost:4173/s/blue-dream",
        "https://coa.example.com/r/1",
        "1A4050300013FED000097325",
        "https://example.com/products/blue-dream",
        "BLUE DREAM",
      ].map((payload) => classifyQr(payload, OWN).kind),
    );
    expect([...kinds].sort()).toEqual([...QR_KINDS].sort());
  });
});
