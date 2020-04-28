/* eslint-disable no-param-reassign */
import { InputFileLocation } from 'mtproto-js';
import MP4Box from 'mp4box';
import { DownloadOptions } from 'client/types';
import { Atom, SMALLEST_CHUNK_LIMIT, alignOffset, lookupAtoms, alignLimit } from 'helpers/stream';

interface FilePartResolver {
  (location: InputFileLocation, offset: number, limit: number, options: DownloadOptions, ready: (data: ArrayBuffer) => void): void,
}

interface Notification {
  (name: 'stream_initialize', payload: { id: string, info: any, segments: any[] }): void
  (name: 'stream_segment', payload: { id: string, segment: any }): void
}

const streaming: Record<string, {
  active: boolean,
  location: InputFileLocation,
  options: DownloadOptions,
  atoms: Atom[],
  mp4box: any,
}> = {};

function atomParsingLoop(id: string, getPart: FilePartResolver, onFinish: (next: number) => void, offset = 0, limit = SMALLEST_CHUNK_LIMIT) {
  if (!streaming[id]) return;

  const { location, options, mp4box, atoms } = streaming[id];
  const alignedOffset = alignOffset(offset, limit);

  console.log('align', offset, alignedOffset, limit);

  getPart(location, alignedOffset, limit, options, (data: ArrayBuffer) => {
    const lastAtom = lookupAtoms(new Uint8Array(data), atoms, alignedOffset);

    let next = 0;

    // increase limit to load whole atom
    if (lastAtom && lastAtom.type === 'moov' && limit === SMALLEST_CHUNK_LIMIT) {
      limit = alignLimit(lastAtom.length + 8);
      next = offset;
      if (limit > 1024 * 512) limit = 1024 * 512;
    } else {
      (data as any).fileStart = alignedOffset;
      next = mp4box.appendBuffer(data);

      if (next === offset) return;

      if (options.size! - next < 8 && mp4box.readySent === false) {
        (data as any).fileStart = next;
        next = mp4box.appendBuffer(new Uint8Array(4));

        onFinish(next);
        return;
      }

      if (mp4box.readySent) {
        onFinish(next);
        return;
      }
    }

    atomParsingLoop(id, getPart, onFinish, next, limit);
  });
}

function segmentDownloadingLoop(id: string, getPart: FilePartResolver, offset = 0) {
  if (!streaming[id] || !streaming[id].active) return;

  const { location, options, mp4box } = streaming[id];
  const limit = 1024 * 512;
  const alignedOffset = alignOffset(offset, limit);

  console.log('stream get', alignedOffset, limit);

  getPart(location, alignedOffset, limit, options, (data: ArrayBuffer) => {
    (data as any).fileStart = alignedOffset;
    const next = mp4box.appendBuffer(data);

    if (next && next < options.size!) {
      segmentDownloadingLoop(id, getPart, next);
    } else {
      streaming[id].active = false;
      mp4box.flush();
    }
  });
}

/**
 * Stream file
 */
export function streamVideoFile(id: string, location: InputFileLocation, options: DownloadOptions, getPart: FilePartResolver, notify: Notification) {
  const mp4box = MP4Box.createFile();

  streaming[id] = {
    active: false,
    location,
    options,
    atoms: [],
    mp4box,
  };

  mp4box.onReady = (info: any) => {
    for (let i = 0; i < info.tracks.length; i++) {
      const { movie_duration, movie_timescale, nb_samples } = info.tracks[i];
      const durationSeconds = movie_duration / movie_timescale;
      const nbSamples = Math.ceil((nb_samples / durationSeconds));

      mp4box.setSegmentOptions(info.tracks[i].id, null, { nbSamples });
    }
    const segments = mp4box.initializeSegmentation();
    mp4box.start();

    notify('stream_initialize', { id, info, segments });
  };

  mp4box.onError = (e: any) => {
    console.warn(e);
  };

  mp4box.onSegment = (sid: any, user: any, buffer: any) => {
    notify('stream_segment', { id, segment: { id: sid, user, buffer } });
  };

  atomParsingLoop(id, getPart, (offset) => {
    streaming[id].active = true;
    segmentDownloadingLoop(id, getPart, offset);
  });
}

export function seekVideoStream(id: string, time: number) {
  if (!streaming[id]) return;
  streaming[id].mp4box.seek(time);
}

export function revokeVideoStreak(id: string) {
  streaming[id].active = false;
  streaming[id].mp4box = MP4Box.createFile();
}
