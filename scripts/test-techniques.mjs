import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { captureExamples } from "./capture-examples.mjs";
import { nextTechnique, orderedTechniques, techniques } from "./technique-copy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const copy = readFileSync(new URL("./technique-copy.mjs", import.meta.url), "utf8");
const build = readFileSync(new URL("./build.mjs", import.meta.url), "utf8");

assert.equal(copy.includes("\u2014"), false, "em dash in technique copy");
assert.equal(build.includes("Next harder:"), true);
assert.match(build, /orderedTechniques\(techniques\)/);
assert.match(build, /href="\/\?practice=\$\{technique\.slug\}"/);

const SOLVER_ORDER = [
  "naked-single",
  "hidden-single",
  "pointing",
  "claiming",
  "naked-pair",
  "hidden-pair",
  "naked-triple",
  "hidden-triple",
  "quads",
  "x-wing",
  "xy-wing",
  "swordfish",
  "coloring",
  "xy-chain",
];

const ordered = orderedTechniques();
assert.deepEqual(
  ordered.map((technique) => technique.slug),
  SOLVER_ORDER,
  "library order follows the solver, with xy-wing before swordfish"
);

for (let i = 0; i < ordered.length - 1; i += 1) {
  assert.equal(nextTechnique(ordered[i]).slug, ordered[i + 1].slug);
}
assert.equal(nextTechnique(ordered[ordered.length - 1]), null);

const skyscraper = { slug: "skyscraper", name: "Skyscraper", order: 72, related: [] };
const kite = { slug: "two-string-kite", name: "Two-string kite", order: 74, related: [] };
const xyz = { slug: "xyz-wing", name: "XYZ-wing", order: 82, related: [] };
const wing = { slug: "w-wing", name: "W-wing", order: 84, related: [] };
const rectangle = { slug: "unique-rectangle", name: "Unique rectangle", order: 92, related: [] };
const bug = { slug: "bug-plus-one", name: "BUG+1", order: 94, related: [] };
const slotted = orderedTechniques([...techniques, bug, skyscraper, xyz, rectangle, kite, wing]);
const slottedSlugs = slotted.map((technique) => technique.slug);
function follows(before, after) {
  assert.equal(slottedSlugs[slottedSlugs.indexOf(before) + 1], after, `${before} -> ${after}`);
}
follows("x-wing", "skyscraper");
follows("skyscraper", "two-string-kite");
follows("two-string-kite", "xy-wing");
follows("xy-wing", "xyz-wing");
follows("xyz-wing", "w-wing");
follows("w-wing", "swordfish");
follows("swordfish", "unique-rectangle");
follows("unique-rectangle", "bug-plus-one");
follows("bug-plus-one", "coloring");
assert.equal(nextTechnique(techniques.find((technique) => technique.slug === "x-wing"), slotted).slug, "skyscraper");

const EXPANDED = [
  "naked-single",
  "hidden-single",
  "pointing",
  "claiming",
  "naked-pair",
  "hidden-pair",
  "naked-triple",
  "hidden-triple",
];
const bySlug = new Map(techniques.map((technique) => [technique.slug, technique]));

function proseWords(technique) {
  const chunks = [];
  for (const section of technique.sections || []) {
    if (section.h) chunks.push(section.h);
    if (section.h3) chunks.push(section.h3);
    for (const paragraph of section.p || []) chunks.push(paragraph);
    for (const item of [...(section.ol || []), ...(section.ul || [])]) chunks.push(item);
    if (section.intro) chunks.push(section.intro);
  }
  const text = chunks.join(" ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*/g, "");
  return text.split(/\s+/).filter((token) => /[A-Za-z]/.test(token)).length;
}

function cellPhrase(index) {
  const row = Math.floor(index / 9) + 1;
  const col = (index % 9) + 1;
  return `row ${row}, column ${col}`;
}

const examples = captureExamples(root);
for (const slug of EXPANDED) {
  const technique = bySlug.get(slug);
  assert.ok(technique.sections, `${slug} has a lesson`);
  const words = proseWords(technique);
  assert.ok(words >= 450 && words <= 800, `${slug} prose words ${words} outside 450-800`);
    const text = JSON.stringify(technique.sections);
    const lower = text.toLowerCase();
    assert.equal(text.includes("\u2014"), false, `${slug} em dash`);
    const step = examples[slug].step;
    const seen = new Set();
    for (const index of [...step.pattern, ...step.eliminate.map((item) => item.index)]) {
      if (seen.has(index)) continue;
      seen.add(index);
      const phrase = cellPhrase(index);
      assert.equal(lower.includes(phrase), true, `${slug} walkthrough missing ${phrase}`);
    }
    if (step.place) {
      assert.equal(lower.includes(cellPhrase(step.place.index)), true, `${slug} missing placement`);
      assert.equal(text.includes(String(step.place.digit)), true, `${slug} missing placed digit`);
    }
  for (const item of step.eliminate) {
    assert.equal(text.includes(String(item.digit)), true, `${slug} missing eliminated ${item.digit}`);
  }
}

for (const technique of techniques) {
  for (const slug of technique.related) {
    assert.ok(bySlug.has(slug), `${technique.slug} related ${slug}`);
  }
  assert.equal(Number.isFinite(technique.order), true, `${technique.slug} order`);
}

console.log(
  `technique lessons ok (${EXPANDED.map((slug) => `${slug} ${proseWords(bySlug.get(slug))}`).join(", ")})`
);
