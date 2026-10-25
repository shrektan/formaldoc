import { afterAll, afterEach, beforeAll, describe, expect, it, setSystemTime } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { renderDocModelToFile, renderDocModelWithReport } from './render.js';
import { createFullExample, transparentPng } from './fixtures/full-example.js';

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'formaldoc-file-'));
});
afterEach(() => setSystemTime());
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('DocModel streaming file output', () => {
  it('preserves every decompressed part, duplicate images, original media names and report', async () => {
    setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const png = join(dir, 'image.png');
    const duplicate = join(dir, 'duplicate.png');
    const jpg = join(dir, 'image.jpeg');
    const pngAsJpg = join(dir, 'same-bytes.jpg');
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
    await Promise.all([
      writeFile(png, transparentPng),
      writeFile(duplicate, transparentPng),
      writeFile(jpg, jpegBytes),
      writeFile(pngAsJpg, transparentPng),
    ]);
    const model = createFullExample(png);
    const pictures = [png, duplicate, jpg, png, pngAsJpg].map((path) => ({
      type: 'image' as const,
      path,
      widthPt: 20,
      heightPt: 20,
    }));
    model.sections[0].blocks.push(...pictures);
    model.sections[0].header = pictures;
    model.footnotes = [
      {
        id: 'streaming-note',
        blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: 'note' }], anchors: pictures }],
      },
    ];
    const originalHash = createHash('sha1').update(transparentPng).digest('hex');
    const placeholderName = `${createHash('sha1').update(Buffer.from(originalHash)).digest('hex')}.png`;
    model.sections[0].blocks.push({
      type: 'p',
      styleId: 'Normal',
      runs: [
        {
          text: `media/${placeholderName} rId{${placeholderName}} {${originalHash}Xpng} {${originalHash}.jpg} {${originalHash}\npng} {${originalHash}𝄞png}\u0001`,
        },
        { text: '', footnote: { id: 'streaming-note' } },
        { text: '', math: { latex: '', fallback: { path: png, widthPt: 20, heightPt: 20 } } },
      ],
    });
    const previous = await renderDocModelWithReport(model);
    const output = join(dir, 'streamed.docx');
    const report = await renderDocModelToFile(JSON.stringify(model), output);
    expect(report).toEqual(previous.report);
    const buffered = await JSZip.loadAsync(previous.buffer);
    const streamed = await JSZip.loadAsync(await readFile(output));
    expect(Object.keys(streamed.files).sort()).toEqual(Object.keys(buffered.files).sort());
    for (const name of Object.keys(buffered.files)) {
      expect(await streamed.files[name].async('nodebuffer'), name).toEqual(
        await buffered.files[name].async('nodebuffer')
      );
    }
    for (const [bytes, type] of [
      [transparentPng, 'png'],
      [jpegBytes, 'jpg'],
      [transparentPng, 'jpg'],
    ] as const) {
      const name = `word/media/${createHash('sha1').update(bytes).digest('hex')}.${type}`;
      expect(await streamed.file(name)!.async('nodebuffer')).toEqual(bytes);
      // JSZip retains the ZIP method in the compressed object's magic bytes.
      const compressed = streamed.file(name)! as unknown as {
        _data: { compression: { magic: string } };
      };
      expect(compressed._data.compression.magic).toBe('\x00\x00');
    }
    const document = streamed.file('word/document.xml')! as unknown as {
      _data: { compression: { magic: string } };
    };
    expect(document._data.compression.magic).toBe('\x08\x00');
  });

  it('preserves every decompressed part for documents without images', async () => {
    setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const model = createFullExample(join(dir, 'unused.png'));
    model.sections = [
      {
        ...model.sections[0],
        header: [],
        footer: [],
        blocks: [{ type: 'p', styleId: 'Normal', runs: [{ text: '正文' }] }],
      },
    ];
    const previous = await renderDocModelWithReport(model);
    const output = join(dir, 'no-images.docx');
    expect(await renderDocModelToFile(model, output)).toEqual(previous.report);
    const buffered = await JSZip.loadAsync(previous.buffer);
    const streamed = await JSZip.loadAsync(await readFile(output));
    expect(Object.keys(streamed.files).sort()).toEqual(Object.keys(buffered.files).sort());
    for (const name of Object.keys(buffered.files))
      expect(await streamed.files[name].async('nodebuffer'), name).toEqual(
        await buffered.files[name].async('nodebuffer')
      );
  });

  it('restores the compiler for concurrent file and Buffer renders', async () => {
    setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const path = join(dir, 'concurrent.png');
    await writeFile(path, transparentPng);
    const model = createFullExample(path);
    const baseline = await renderDocModelWithReport(model);
    const output = join(dir, 'concurrent.docx');
    const [report, buffered] = await Promise.all([
      renderDocModelToFile(model, output),
      renderDocModelWithReport(model),
    ]);
    expect(report).toEqual(baseline.report);
    expect(buffered.report).toEqual(baseline.report);
    const expected = await JSZip.loadAsync(baseline.buffer);
    for (const archive of [buffered.buffer, await readFile(output)]) {
      const actual = await JSZip.loadAsync(archive);
      expect(Object.keys(actual.files).sort()).toEqual(Object.keys(expected.files).sort());
      for (const name of Object.keys(expected.files))
        expect(await actual.files[name].async('nodebuffer'), name).toEqual(
          await expected.files[name].async('nodebuffer')
        );
    }
  });

  it('preserves JSON validation error messages', async () => {
    await expect(renderDocModelToFile('{', join(dir, 'invalid.docx'))).rejects.toThrow(
      'Invalid DocModel JSON:'
    );
    await expect(renderDocModelToFile('{}', join(dir, 'invalid.docx'))).rejects.toThrow(
      'Invalid DocModel:'
    );
  });

  it('rejects unreadable image inputs', async () => {
    const model = createFullExample(join(dir, 'missing.png'));
    await expect(renderDocModelToFile(model, join(dir, 'missing.docx'))).rejects.toThrow();
  });

  it('propagates destination stream errors', async () => {
    const image = join(dir, 'write-error.png');
    await writeFile(image, transparentPng);
    await expect(renderDocModelToFile(createFullExample(image), dir)).rejects.toThrow();
  });
});
