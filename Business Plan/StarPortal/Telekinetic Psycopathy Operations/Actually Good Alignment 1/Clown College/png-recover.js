/* png-recover.js — tolerant decoder for truncated 8-bit RGBA non-interlaced PNGs.
   usage: node png-recover.js input.png output.pam
   Streams the zlib IDAT so partial output before truncation is kept, un-filters
   complete rows, fills missing rows with the last good row, writes a PAM. */
const fs = require("fs");
const zlib = require("zlib");

function walkChunks(buf) {
  const out = [];
  let p = 8;
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("ascii", p + 4, p + 8);
    const start = p + 8;
    let end = start + len;
    if (end > buf.length) end = buf.length;
    const c = { type, data: buf.slice(start, end), declared: len, actual: end - start };
    out.push(c);
    p = end + 4;                    // skip CRC (may be missing on the last chunk)
    if (c.actual < c.declared) break; // truncated final chunk — stop here
  }
  return out;
}

async function main() {
  const [inp, outp] = process.argv.slice(2);
  const buf = fs.readFileSync(inp);
  const cs = walkChunks(buf);
  const ihdr = cs.find(c => c.type === "IHDR");
  if (!ihdr) { console.error(inp + ": no IHDR"); process.exit(1); }
  const W = ihdr.data.readUInt32BE(0), H = ihdr.data.readUInt32BE(4);
  const depth = ihdr.data[8], ctype = ihdr.data[9], inter = ihdr.data[12];
  if (depth !== 8 || ctype !== 6 || inter !== 0) {
    console.error(inp + ": unsupported (depth " + depth + " ctype " + ctype + " interlace " + inter + ")"); process.exit(1);
  }
  const idat = Buffer.concat(cs.filter(c => c.type === "IDAT").map(c => c.data));

  // streaming inflate — resolve with whatever was emitted before the error
  const parts = await new Promise(res => {
    const acc = [];
    const inf = zlib.createInflate();
    inf.on("data", d => acc.push(d));
    inf.on("error", () => res({ acc, failed: true }));
    inf.on("end", () => res({ acc, failed: false }));
    inf.end(idat);
  });
  const raw = Buffer.concat(parts.acc);
  const stride = 1 + W * 4;
  const completeRows = Math.floor(raw.length / stride);

  // un-filter (types 0..4), RGBA
  const bpp = 4;
  const rows = [];
  let prev = Buffer.alloc(W * bpp);
  for (let y = 0; y < completeRows; y++) {
    const ft = raw[y * stride];
    const cur = Buffer.alloc(W * bpp);
    for (let x = 0; x < W * bpp; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = raw[y * stride + 1 + x];
      if (ft === 1) v = (v + a) & 255;
      else if (ft === 2) v = (v + b) & 255;
      else if (ft === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (ft === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v = (v + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c))) & 255;
      }
      cur[x] = v;
    }
    rows.push(cur);
    prev = cur;
  }
  const missing = H - rows.length;
  while (rows.length < H) rows.push(rows.length ? rows[rows.length - 1] : Buffer.alloc(W * bpp));
  // (fill with last good row — the tail of these renders is background)

  const head = "P7\nWIDTH " + W + "\nHEIGHT " + H + "\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n";
  fs.writeFileSync(outp, Buffer.concat([Buffer.from(head, "ascii")].concat(rows)));
  console.log(inp + ": " + W + "x" + H +
    " · inflate " + (parts.failed ? "TRUNCATED" : "complete") +
    " · recovered " + completeRows + "/" + H + " rows (" + (100 * completeRows / H).toFixed(2) + "%)" +
    " · missing " + missing + " rows" +
    " · idat bytes " + idat.length);
}
main();
