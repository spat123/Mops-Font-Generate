function crc32(bytes: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ -1) >>> 0;
}

function writeUint16LE(value: number): Uint8Array {
  const out = new Uint8Array(2);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  return out;
}

function writeUint32LE(value: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  out[2] = (value >>> 16) & 0xff;
  out[3] = (value >>> 24) & 0xff;
  return out;
}

function concatUint8(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function normalizeZipPath(inputName: unknown): string {
  return String(inputName || 'file.bin')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

export type ZipEntry = {
  name: string;
  data: Blob | ArrayBuffer | Uint8Array | string;
};

/**
 * Создаёт ZIP (store, без компрессии) в браузере.
 */
export async function createZipBlob(entries: ZipEntry[]): Promise<Blob> {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('ZIP: entries is empty');
  }

  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const rawEntry of entries) {
    const fileName = normalizeZipPath(rawEntry?.name);
    if (!fileName) continue;
    const fileNameBytes = encoder.encode(fileName);

    let dataBytes: Uint8Array;
    const source = rawEntry?.data;
    if (source instanceof Blob) {
      dataBytes = new Uint8Array(await source.arrayBuffer());
    } else if (source instanceof Uint8Array) {
      dataBytes = source;
    } else if (source instanceof ArrayBuffer) {
      dataBytes = new Uint8Array(source);
    } else if (typeof source === 'string') {
      dataBytes = encoder.encode(source);
    } else {
      throw new Error(`ZIP: unsupported data for ${fileName}`);
    }

    const crc = crc32(dataBytes);
    const dataSize = dataBytes.length >>> 0;
    const fileNameLen = fileNameBytes.length;

    const localHeader = concatUint8([
      writeUint32LE(0x04034b50),
      writeUint16LE(20),
      writeUint16LE(0),
      writeUint16LE(0),
      writeUint16LE(0),
      writeUint16LE(0),
      writeUint32LE(crc),
      writeUint32LE(dataSize),
      writeUint32LE(dataSize),
      writeUint16LE(fileNameLen),
      writeUint16LE(0),
      fileNameBytes,
    ]);

    localParts.push(localHeader, dataBytes);

    const centralHeader = concatUint8([
      writeUint32LE(0x02014b50),
      writeUint16LE(20),
      writeUint16LE(20),
      writeUint16LE(0),
      writeUint16LE(0),
      writeUint16LE(0),
      writeUint16LE(0),
      writeUint32LE(crc),
      writeUint32LE(dataSize),
      writeUint32LE(dataSize),
      writeUint16LE(fileNameLen),
      writeUint16LE(0),
      writeUint16LE(0),
      writeUint16LE(0),
      writeUint16LE(0),
      writeUint32LE(0),
      writeUint32LE(localOffset),
      fileNameBytes,
    ]);

    centralParts.push(centralHeader);
    localOffset += localHeader.length + dataBytes.length;
  }

  const centralDir = concatUint8(centralParts);
  const localData = concatUint8(localParts);
  const centralSize = centralDir.length;
  const centralOffset = localData.length;
  const totalEntries = centralParts.length;

  const endOfCentralDir = concatUint8([
    writeUint32LE(0x06054b50),
    writeUint16LE(0),
    writeUint16LE(0),
    writeUint16LE(totalEntries),
    writeUint16LE(totalEntries),
    writeUint32LE(centralSize),
    writeUint32LE(centralOffset),
    writeUint16LE(0),
  ]);

  return new Blob([localData, centralDir, endOfCentralDir] as BlobPart[], { type: 'application/zip' });
}
