#!/usr/bin/env node
/**
 * Model-Driven Chapter Authoring & Book II — Preview Synchronizer
 * ===============================================================
 * Strategic Principle:
 *   "The architecture (Book I) is the library. The novel (Book II) is the work
 *    in active production."
 *
 * Usage:
 *   node scripts/write-chapter.mjs --status
 *   node scripts/write-chapter.mjs --compile
 *   node scripts/write-chapter.mjs --add --title "The Ombudsman's Quorum" --file draft.txt
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest, countWords, readChapter, serializeManifest } from "./manuscript-index.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const COLLECTION_ID = "the-grand-river-foundation";
const COLLECTION_DIR = path.join(ROOT, "manuscript", COLLECTION_ID);
const BOOK_II_PREVIEW_MD = path.join(ROOT, "BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md");

export const ARCHITECTURAL_CONTINUITY_BIBLE = {
  bookHierarchy: {
    bookI: "Book I — Harshal's Systems (Parts I–XXVII Canonical Reference Library)",
    bookII: "Book II — The Grand River Foundation (Book II — Preview · Fictional Companion Novel)"
  },
  canonicalMinimumModel: "Identity → Representation → Authorization → Continuity → Accountability → Refusal",
  setting: "~2100 CE · Grand River Foundation · 4,000-foot retrofitted Colorado River Dam (completed 2098) spanning Kaibab limestone, Bright Angel shale, and Vishnu schist",
  institutions: [
    "Center Origin 0•000•000•0000 — Root human-keyed anchor held by Chieftain Harshal Priyavadan Patel",
    "Western Colonnade (The Five Hundred Coins) — 500 Mutual Underwriting Houses backstopping 500 NAB conglomerates across continental risk domains (Element 6 Tectonic, Element 7 Hydrological, Element 81 High-Voltage, Element 134 Grid Resilience)",
    "Ombudsman's Council (119 Neural Atomic Bodies) — Structural & human representatives operating under Chapter 110, Article VII of the Grand River Charter (ADJR-v1.0)",
    "Southern Edge Terminal (Substation Nine, Pinal County) — Single-manned manual-disconnect outpost where leadership completes regular solitary skills rotations",
    "South Wall Distribution Vault — Point-to-point sovereign copper bus bars (no shared Master/Slave bus, no contention)"
  ],
  characters: [
    "Harshal Priyavadan Patel — Chieftain of the Grand River Tribe; architect of the dam and Center Origin 0•000•000•0000",
    "Elena Vance — Former Executive Ombudsman for the North American Energy Consortium (Dallas); joins the Foundation after witnessing the Western Colonnade and the Paper Siege",
    "Chief Actuary Chen — Continental Grid Mutual (Element 134: Grid Resilience)",
    "Lien — Vault Engineer for the South Wall Point-to-Point Array ('Cable Select')",
    "Dara Kessler — MIT-trained apprentice engineer from the Consortium's Western Integration Division",
    "General Marcus Vance — Commander of the 4th Autonomous Logistics Wing (Pentagon Liaison, Operation Sovereign Flow)"
  ]
};

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function compileBookIIPreview(root = ROOT) {
  const manifest = await buildManifest(root);
  await writeFile(path.join(root, "manuscript", "manifest.json"), serializeManifest(manifest), "utf8");
  const collection = manifest.collections.find(c => c.id === COLLECTION_ID);
  if (!collection) {
    throw new Error(`Collection '${COLLECTION_ID}' not found in manuscript/manifest.json`);
  }

  const lines = [
    "---",
    "document_id: BOOK-II-GRAND-RIVER-FOUNDATION-PREVIEW",
    "book: Book II",
    "title: \"The Grand River Foundation (Book II — Preview)\"",
    "subtitle: \"A Fictional Companion Novel to Book I (Harshal's Systems) · Set in ~2100\"",
    "author: Harshal Priyavadan Patel",
    "provenance_class: FICTION",
    "status: PREVIEW_IN_PROGRESS",
    "evidence_status: NARRATIVE_SANDBOX",
    "canonical_companion: \"Book I — Harshal's Systems (Parts I–XXVII)\"",
    `chapter_count: ${collection.chapterCount}`,
    `word_count: ${collection.words}`,
    `manifest_digest: ${collection.digest}`,
    "---",
    "",
    "# BOOK II — PREVIEW: *The Grand River Foundation*",
    "",
    "## A Fictional Companion Novel to *Harshal's Systems* (Book I)",
    "",
    "**Author:** Harshal Priyavadan Patel  ",
    "**Publishing Tier:** Book II — Preview (Active Narrative Work in Progress)  ",
    "**Document Provenance:** `FICTION` (Non-Normative Future-World Sandbox; separated from Book I normative specifications)  ",
    "**Setting:** ~2100 CE — The 4,000-foot retrofitted Colorado River Megastructure, the 500-Coin Western Colonnade, and the 119-NAB Ombudsman Council  ",
    "**Canonical Minimum Model Illustrated:** `Identity → Representation → Authorization → Continuity → Accountability → Refusal`",
    "",
    "> **Editorial & Architectural Note:** *The Grand River Foundation* (**Book II — Preview**) is a standalone work of speculative institutional fiction set in ~2100. It is explicitly separated from the normative specifications, threat research, and incident records of **Book I (*Harshal's Systems*, Parts I–XXVII)**. In this publishing architecture, **Book I serves as the canonical reference library**, while **Book II is the active narrative production** exploring mature ~2100 civilizational implementations of keyed human–machine accountability.",
    "",
    "## Table of Contents (Book II — Preview)",
    "",
    "| Order | Chapter Title | Source File | Word Count | SHA-256 Digest (prefix) |",
    "| :--- | :--- | :--- | ---: | :--- |"
  ];

  const chapterBodies = [];
  for (const ch of collection.chapters) {
    const raw = await readChapter(root, COLLECTION_ID, ch.name);
    const firstHeadingMatch = raw.match(/^#\s+(.+)$/m);
    const displayTitle = firstHeadingMatch ? firstHeadingMatch[1].trim() : ch.title;
    lines.push(`| \`${String(ch.index).padStart(2, "0")}\` | **${displayTitle}** | \`${ch.file}\` | ${ch.words.toLocaleString()} | \`${ch.sha256.slice(0, 12)}\` |`);
    chapterBodies.push({ meta: ch, displayTitle, raw: raw.trim() });
  }

  lines.push(
    "",
    `**Total Indexed Chapters:** ${collection.chapterCount} · **Total Words:** ${collection.words.toLocaleString()} · **Collection Digest:** \`${collection.digest}\``,
    "",
    "---",
    ""
  );

  for (const item of chapterBodies) {
    lines.push(item.raw, "", "---", "");
  }

  const output = lines.join("\n");
  await writeFile(path.join(root, "BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md"), output, "utf8");
  return { collection, chapterBodies, outputPath: BOOK_II_PREVIEW_MD };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--add")) {
    const titleIdx = args.indexOf("--title");
    const fileIdx = args.indexOf("--file");
    const kindIdx = args.indexOf("--kind");
    if (titleIdx === -1 || !args[titleIdx + 1]) {
      console.error("Error: --add requires --title \"<Chapter Title>\"");
      process.exit(1);
    }
    const title = args[titleIdx + 1];
    const kind = kindIdx !== -1 && args[kindIdx + 1] ? args[kindIdx + 1] : "chapter";
    const manifest = await buildManifest(ROOT);
    const collection = manifest.collections.find(c => c.id === COLLECTION_ID);
    const nextOrder = collection ? collection.chapterCount : 0;
    const prefix = String(nextOrder).padStart(2, "0");

    let bodyText = "";
    if (fileIdx !== -1 && args[fileIdx + 1]) {
      bodyText = await readFile(path.resolve(ROOT, args[fileIdx + 1]), "utf8");
    } else {
      console.error("Error: --add requires --file <path-to-draft.txt>");
      process.exit(1);
    }

    const chapterNum = collection
      ? collection.chapters.filter(c => c.name.includes("chapter-")).length + 1
      : 1;
    const headerLine = kind === "interstitial"
      ? `# INTERSTITIAL: ${title}`
      : `# CHAPTER ${chapterNum}: ${title}`;

    const normalizedBody = bodyText.trim().startsWith("# ")
      ? bodyText.trim() + "\n"
      : `${headerLine}\n\n${bodyText.trim()}\n`;

    const fileName = kind === "interstitial"
      ? `${prefix}-interstitial-${slugify(title)}.txt`
      : `${prefix}-chapter-${chapterNum}-${slugify(title)}.txt`;

    const targetPath = path.join(COLLECTION_DIR, fileName);
    await writeFile(targetPath, normalizedBody, "utf8");
    const compiled = await compileBookIIPreview(ROOT);
    console.log(`Added Book II chapter: manuscript/${COLLECTION_ID}/${fileName} (${countWords(normalizedBody)} words)`);
    console.log(`Updated manifest.json and BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md (${compiled.collection.words} total words).`);
    return;
  }

  const compiled = await compileBookIIPreview(ROOT);
  console.log("======================================================================");
  console.log("  BOOK II — PREVIEW: THE GRAND RIVER FOUNDATION (MANUSCRIPT STATUS)");
  console.log("======================================================================");
  console.log(`  Hierarchy : ${ARCHITECTURAL_CONTINUITY_BIBLE.bookHierarchy.bookII}`);
  console.log(`  Canon Ref : ${ARCHITECTURAL_CONTINUITY_BIBLE.bookHierarchy.bookI}`);
  console.log(`  Model     : ${ARCHITECTURAL_CONTINUITY_BIBLE.canonicalMinimumModel}`);
  console.log(`  Setting   : ${ARCHITECTURAL_CONTINUITY_BIBLE.setting}`);
  console.log(`  Chapters  : ${compiled.collection.chapterCount} (${compiled.collection.words.toLocaleString()} words)`);
  console.log(`  Digest    : ${compiled.collection.digest}`);
  console.log("----------------------------------------------------------------------");
  for (const ch of compiled.collection.chapters) {
    console.log(`  [${String(ch.index).padStart(2, "0")}] ${ch.name} — ${ch.words} words (${ch.sha256.slice(0, 12)})`);
  }
  console.log("----------------------------------------------------------------------");
  console.log("  Synced    : manuscript/manifest.json");
  console.log("  Synced    : BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md");
  console.log("======================================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
