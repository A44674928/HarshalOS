# Build sources

| File | Purpose |
|---|---|
| `build.py` | The documentation build. Reads the Owner's Working Draft and writes the manual. |
| `working-draft.md` | Canonical checked-in build input; the byte-identical former root copy is in `archives/Duplicates/`. |

## Running the build

```bash
python3 source/build.py
```

`build.py` uses the canonical snapshot beside this file. A root-level Owner's Working Draft
can override it when supplied by another checkout; the identical root copy in this repository
is quarantined under `archives/Duplicates/`.

Outputs:

| Path | What it is |
|---|---|
| `publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md` | The assembled single-file manual |
| `docs/harshal-systems/*.md` | The same manual, one file per part |
| `docs/harshal-systems/EDITORIAL-REPORT.md` | What the build found and changed |
| `docs/harshal-systems/README.md` | Index of the parts |

The build is deterministic. Running it twice on the same input produces byte-identical output.
