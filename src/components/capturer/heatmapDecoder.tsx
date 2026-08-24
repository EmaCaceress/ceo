// heatmapDecoder.ts
// Traducción legible del decodeHeatmap minificado de XPERTrak.

const CHAR_A = "A".charCodeAt(0);
const CHAR_a = "a".charCodeAt(0);
const CHAR_0 = "0".charCodeAt(0);
const CHAR_PLUS = "+".charCodeAt(0);
const CHAR_SLASH = "/".charCodeAt(0);

function sextetValue(char: string): number {
  const code = char.charCodeAt(0);
  if (code >= CHAR_A && code < CHAR_A + 26) return code - CHAR_A;
  if (code >= CHAR_a && code < CHAR_a + 26) return code - CHAR_a + 26;
  if (code >= CHAR_0 && code < CHAR_0 + 10) return code - CHAR_0 + 52;
  if (code === CHAR_PLUS) return 62;
  if (code === CHAR_SLASH) return 63;
  throw new Error("Carácter base64 inválido: " + char);
}

function readUInt24(str: string, offset: number): number {
  const chunk = str.substring(offset, offset + 4);
  return (
    sextetValue(chunk[0]) * 2 ** 18 +
    sextetValue(chunk[1]) * 2 ** 12 +
    sextetValue(chunk[2]) * 2 ** 6 +
    sextetValue(chunk[3])
  );
}

function readInt24(str: string, offset: number): number {
  const n = readUInt24(str, offset);
  return n < 2 ** 23 ? n : -(1 + (0xffffff ^ n));
}

export interface DecodedHeatmapHeader {
  type: number;
  height: number;
  width: number;
  minLevel: number;
  maxLevel: number;
  startFreq: number;
  endFreq: number;
  length: number;
}

export interface DecodedHeatmap {
  header: DecodedHeatmapHeader;
  grid: Uint8Array;
}

export function decodeHeatmap(raw: string): DecodedHeatmap {
  const header: DecodedHeatmapHeader = {
    type: readUInt24(raw, 0),
    height: readUInt24(raw, 4),
    width: readUInt24(raw, 8),
    minLevel: readInt24(raw, 12) / 1000,
    maxLevel: readInt24(raw, 16) / 1000,
    startFreq: readUInt24(raw, 20) / 1000,
    endFreq: readUInt24(raw, 24) / 1000,
    length: readUInt24(raw, 28),
  };

  const grid = new Uint8Array(header.width * header.height);

  let col = 0;
  let row = 0;
  
  for (let u = 32; u < raw.length; u += 2) {
    const weight = sextetValue(raw[u]);
    let count = sextetValue(raw[u + 1]);
  
    while (col + count > header.width) {
      const fillCurrentRow = header.width - col;
      if (fillCurrentRow > 0 && weight > 0) {
        grid.fill(weight, row * header.width + col, row * header.width + col + fillCurrentRow);
      }
      count -= fillCurrentRow;
      row += 1;
      col = 0;
      if (row >= header.height) break;
    }
  
    if (row >= header.height) break;
  
    if (count > 0 && weight > 0) {
      grid.fill(weight, row * header.width + col, row * header.width + col + count);
    }
    col += count;
  }

  return { header, grid };
}