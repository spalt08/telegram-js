/* eslint-disable prefer-destructuring, prefer-template, max-len */
import { PhotoSize, InputFileLocation, PhotoNotEmpty, Peer, Message, Document, PhotoSizeWithLocation } from 'cache/types';
import { peerToInputPeer, getPeerPhotoLocation } from 'cache/accessors';
import { blobToUrl, hexToBlob, hexToStr, strToBlob } from './files';

/**
 * Ref: https://github.com/telegramdesktop/tdesktop/blob/bec39d89e19670eb436dc794a8f20b657cb87c71/Telegram/SourceFiles/ui/image/image.cpp#L225
 */
export function strippedToBlob(stripped: string): Blob {
  const header = '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00(\x1c\x1e#\x1e\x19(#!#-+(0<dA<77<{X]Id\x91\x80\x99\x96\x8f\x80\x8c\x8a\xa0\xb4\xe6\xc3\xa0\xaa\xda\xad\x8a\x8c\xc8\xff\xcb\xda\xee\xf5\xff\xff\xff\x9b\xc1\xff\xff\xff\xfa\xff\xe6\xfd\xff\xf8\xff\xdb\x00C\x01+--<5<vAAv\xf8\xa5\x8c\xa5\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xf8\xff\xc0\x00\x11\x08\x00\x00\x00\x00\x03\x01"\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xc4\x00\x1f\x01\x00\x03\x01\x01\x01\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00\xb5\x11\x00\x02\x01\x02\x04\x04\x03\x04\x07\x05\x04\x04\x00\x01\x02w\x00\x01\x02\x03\x11\x04\x05!1\x06\x12AQ\x07aq\x13"2\x81\x08\x14B\x91\xa1\xb1\xc1\t#3R\xf0\x15br\xd1\n\x16$4\xe1%\xf1\x17\x18\x19\x1a&\'()*56789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x82\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00?\x00';

  return strToBlob(
    header.slice(0, 164)
    + hexToStr(stripped.slice(2, 4))
    + header.charAt(165)
    + hexToStr(stripped.slice(4, 6))
    + header.slice(167)
    + hexToStr(stripped.slice(6))
    + '\xff\xd9', 'image/jpeg');
}

export function getThumbnail(sizes: PhotoSize[]) {
  for (let i = 0; i < sizes.length; i += 1) {
    const size = sizes[i];

    if (size._ === 'photoStrippedSize') {
      const blob = strippedToBlob(size.bytes);
      return blobToUrl(blob);
    }

    if (size._ === 'photoCachedSize') {
      const blob = hexToBlob(size.bytes, 'image/jpeg');
      return blobToUrl(blob);
    }
  }

  return null;
}

export type PhotoOrinetation = 'landscape' | 'portrait';

export function getOrientation(sizes: PhotoSize[]): PhotoOrinetation {
  for (let i = 0; i < sizes.length; i += 1) {
    const size = sizes[i];

    if (size._ === 'photoSize') {
      return size.w >= size.h ? 'landscape' : 'portrait';
    }
  }

  return 'landscape';
}

export type PhotoFitMode = 'contain' | 'cover';

export function getSize(sizes: PhotoSize[], width?: number, height?: number, fit?: PhotoFitMode): PhotoSizeWithLocation | null {
  let diff: number | undefined;
  let closest: PhotoSizeWithLocation | undefined;

  for (let i = 0; i < sizes.length; i += 1) {
    const size = sizes[i];

    if (size._ === 'photoSize') {
      const isLandscape = size.w > size.h;

      let max = isLandscape ? width : height;
      if (fit === 'cover') max = isLandscape ? height : width;
      if (!max) max = 320; // default;

      if (!diff) {
        diff = Math.abs(max - (isLandscape ? size.w : size.h));
        closest = size;
        continue;
      }

      const nextDiff = Math.abs(max - (isLandscape ? size.w : size.h));

      if (nextDiff < diff) {
        diff = nextDiff;
        closest = size;
      }
    }
  }

  return closest || null;
}

export function getSizeType(sizes: PhotoSize[], width?: number, height?: number, fit?: PhotoFitMode): string {
  const size = getSize(sizes, width, height, fit);
  return size ? size.type : 'm';
}

export function getDefaultSizeType(photo: PhotoNotEmpty): string {
  for (let i = photo.sizes.length - 1; i >= 0; i -= 1) {
    const size = photo.sizes[i];
    if (size._ === 'photoSize') {
      return size.type;
    }
  }

  return 'm';
}

export function checkDimensions(sizes: PhotoSize[], dw: number, dh: number): boolean {
  for (let i = 0; i < sizes.length; i += 1) {
    const size = sizes[i];

    if (size._ === 'photoSize' && (size.w / size.h < dw || size.h / size.w < dh)) {
      return true;
    }
  }

  return false;
}

export function getPhotoLocation(photo: PhotoNotEmpty | Document, type?: string): InputFileLocation {
  return {
    _: photo._ === 'photo' ? 'inputPhotoFileLocation' : 'inputDocumentFileLocation',
    id: photo.id,
    access_hash: photo.access_hash,
    file_reference: photo.file_reference,
    thumb_size: type || 'm', // getDefaultSizsType(photo),
  };
}

export function getDocumentLocation(document: Document): InputFileLocation {
  return {
    _: 'inputDocumentFileLocation',
    id: document.id,
    access_hash: document.access_hash,
    file_reference: document.file_reference,
    thumb_size: '',
  };
}

export function getPeerPhotoInputLocation(peer: Peer, message?: Message): InputFileLocation | null {
  const location = getPeerPhotoLocation(peer);

  if (!location) return null;
  const { volume_id, local_id } = location;

  return {
    _: 'inputPeerPhotoFileLocation',
    peer: peerToInputPeer(peer, message && message._ !== 'messageEmpty' ? { peer: peerToInputPeer(message.to_id), message } : undefined),
    volume_id,
    local_id,
  };
}
