/* eslint-disable no-param-reassign */

import { Document, DocumentAttribute, StickerSet } from 'mtproto-js';
import { mockDocument } from './document';
import jobs from './files/jobs.webp';

let stickersetId = 1;

export function mockStickerSet({
  title = 'stickerset',
  short_name = '',
  thumb,
  count = 0,
  hash = 0,
}: Partial<StickerSet>): StickerSet {
  const id = (++stickersetId).toString(16);

  return {
    _: 'stickerSet',
    id,
    access_hash: `stickerhash${id}`,
    title,
    short_name,
    thumb,
    count,
    hash,
  };
}

export function mockStickerStatic(src: string, stickerset: StickerSet, size?: number): Document.document {
  stickerset.count++;

  return mockDocument(src, {
    size,
    mime_type: 'image/webp',
    attributes: [{
      _: 'documentAttributeSticker',
      alt: 'sticker',
      stickerset: {
        _: 'inputStickerSetID',
        id: stickerset.id,
      },
    } as DocumentAttribute.documentAttributeSticker],
  });
}

export const greatestMinds = mockStickerSet({ title: 'Great Minds', short_name: 'gminds' });
export const jobsSticker = mockStickerStatic(jobs, greatestMinds, 38298);
