// Splits a simulation's planner notes (`physicsNotes`, one run-on string) into labelled groups for "Underlying
// Scientific Principles": Heading, Description, Formula, Paragraph, Logic. Empty groups are left out.

export type PrinciplesKind = "Heading" | "Description" | "Formula" | "Paragraph" | "Logic";
export interface PrinciplesSection {
  kind: PrinciplesKind;
  items: string[];
}

/** A sentence that opens with one of these is a step or rule for the sketch, not a statement of fact. */
const LOGIC_START =
  /^(case\s*\d|use|display|plot|map|compute|convert|check|if|when|then|evaluate|draw|show|update|clamp|round|set|keep|render|animate|calculate|apply)\b/i;
/** Longest "Label:" that still counts as a heading rather than the start of a sentence. */
const MAX_HEADING_CHARS = 40;
/** Prose sentences that read as the description; any further ones are the paragraph. */
const DESCRIPTION_SENTENCES = 2;

/** Breaks after a full stop and before a capital or "(", so a decimal like "9.1" never splits. */
function sentencesOf(text: string): string[] {
  return text
    .replace(/([.!?])\s+(?=[A-Z(])/g, "$1\u0000")
    .split("\u0000")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parsePrinciples(notes: string, fallbackHeading = ""): PrinciplesSection[] {
  const text = notes.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const sentences = sentencesOf(text);

  let heading = fallbackHeading.trim();
  const first = sentences[0];
  if (first !== undefined && !LOGIC_START.test(first)) {
    const colon = first.indexOf(":");
    if (colon >= 3 && colon <= MAX_HEADING_CHARS && !first.slice(0, colon).includes("=")) {
      heading = first.slice(0, colon).trim();
      const rest = first.slice(colon + 1).trim();
      if (rest) sentences[0] = rest;
      else sentences.shift();
    }
  }

  const prose: string[] = [];
  const formulas: string[] = [];
  const logic: string[] = [];
  for (const s of sentences) {
    if (LOGIC_START.test(s) || (s.includes("→") && !s.split("→")[0].includes("="))) logic.push(s);
    else if (s.includes("=")) formulas.push(s);
    else prose.push(s);
  }

  const out: PrinciplesSection[] = [];
  if (heading) out.push({ kind: "Heading", items: [heading] });
  if (prose.length) out.push({ kind: "Description", items: prose.slice(0, DESCRIPTION_SENTENCES) });
  if (formulas.length) out.push({ kind: "Formula", items: formulas });
  if (prose.length > DESCRIPTION_SENTENCES) out.push({ kind: "Paragraph", items: prose.slice(DESCRIPTION_SENTENCES) });
  if (logic.length) out.push({ kind: "Logic", items: logic });
  return out;
}
