# NewsML-G2 integration

**Status:** one NewsML-G2 export per active D1-backed public report. HarshalOS does not ingest
external NewsML feeds.

## Public-report data flow

On a public report detail page, **Download NewsML-G2 record** requests:

```text
GET /api/community/publications/{publication-id}/newsml
```

The JavaScript Cloudflare Worker reads the active `published` row from D1 and serializes that row as
a NewsML-G2 2.35 `newsItem`. The route accepts no report body or client-supplied metadata. It returns
404 for withdrawn/hidden versions, verifies the stored public-report hash before export, and marks
the item `UNREVIEWED`; it does not upgrade computed phases into verification or certification.

The export uses the D1 series ID as a stable NewsML-G2 GUID across corrections, with the D1 version
number as the NewsML-G2 item version. It carries the exact stored public `report_json` as base64
`inlineData` with `contenttype="application/json"`; headline, author label, publication timestamps,
phase, and report hash are mapped to NewsML-G2 metadata. The author is explicitly a self-chosen,
unverified label. No license, rights statement, embargo, or language is invented because those
properties are not recorded in the D1 publication model. Withdrawal prevents future downloads, but
cannot recall exported copies.

Each report is exported as its own `newsItem`; there is no NewsML-G2 `newsMessage` feed or batch
syndication endpoint yet.

## Why the site does not run the Python package

The deployed browser shell and Worker are JavaScript. They generate XML directly in
`worker/community-newsml.mjs`; Python is not present in the Worker, invoked as a subprocess, or sent
to the browser. That keeps export tied to the existing D1 publication gate and avoids a second
runtime/service.

The optional `newsmlg2==1.1` dependency in
[`requirements-newsml-g2.txt`](../../requirements-newsml-g2.txt) is for local developer parsing and
round-trip experiments only. Install it into a virtual environment:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-newsml-g2.txt
```

For example, the package can parse a downloaded record:

```python
import NewsMLG2

document = NewsMLG2.NewsMLG2Document("ground0-public-report.xml")
item = document.get_item()
print(item.guid, item.standardversion, item.version)
```

Parsing is not XSD validation, source authentication, or evidence verification. Do not expose the
Python parser to untrusted uploads or feeds without a separate hardened ingestion design.

## Version and standards notes

The current PyPI package is `newsmlg2` 1.1 under MIT. Upstream descriptions are inconsistent: the
IPTC tools page still refers to beta support through NewsML-G2 2.29, while the 2025 IPTC announcement
calls v1.0 production-ready and describes support for all item families; the 1.1 README example uses
`standardversion="2.35"`. This site emits version 2.35; a local smoke check confirmed the 1.1
package can parse the generated News Item, but that is not XSD validation or a blanket conformance
claim. See the current IPTC specification and its usage terms before building other conformance or
syndication guarantees.

- [IPTC: Tools for NewsML-G2](https://iptc.org/standards/newsml-g2/tools-for-newsml-g2/)
- [IPTC: Open-source NewsML-G2 Python module announcement](https://iptc.org/news/open-source-newsml-g2-python-module-released/)
- [PyPI: newsmlg2](https://pypi.org/project/newsmlg2/)
- [IPTC: NewsML-G2 specification](https://iptc.org/standards/newsml-g2/)
