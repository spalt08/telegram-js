import { UserProfilePhoto, FileLocation, InputPeer, ChatPhoto, Photo, PhotoSize } from 'mtproto-js';
import { SERVICE_WORKER_SCOPE } from 'const';
import { locationToURL } from 'helpers/files';
import { fileMap } from './files';

let photoIdCounter = 160;
let localIdCounter = 1;

export function mockPeerPhoto(peer: InputPeer.inputPeerChat): ChatPhoto;
export function mockPeerPhoto(peer: InputPeer.inputPeerUser): UserProfilePhoto;
export function mockPeerPhoto(peer: InputPeer): any {
  const location: FileLocation = {
    _: 'fileLocationToBeDeprecated',
    local_id: localIdCounter++,
    volume_id: 'uservolume',
  };

  const url = locationToURL({
    _: 'inputPeerPhotoFileLocation',
    peer,
    volume_id: location.volume_id,
    local_id: location.local_id,
  });

  const photo_id = photoIdCounter++;
  fileMap[url] = `https://picsum.photos/id/${photo_id}/200/200`;

  switch (peer._) {
    case 'inputPeerChat':
      return {
        _: 'chatPhoto',
        photo_big: location,
        photo_small: location,
        dc_id: 2,
      };
    default:
      return {
        _: 'userProfilePhoto',
        photo_id: photo_id.toString(16),
        photo_big: location,
        photo_small: location,
        dc_id: 2,
      };
  }
}

export function mockUserPhoto(user_id: number): UserProfilePhoto {
  return mockPeerPhoto({ _: 'inputPeerUser', user_id, access_hash: `userhash${user_id}` });
}

export function mockChatPhoto(chat_id: number): ChatPhoto {
  return mockPeerPhoto({ _: 'inputPeerChat', chat_id });
}

export function mockPhotoSize(id: number, w: number, h: number, ready: (photo: PhotoSize.photoSize) => void) {
  fetch(`https://picsum.photos/id/${id}/${w}/${h}`)
    .then((response) => response.arrayBuffer())
    .then((ab) => {
      ready({
        _: 'photoSize',
        type: 'x',
        location: {
          _: 'fileLocationToBeDeprecated',
          volume_id: 'photovolume',
          local_id: localIdCounter++,
        },
        w,
        h,
        size: ab.byteLength,
      });
    });
}

export function mockCachedSize(id: number, w: number, h: number, ready: (photo: PhotoSize.photoCachedSize) => void) {
  let cw = 50;
  let ch = Math.floor((h / w) * cw);
  if (h > w) {
    ch = 50;
    cw = Math.floor((w / h) * ch);
  }

  fetch(`https://picsum.photos/id/${id}/${cw}/${ch}`)
    .then((response) => response.arrayBuffer())
    .then((bytes) => {
      ready({
        _: 'photoCachedSize',
        type: 'm',
        location: {
          _: 'fileLocationToBeDeprecated',
          volume_id: 'photovolume',
          local_id: localIdCounter,
        },
        w,
        h,
        bytes,
      });
    });
}

export function mockPhoto(w: number, h: number, ready: (photo: Photo.photo, url: string) => void) {
  const id = photoIdCounter++;
  const sizes: PhotoSize[] = [];

  const resolve = (size: PhotoSize) => {
    sizes.push(size);
    if (sizes.length >= 2) {
      const photo: Photo.photo = {
        _: 'photo',
        has_stickers: false,
        id: id.toString(16),
        access_hash: `photohash${id}`,
        file_reference: new Uint8Array([0, 0, 0, 0]).buffer,
        date: 1581671138,
        sizes,
        dc_id: 2,
      };

      const url = `${SERVICE_WORKER_SCOPE}photos/${photo.id}_x`;
      fileMap[url] = `https://picsum.photos/id/${id}/${w}/${h}`;

      ready(photo, `https://picsum.photos/id/${id}/${w}/${h}`);
    }
  };

  mockPhotoSize(id, w, h, resolve);
  mockCachedSize(id, w, h, resolve);
}
