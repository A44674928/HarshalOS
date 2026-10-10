# Archived patches

Patch artifacts are preserved here for provenance and reference, outside the
public website asset bundle. Archiving a patch does not apply or reverse it.

## 01a1063a-c331-7c45-a432-8a9eb5fef6b1.patch

- Archived on: 2026-10-04
- Original location: repository root (`01a1063a-c331-7c45-a432-8a9eb5fef6b1.patch`)
- Reason: user requested archival and believes the patch was already applied.
- Application status: not independently verified during archival; do not
  reapply automatically.
- Integrity: contents preserved byte-for-byte.
- SHA-256: `9bdf3b9fc2b4ade4003dde8450ad210e6ca6ac59d7552a66beb2c5bf1d3e12b7`

## 01a11f72-499c-7d29-908a-d96512081999.patch

- Archived on: 2026-10-10
- Original location: repository root (`01a11f72-499c-7d29-908a-d96512081999.patch`)
- Reason: root-level patch drops violate the P13 repository-layout invariant
  (repository root stays limited to entry points, configuration, tooling, and
  policy) and fail the integrity suite in CI; `/*.patch` is git-ignored at
  root but the file predates the rule and stayed tracked.
- Application status: not independently verified during archival; do not
  reapply automatically.
- Integrity: contents preserved byte-for-byte via `git mv`.
- SHA-256: `ac76c493b235e47a1772e942c7432093ecd28821be55caf949c777b15985298e`
