import { StorageFileType, Document, InputFileLocation, DocumentAttribute } from 'cache/types';

export function hexToStr(hex: string): string {
  let str = '';

  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(+`0x${hex.slice(i, i + 2)}`);
  }

  return str;
}

export function strToBlob(str: string, type: string) {
  const buf = new Uint8Array(str.length);

  for (let i = 0; i < str.length; i += 1) {
    buf[i] = str.charCodeAt(i);
  }

  return new Blob([buf], { type });
}

export function hexToBlob(str: string, type: string) {
  const buf = new Uint8Array(str.length / 2);

  for (let i = 0; i < str.length; i += 2) {
    buf[i / 2] = +`0x${str.slice(i, i + 2)}`;
  }

  return new Blob([buf], { type });
}

export function blobToUrl(blob: Blob) {
  return (URL || webkitURL).createObjectURL(blob);
}

export function typeToMime(type: StorageFileType) {
  switch (type._) {
    case 'storage.fileJpeg': return 'image/jpeg';
    case 'storage.filePng': return 'image/png';
    default: return 'image/jpeg';
  }
}

export function locationToString(location: InputFileLocation): string {
  switch (location._) {
    case 'inputPeerPhotoFileLocation':
      return `profile_${location.local_id}_${location.volume_id}`;

    case 'inputPhotoFileLocation':
      return `photo_${location.id}_${location.thumb_size}`;

    case 'inputDocumentFileLocation':
      return `document_${location.id}_${location.thumb_size}`;

    case 'inputStickerSetThumb':
      if (location.stickerset._ === 'inputStickerSetID') {
        return `set_thumb_${location.stickerset.id}_${location.local_id}_${location.volume_id}`;
      }
      break;
    default:
  }

  throw new Error(`No location hash value for ${location}`);
}

export function getDocumentLocation(document: Document.document, size: string = 'y'): InputFileLocation {
  return {
    _: 'inputDocumentFileLocation',
    id: document.id,
    access_hash: document.access_hash,
    file_reference: document.file_reference,
    thumb_size: size,
  };
}

export function getAttribute(document: Document.document, name: 'documentAttributeAnimated'): DocumentAttribute.documentAttributeAnimated | null;
export function getAttribute(document: Document.document, name: 'documentAttributeFilename'): DocumentAttribute.documentAttributeFilename | null;
export function getAttribute(document: Document.document, name: 'documentAttributeSticker'): DocumentAttribute.documentAttributeSticker | null;
export function getAttribute(document: Document.document, name: 'documentAttributeVideo'): DocumentAttribute.documentAttributeVideo | null;
export function getAttribute(document: Document.document, name: string): DocumentAttribute | null {
  for (let i = 0; i < document.attributes.length; i += 1) {
    const attr = document.attributes[i];
    if (attr._ === name) return attr;
  }

  return null;
}

export function getAttributeSticker(document: Document.document) {
  return getAttribute(document, 'documentAttributeSticker');
}

export function getAttributeVideo(document: Document.document) {
  return getAttribute(document, 'documentAttributeVideo');
}

export function getAttributeFilename(document: Document.document) {
  return getAttribute(document, 'documentAttributeFilename');
}

export function getAttributeAnimated(document: Document.document) {
  return getAttribute(document, 'documentAttributeAnimated');
}

const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
export function getReadableSize(fsize: number): string {
  let size = fsize;
  let sizePostfixIndex = 0;

  while (size > 1024) {
    size /= 1024;
    sizePostfixIndex++;
  }

  return `${size.toFixed(2).replace(/\.0+$/, '')} ${sizes[sizePostfixIndex]}`;
}

export function getReadableDuration(duration: number) {
  const seconds = `0${duration % 60}`.slice(-2);
  let minutes: number | string = Math.floor(duration / 60);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    minutes = `0${minutes % 60}`.slice(-2);

    return `${hours}:${minutes}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}
