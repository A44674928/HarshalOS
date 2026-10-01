# The manuscript folder

This folder is the submission point for the **plaintext manuscripts** rendered inside
HarshalOS under **The Book → The Grand River Foundation**.

Nothing in this folder is executed, imported, or interpreted as code. The browser shell
reads the text files, counts them, and sets them as a chapter-by-chapter reading view.

## Drop-in rules

1. Put each chapter in its own plaintext file under the collection folder:
   `manuscript/the-grand-river-foundation/`
2. Name files so they sort the way the book reads. A leading number sets the order:

   ```text
   manuscript/the-grand-river-foundation/
     01-the-arrival.txt
     02-the-river-remembers.txt
     03-the-foundation.txt
   ```

   Files are ordered by that number first, then by name (natural sort, so `2` comes
   before `10`).
3. Accepted extensions: `.txt` (preferred) and `.md`. Files whose names begin with `.`
   or `_`, and `README*`, are ignored — so this file is never published as a chapter.
4. The site updates when the files are committed and the branch is deployed. The local
   preview server (`node serve.js`) picks up new files on reload with no build step.

## What each chapter file may contain

Everything is optional; a bare paragraph is a valid chapter.

| In the file | Rendered as |
|---|---|
| First line starting with `# ` | The chapter title (otherwise it is derived from the file name) |
| A blank line between text | A new paragraph |
| Single line breaks inside a paragraph | Joined into the same paragraph (hard-wrapped files are fine) |
| A line of `---`, `***`, or `# # #` | A scene break (· · ·) |
| A line starting with `## ` | A section heading inside the chapter |
| A line starting with `> ` | An indented quotation block |
| `*italic*` and `**bold**` | Emphasis (everything else is shown literally) |

Plain text is escaped before it is displayed, so a chapter may safely contain `<`, `>`,
`&`, or markup that is meant to be read rather than applied.

## Optional collection metadata

`_collection.json` in a collection folder can set the heading shown above the chapter
list. It is ignored when absent or malformed.

```json
{
  "title": "The Grand River Foundation",
  "subtitle": "A manuscript in progress",
  "author": "Harshal Priyavadan Patel",
  "description": "Submitted chapter by chapter as plaintext."
}
```

## What the reader shows

The **The Grand River Foundation** tab inside **The Book** lists every chapter with its
word count, renders one chapter at a time, remembers the last chapter read in the
browser, and shows a SHA-256 content digest of the manuscript as loaded. The digest
identifies a state of the text; it is not a signature, an authorization, or proof of
authorship. These files are published as static assets — do not put anything private
here that should not be readable from the deployed site.
