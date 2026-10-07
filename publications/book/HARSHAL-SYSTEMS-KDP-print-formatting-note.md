# KDP Print Interior — Production Note

## Deliverables

- `HARSHAL-SYSTEMS-Book-I-KDP-print-interior.docx` — editable, styled print interior.
- `HARSHAL-SYSTEMS-Book-I-KDP-print-interior.pdf` — rendered print interior for the stable page-layout version.

This is an interior only; no cover file is included. It is for print, not a reflowable Kindle eBook.

## Final render and optical review

- Trim: **8.25 × 11 in**, no bleed.
- Mirrored margins: inside **0.90 in**, outside **0.65 in**, top/bottom **0.75 in**; header/footer distance **0.40 in**.
- Final PDF: **488 pages**, each **594 × 792 pt** (8.25 × 11 in); unencrypted. KDP’s official help search result lists 75–550 pages for this trim size. [KDP trim, bleed, and margin guidance](https://kdp.amazon.com/en_US/help/topic/GVBQ3CMEQW3W2VL6)
- Font embedding was checked in the PDF. Run the file through KDP Print Previewer before publication.
- The complete 489-page predecessor was reviewed via contact sheets. The final 488-page render was rechecked at full size on the changed pages and affected page-flow boundaries, including pp. 115, 343, 448–450, and 487–488. Pages 64 and 474 were also inspected full-size.
- Layout-only fixes in the final render:
  - Kept the “Canonical AGS+ Compliance Statement” heading, lead-in, and exact quoted sentence together on p. 115; styled the sentence as a block quote.
  - Reflowed the hard-wrapped paragraphs in the closing Grand Architecture module; the “What The Grand Architecture is not” paragraph and publishing-hierarchy line now finish together on p. 487, and the Convergence institutions module starts on p. 488.
  - Rendered paired emphasis in prose and code/diagram runs as typography rather than printing Markdown delimiters. Remaining `destination:*`, `destination:**`, and `destination:***` strings are intentional wildcard data in protected Part XX and remain literal.
  - Left-aligned the final fictional-module provenance paragraph to prevent visibly stretched word spacing.
- No wording was changed. Page 28 remains a short, complete section conclusion; p. 64 showed no actionable layout issue; p. 205’s dark block-character strength bars are intentional; p. 474 is a sparse but complete end-of-part review page before the next part’s page break. No changes were made to those pages.
- The KDP production-instruction block and unassigned ISBN placeholders are omitted from the reader-facing interior. ISBN assignment belongs in KDP’s title setup; no cover or barcode was produced.

## Text count and source preservation

- Master manuscript: **172,788 words**.
- Formatted interior: **172,631 words**, counting document body paragraphs and table cells with the same token rule used for the master, `(?u)\b[\w]+(?:['’‐‑‒–—-][\w]+)*\b`; generated running headers, footers, and page-number fields are excluded.
- The 157-word difference is limited to the KDP specification/ISBN block (116 words), redundant title-page wording (34 words), and the internal revision-note reference removed from the copyright line (7 words). No main-text sections were intentionally removed or rewritten for layout.
- The master file was not edited. SHA-256: `f90056f4bef9055c26a7f7cbef9ddbf1103106c9d1b3764daab176fc4aab4ea9`.
- Protected Part XX source-span SHA-256: `f6a5cce643b837693e29e5f9a433339c91e075fc36a4979c5a4d8a18e2cdf39d`. Protected Part XXIV fiction-span SHA-256: `18f9d7a01da5dde18d410b3f18952485b8ceacdacd864b7801f2edbe644bc2af`.
- Final DOCX SHA-256: `66c34b17206770c416db5a190269d65ba069cbc4239f7123a1b412d5cb491d5c`.
- Final PDF SHA-256: `af16e549b45b26ec4dc0b7e18b987064dda305bf44bfa77e3b48dafc97bbf346`.

## Evidence-index follow-up

Appendix B includes the source-class key but not an itemized `[A1]`–`[A29]` evidence list. The manuscript’s existing evidence limitation was therefore left unchanged.
