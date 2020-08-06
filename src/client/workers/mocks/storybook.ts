import { BehaviorSubject } from 'rxjs';
import { Photo } from 'mtproto-js';
import { task } from 'client/context';
import { getPhotoLocation } from 'helpers/photo';
import { locationToURL } from 'helpers/files';
import { mockPhoto } from './photo';
import { mockMessage } from './message';
import { users, me } from './user';
import { jobsSticker } from './sticker';

/**
 * Photo Mocks
 */
export const MockedPhotos = {
  Square: {
    subject: new BehaviorSubject<Photo.photo | null>(null),
    w: 320,
    h: 320,
  },
  Landscape: {
    subject: new BehaviorSubject<Photo.photo | null>(null),
    w: 320,
    h: 200,
  },
  Portrait: {
    subject: new BehaviorSubject<Photo.photo | null>(null),
    w: 200,
    h: 320,
  },
} as Record<string, { subject: BehaviorSubject<Photo.photo | null>, w: number, h: number }>;

const mockedPhotosKeys = Object.keys(MockedPhotos);

for (let i = 0; i < mockedPhotosKeys.length; i++) {
  const key = mockedPhotosKeys[i];
  const req = MockedPhotos[key];

  mockPhoto(req.w * window.devicePixelRatio, req.h * window.devicePixelRatio, (photo, map) => {
    req.subject.next(photo);

    const location = getPhotoLocation(photo, 'x');
    const url = locationToURL(location);

    task('url_map', { url, map });
  });
}

/**
 * Message Mocks
 */
export const MessageRegular = mockMessage({
  from_id: users[1].id,
  to_id: { _: 'peerUser', user_id: me.id },
});

export const MessagePoll = mockMessage({
  from_id: users[1].id,
  to_id: { _: 'peerUser', user_id: me.id },
  media: {
    _: 'messageMediaPoll',
    poll: {
      _: 'poll' as const,
      id: '1',
      question: 'Question',
      answers: [
        {
          _: 'pollAnswer',
          text: 'Option 1',
          option: new ArrayBuffer(1),
        },
        {
          _: 'pollAnswer',
          text: 'Option 2',
          option: new ArrayBuffer(1),
        },
      ],

    },
    results: {
      _: 'pollResults',
    },
  },
});

export const MessageSticker = mockMessage({
  from_id: users[1].id,
  to_id: { _: 'peerUser', user_id: me.id },
  media: {
    _: 'messageMediaDocument',
    document: jobsSticker,
  },
});
