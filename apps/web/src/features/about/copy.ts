// About strings (docs/design/screens/about.md), trimmed for the search beta: no camera or journal claims,
// because the beta has neither. Responsible-use lines are drafts for legal review (Q-D4, Q10).
import { MIN_AGE } from "../../app/age-gate";
import { APP_NAME } from "../../app/copy";

export const ABOUT_COPY = {
  title: `About ${APP_NAME}`,
  back: "Back",
  tocLabel: "On this page",
  toc: {
    classification: "How it works",
    limits: "What it can't tell you",
    sources: "Our data",
    tags: "Tags",
    privacy: "Privacy",
    "responsible-use": "Responsible use",
  },
  classification: {
    heading: "How classification works",
    intro:
      "We look up the strain's family tree in our database and average how its ancestors are usually classified, back to traditional landraces where we can. The result is a lineage estimate, shown as one of three labels: Indica, Hybrid or Sativa.",
    noNumber:
      "We show the label, not a number: a family-tree estimate isn't precise enough for a percentage to mean much.",
    labelsLabel: "The three labels",
    labels: {
      indica:
        "Its family tree leans indica. In the details, “indica-dominant” means there's some sativa in it too.",
      hybrid: "An even mix of indica and sativa (“balanced”). Rare by design.",
      sativa:
        "Its family tree leans sativa. In the details, “sativa-dominant” means there's some indica in it too.",
    },
    terms: [
      ["Lineage traced", "every branch reaches sourced data."],
      ["Partly traced", "some branches end early, so we use how sources describe those strains."],
      [
        "Reported type",
        "we don't have enough of its family tree yet, so this is how the breeder or published sources describe it.",
      ],
      ["Unknown lineage", "not enough data, so we don't estimate."],
    ],
  },
  limits: {
    heading: "What it can't tell you",
    lead: "We match the name on the package. We can't confirm what's inside.",
    body: [
      "Indica and sativa describe plant families, not how you'll feel. Effects vary person to person.",
      "Research finds the market labels “indica” and “sativa” track aroma more than overall genetics, so treat the label as a guide to family history.",
      "When sources disagree about a strain's parents, we show the best-supported version and mark it “lineage disputed”.",
    ],
  },
  sources: {
    heading: "Where our data comes from",
    body: "Breeder sites, published books, lab data and open datasets we're allowed to use. Every fact cites a source, and a person on our team checks each strain before it's marked verified.",
    beta: "During the beta, the app also shows strains we haven't finished checking.",
    noAds: "No brand pays for results. No ads.",
    version: (version: string, date: string) => `Data version ${version}, built ${date}.`,
  },
  tags: {
    heading: "What the tags mean",
    intro:
      "Effect tags show what sources commonly report for a strain. They aren't promises, and effects vary person to person.",
    downsides: "Also reported (downsides people mention):",
  },
  privacy: {
    heading: "Privacy",
    body: [
      "Searching happens on this phone: the app downloads our strain list and matches names here.",
      "No account, no ads, no trackers. The only thing we store is your age answer, on this phone.",
    ],
  },
  responsible: {
    heading: "Responsible use",
    body: `${APP_NAME} is for adults ${MIN_AGE} and older. Effects vary person to person. Start low, go slow. Don't drive after using cannabis. Follow your state's laws.`,
  },
} as const;

export type AboutSection = keyof typeof ABOUT_COPY.toc;
