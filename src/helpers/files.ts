/* eslint-disable no-param-reassign */
import { StorageFileType, Document, InputFileLocation, DocumentAttribute, PhotoSize } from 'mtproto-js';
import { SERVICE_WORKER_SCOPE } from 'const';
import { DownloadOptions } from 'client/types';
import { PhotoOptions } from './other';

export function hexToStr(hex: string): string {
  let str = '';

  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(+`0x${hex.slice(i, i + 2)}`);
  }

  return str;
}

export function hexBytesToArray(hex: string): number[] {
  const result = [];

  for (let i = 0; i < hex.length; i += 2) {
    result.push(parseInt(hex.slice(i, i + 2), 16));
  }

  return result;
}

export function arrayToBlob(buf: ArrayBuffer, type: string) {
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

export function typeToMime(type: StorageFileType): string | undefined {
  switch (type._) {
    case 'storage.fileJpeg': return 'image/jpeg';
    case 'storage.filePng': return 'image/png';
    case 'storage.fileGif': return 'image/gif';
    case 'storage.filePdf': return 'application/pdf';
    case 'storage.fileMp3': return 'audio/mpeg';
    case 'storage.fileMov': return 'video/quicktime';
    case 'storage.fileMp4': return 'video/mp4';
    case 'storage.fileWebp': return 'image/webp';
    default: return undefined;
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

export function getAttribute(document: Document, name: 'documentAttributeAnimated'): DocumentAttribute.documentAttributeAnimated | null;
export function getAttribute(document: Document, name: 'documentAttributeFilename'): DocumentAttribute.documentAttributeFilename | null;
export function getAttribute(document: Document, name: 'documentAttributeSticker'): DocumentAttribute.documentAttributeSticker | null;
export function getAttribute(document: Document, name: 'documentAttributeVideo'): DocumentAttribute.documentAttributeVideo | null;
export function getAttribute(document: Document, name: 'documentAttributeAudio'): DocumentAttribute.documentAttributeAudio | null;
export function getAttribute(document: Document, name: string): DocumentAttribute | null {
  if (document._ === 'documentEmpty') return null;

  for (let i = 0; i < document.attributes.length; i += 1) {
    const attr = document.attributes[i];
    if (attr._ === name) return attr;
  }

  return null;
}

export function getAttributeSticker(document: Document) {
  return getAttribute(document, 'documentAttributeSticker');
}

export function getAttributeVideo(document: Document) {
  return getAttribute(document, 'documentAttributeVideo');
}

export function getAttributeAudio(document: Document) {
  return getAttribute(document, 'documentAttributeAudio');
}

export function getAttributeFilename(document: Document) {
  return getAttribute(document, 'documentAttributeFilename');
}

export function getAttributeAnimated(document: Document) {
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
  // eslint-disable-next-line no-param-reassign
  duration = Math.floor(duration);
  const seconds = `0${duration % 60}`.slice(-2);
  let minutes: number | string = Math.floor(duration / 60);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    minutes = `0${minutes % 60}`.slice(-2);

    return `${hours}:${minutes}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

export function useVideoArrtibuteSize(container: HTMLElement, attr: DocumentAttribute.documentAttributeVideo, options: PhotoOptions) {
  const isLandscape = attr.w > attr.h;
  const dim = attr.w / attr.h;

  if (isLandscape && options.width) {
    container.style.width = `${options.width}px`;
    container.style.height = `${options.width / dim}px`;
  }

  if (!isLandscape && options.height) {
    container.style.width = `${options.height * dim}px`;
    container.style.height = `${options.height}px`;
  }
}

export function usePhotoSize(container: HTMLElement, size: PhotoSize.photoSize, options: PhotoOptions) {
  const dim = size.w / size.h;
  const orientation = size.w >= size.h ? 'landscape' : 'portrait';

  if (options.fit === 'contain') {
    if (orientation === 'landscape' && options.width) {
      if (options.height && options.width / dim > options.height) {
        container.style.height = `${Math.min(size.h, options.height)}px`;
        container.style.width = `${Math.min(size.w, options.height * dim)}px`;
      } else {
        container.style.width = `${Math.min(options.width, size.w)}px`;
        container.style.height = `${Math.min(size.h, options.width / dim)}px`;
      }
    }
    if (orientation === 'portrait' && options.height) {
      if (options.width && options.height * dim > options.width) {
        container.style.width = `${Math.min(options.width, size.w)}px`;
        container.style.height = `${Math.min(size.h, options.width / dim)}px`;
      } else {
        container.style.height = `${Math.min(size.h, options.height)}px`;
        container.style.width = `${Math.min(size.w, options.height * dim)}px`;
      }
    }
  } else {
    container.style.width = `${options.width}px`;
    container.style.height = `${options.height}px`;
  }
}

export function locationToURL(location: InputFileLocation, _options?: DownloadOptions): string {
  let filename: string | undefined;

  switch (location._) {
    case 'inputPeerPhotoFileLocation':
      filename = `${SERVICE_WORKER_SCOPE}profiles/${location.local_id}_${location.volume_id}.jpg`;
      break;

    case 'inputPhotoFileLocation':
      return `${SERVICE_WORKER_SCOPE}photos/${location.id}_${location.thumb_size}`;

    case 'inputDocumentFileLocation':
      return `${SERVICE_WORKER_SCOPE}documents/${location.id}_${location.thumb_size}`;

    default:
      // if (ext) filename += `.${ext}`;
  }

  if (!filename) throw new Error(`No location cache value for ${location}`);

  return filename;
}

export function getStreamServiceURL(document: Document.document) {
  const fname = getAttributeFilename(document);
  const ext = fname ? `.${fname.file_name.split('.').pop()}` : '';

  return `/stream/document_${document.id}${ext}`;
}
