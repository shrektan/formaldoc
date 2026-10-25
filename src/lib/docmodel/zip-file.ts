import { open } from 'node:fs/promises';
import * as zlib from 'node:zlib';
import type JSZip from 'jszip';

// Node 20 has no zlib.crc32. Keep the package's existing Node >=20 contract.
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});
const crc32 =
  zlib.crc32 ??
  ((bytes: Uint8Array, previous = 0): number => {
    let crc = previous ^ -1;
    for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
    return (crc ^ -1) >>> 0;
  });
const MAX_UINT32 = 0xffffffff;

/** Sequential ZIP32 output: one native XML compressor and one reusable media buffer. */
export async function writeDocModelZip(
  zip: JSZip,
  mediaSources: ReadonlyMap<string, string>,
  outputPath: string
): Promise<void> {
  const entries = Object.values(zip.files);
  if (entries.length >= 0xffff) throw new Error('ZIP64 output is not supported');
  const output = await open(outputPath, 'w');
  const central: Buffer[] = [];
  const scratch = Buffer.allocUnsafe(64 * 1024);
  let offset = 0;
  const write = async (bytes: Uint8Array, position = offset) => {
    let written = 0;
    while (written < bytes.length) {
      const result = await output.write(bytes, written, bytes.length - written, position + written);
      if (!result.bytesWritten) throw new Error('ZIP write made no progress');
      written += result.bytesWritten;
    }
    if (position === offset) offset += bytes.length;
    if (offset > MAX_UINT32) throw new Error('ZIP64 output is not supported');
  };
  try {
    for (const entry of entries) {
      const name = Buffer.from(entry.name);
      if (name.length > 0xffff) throw new Error('ZIP entry name is too long');
      const sourcePath = mediaSources.get(entry.name);
      const method = sourcePath || entry.dir ? 0 : 8;
      const year = Math.max(1980, Math.min(2107, entry.date.getFullYear()));
      const time =
        (entry.date.getHours() << 11) |
        (entry.date.getMinutes() << 5) |
        (entry.date.getSeconds() >> 1);
      const date = ((year - 1980) << 9) | ((entry.date.getMonth() + 1) << 5) | entry.date.getDate();
      const start = offset;
      const local = Buffer.alloc(30 + name.length);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6);
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(date, 12);
      local.writeUInt16LE(name.length, 26);
      name.copy(local, 30);
      await write(local);
      let crc = 0;
      let size = 0;
      const dataStart = offset;
      if (sourcePath) {
        const source = await open(sourcePath, 'r');
        try {
          if (!(await source.stat()).isFile())
            throw new Error(`Image is not a regular file: ${sourcePath}`);
          let length: number;
          while ((length = (await source.read(scratch, 0, scratch.length, null)).bytesRead)) {
            const bytes = scratch.subarray(0, length);
            crc = crc32(bytes, crc);
            size += length;
            await write(bytes);
          }
        } finally {
          await source.close();
        }
      } else if (!entry.dir) {
        const bytes = await entry.async('nodebuffer');
        crc = crc32(bytes);
        size = bytes.length;
        // Native zlib releases its workspace after each call; pako workspaces for
        // thousands of tiny header/footer XML parts otherwise accumulate until GC.
        await write(zlib.deflateRawSync(bytes));
      }
      const compressedSize = offset - dataStart;
      if (size > MAX_UINT32) throw new Error('ZIP64 output is not supported');
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(compressedSize, 18);
      local.writeUInt32LE(size, 22);
      await write(local, start);
      const header = Buffer.alloc(46 + name.length);
      header.writeUInt32LE(0x02014b50, 0);
      header.writeUInt16LE(20, 4);
      header.writeUInt16LE(20, 6);
      header.writeUInt16LE(0x0800, 8);
      header.writeUInt16LE(method, 10);
      header.writeUInt16LE(time, 12);
      header.writeUInt16LE(date, 14);
      header.writeUInt32LE(crc, 16);
      header.writeUInt32LE(compressedSize, 20);
      header.writeUInt32LE(size, 24);
      header.writeUInt16LE(name.length, 28);
      header.writeUInt32LE(entry.dir ? 0x10 : 0, 38);
      header.writeUInt32LE(start, 42);
      name.copy(header, 46);
      central.push(header);
    }
    const directoryStart = offset;
    for (const header of central) await write(header);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(central.length, 8);
    end.writeUInt16LE(central.length, 10);
    end.writeUInt32LE(offset - directoryStart, 12);
    end.writeUInt32LE(directoryStart, 16);
    await write(end);
  } finally {
    await output.close();
  }
}
