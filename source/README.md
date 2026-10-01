# Build sources

| File | Purpose |
|---|---|
| `build.py` | The documentation build. Reads the Owner's Working Draft and writes the manual. |
| `working-draft.md` | Snapshot of the Owner's Working Draft, byte-identical to the root file on `main`. |

## Running the build

```bash
python3 source/build.py
```

`build.py` prefers the draft at the repository root when it is present
(`Harshal's Systems (Copyrighted) [Owner's Working Draft].md`) and falls back to the
snapshot beside this file, so the build works on any branch.

Outputs:

| Path | What it is |
|---|---|
| `HARSHAL-SYSTEMS-USER-MANUAL.md` | The assembled single-file manual |
| `docs/harshal-systems/*.md` | The same manual, one file per part |
| `docs/harshal-systems/EDITORIAL-REPORT.md` | What the build found and changed |
| `docs/harshal-systems/README.md` | Index of the parts |

The build is deterministic. Running it twice on the same input produces byte-identical output.
