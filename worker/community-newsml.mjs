const NAR = 'http://iptc.org/std/nar/2006-10-01/';
const IPTC_CATALOG = 'https://www.iptc.org/std/catalog/catalog.IPTC-G2-Standards_41.xml';
export const NEWSML_CONTENT_TYPE = 'application/vnd.iptc.g2.newsitem+xml; charset=utf-8';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const validXmlCodePoint = cp => cp === 0x9 || cp === 0xa || cp === 0xd
  || (cp >= 0x20 && cp <= 0xd7ff)
  || (cp >= 0xe000 && cp <= 0xfffd)
  || (cp >= 0x10000 && cp <= 0x10ffff);

function xmlSafe(value) {
  let result = '';
  for (const character of String(value ?? '')) {
    const codePoint = character.codePointAt(0);
    result += validXmlCodePoint(codePoint) ? character : '\uFFFD';
  }
  return result;
}

function xmlText(value) {
  return xmlSafe(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function xmlAttribute(value) {
  return xmlText(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function timestamp(value) {
  const milliseconds = Number(value);
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) throw new TypeError('Invalid publication timestamp.');
  return new Date(milliseconds).toISOString();
}

function base64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

/**
 * Serialize one already-published D1 row as a NewsML-G2 News Item.
 * The report JSON is carried byte-for-byte (UTF-8) as base64 inlineData so
 * XML-illegal characters in author-submitted text cannot corrupt the payload.
 */
export function buildPublicReportNewsML(row, origin) {
  if (!row || row.state !== 'published' || !UUID.test(row.id) || !UUID.test(row.series_id)
    || !Number.isSafeInteger(Number(row.version)) || Number(row.version) < 1
    || !/^[0-9a-f]{64}$/.test(row.report_hash)
    || typeof row.title !== 'string' || typeof row.author !== 'string' || typeof row.phase !== 'string'
    || typeof row.report_json !== 'string') {
    throw new TypeError('Invalid active public publication.');
  }

  const site = new URL(origin);
  if (site.protocol !== 'https:' || site.origin !== origin) throw new TypeError('Invalid public site origin.');
  const versionCreated = timestamp(row.created_at);
  const firstCreated = timestamp(row.series_created_at ?? row.created_at);
  const dateId = firstCreated.slice(0, 10).replaceAll('-', '');
  const guid = `urn:newsml:${site.hostname}:${dateId}:community-${row.series_id}`;
  const payload = base64(new TextEncoder().encode(row.report_json));
  const version = Number(row.version);
  const description = [
    'Public Ground-0 audit report. Status: UNREVIEWED; this is not independent verification or platform certification.',
    `Computed phase: ${row.phase}.`,
    'The author label is self-chosen and is not identity-verified.',
    `D1 public-report SHA-256: ${row.report_hash}.`
  ].join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<newsItem xmlns="${NAR}" guid="${xmlAttribute(guid)}" version="${version}" standard="NewsML-G2" standardversion="2.35" conformance="power">\n`
    + `  <catalogRef href="${IPTC_CATALOG}"/>\n`
    + `  <itemMeta>\n`
    + `    <itemClass qcode="ninat:text"/>\n`
    + `    <provider uri="${xmlAttribute(site.origin + '/')}"><name>HarshalOS Community Register</name></provider>\n`
    + `    <versionCreated>${versionCreated}</versionCreated>\n`
    + `    <firstCreated>${firstCreated}</firstCreated>\n`
    + `  </itemMeta>\n`
    + `  <contentMeta>\n`
    + `    <creator><name>${xmlText(row.author)}</name></creator>\n`
    + `    <keyword>Ground-0</keyword>\n`
    + `    <keyword>UNREVIEWED</keyword>\n`
    + `    <headline>${xmlText(row.title)}</headline>\n`
    + `    <description>${xmlText(description)}</description>\n`
    + `  </contentMeta>\n`
    + `  <contentSet>\n`
    + `    <inlineData contenttype="application/json" encoding="base64">${payload}</inlineData>\n`
    + `  </contentSet>\n`
    + `</newsItem>\n`;
}
