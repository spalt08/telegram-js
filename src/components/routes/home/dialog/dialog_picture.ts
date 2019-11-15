import { div, img } from 'core/html';
import { Peer } from 'cache/types';
import client from 'client/client';
import { hex } from 'mtproto-js';
import { unmountChildren, mount } from 'core/dom';
import { peerToInputPeer } from 'cache/accessors';
import { userCache, chatCache } from 'cache';

const mimeTypes = {
  'storage.fileJpeg': 'image/jpeg',
} as Record<string, string>;

const resolve = (peerRef: Peer) => {
  const peer = peerToInputPeer(peerRef);

  switch (peerRef._) {
    case 'peerUser': {
      const user = userCache.get(peerRef.user_id);
      if (user.photo && user.photo._ === 'userProfilePhoto') {
        const { volume_id, local_id } = user.photo.photo_small;
        if (local_id) return { _: 'inputPeerPhotoFileLocation', peer, volume_id, local_id };
      }
      return null;
    }

    case 'peerChat': {
      const chat = chatCache.get(peerRef.chat_id);
      if (chat.photo && chat.photo._ === 'chatPhoto') {
        const { volume_id, local_id } = chat.photo.photo_small;
        return { _: 'inputPeerPhotoFileLocation', peer, volume_id, local_id };
      }
      return null;
    }

    case 'peerChannel': {
      const channel = chatCache.get(peerRef.channel_id);
      if (channel.photo && channel.photo._ === 'chatPhoto') {
        const { volume_id, local_id } = channel.photo.photo_small;
        return { _: 'inputPeerPhotoFileLocation', peer, volume_id, local_id };
      }
      return null;
    }

    default:
      return null;
  }
};

function fetch(fileLocation: Object, cb: (url: string) => void, dc: number = client.cfg.dc) {
  const payload = {
    location: fileLocation,
    offset: 0,
    limit: 1024 * 1024,
  };

  console.log(fileLocation);

  client.call('upload.getFile', payload, { dc }, (err, result) => {
    if (err && err.message && err.message.indexOf('FILE_MIGRATE_') > -1) {
      fetch(fileLocation, cb, +err.message.slice(-1));
    }

    if (!err && result) {
      const data = result.json();
      const mime = mimeTypes[data.type._];
      const bytes = hex(data.bytes).buffer;

      const blob = new Blob([bytes], { type: mime });
      cb((window.URL || window.webkitURL).createObjectURL(blob));
    } else cb('');
  });
}

export default function dialogPicture(peer: Peer) {
  const fileLocation = resolve(peer);
  const container = div`.dialog__picture`(div`.dialog__picempty`());

  if (fileLocation) {
    fetch(fileLocation, (url) => {
      unmountChildren(container);
      mount(container, img({ src: url }));
    });
  }

  return container;
}
