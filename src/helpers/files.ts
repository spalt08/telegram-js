import { hex } from 'mtproto-js'
import { StorageFileType } from 'cache/types';

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
