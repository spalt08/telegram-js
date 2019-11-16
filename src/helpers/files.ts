import { hex } from 'mtproto-js';
import { StorageFileType, Document, InputFileLocation } from 'cache/types';

export function hexToBlob(str: string, type: string) {
  return new Blob([hex(str).buffer], { type });
}

export function blobToUrl(blob: Blob) {
  return (window.URL || window.webkitURL).createObjectURL(blob);
}

export function typeToMime(type: StorageFileType) {
  switch (type._) {
    case 'storage.fileJpeg': return 'image/jpeg';
    case 'storage.filePng': return 'image/png';
    default: return 'image/jpeg';
  }
}

export function getDocumentLocation(document: Document): InputFileLocation {
  return {
    _: 'inputDocumentFileLocation',
    id: document.id,
    access_hash: document.access_hash,
    file_reference: document.file_reference,
    thumb_size: 'm',
  };
}
