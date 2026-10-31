import { it } from "vitest";
import { buildIndex, decide, match, parseLabelText } from "../../src/index";
import { NAMING_RECORDS } from "../match/fixtures";
import { label } from "./fixtures";

it("explore", () => {
  const index = buildIndex(NAMING_RECORDS); // no Lemon Cherry Gelato
  for (const lines of [
    label(["LEMON CHERRY GELATO", 46], ["HYBRID", 16]),
    label(["BLUE DREAM", 46], ["RUNTZ", 70]),
    label(["Runtz (Gelato x Zkittlez)", 46]),
    label(["PINK RUNTZ", 46], ["3.5g", 16]),
  ]) {
    const f = parseLabelText(lines);
    const r = match(index, f.candidates);
    console.log(
      decide(r).kind,
      JSON.stringify(r.slice(0, 3).map((m) => [m.strain_id, m.candidate, +m.score.toFixed(3)])),
    );
  }
});
