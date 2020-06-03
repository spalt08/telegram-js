import { Document } from 'mtproto-js';
import { SERVICE_WORKER_SCOPE } from 'const';
import { fileMap } from './files';

let localIdCounter = 1;

export function mockDocument(src: string, {
  date = Date.now(),
  mime_type = '',
  size = 0,
  thumbs = [],
  dc_id = 2,
  attributes = [],
}: Partial<Document.document>): Document.document {
  const id = (++localIdCounter).toString(16);
  const access_hash = `dochash${id}`;

  const document = {
    _: 'document',
    id,
    access_hash,
    file_reference: new Uint8Array(8).buffer,
    date,
    mime_type,
    size,
    thumbs,
    dc_id,
    attributes,
  } as Document.document;

  const url = `${SERVICE_WORKER_SCOPE}documents/${id}_`;
  fileMap[url] = src;

  return document;
}
