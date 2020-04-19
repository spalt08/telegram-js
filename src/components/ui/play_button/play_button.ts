import { Document } from 'mtproto-js';
import { play, pause, close } from 'components/icons';
import { svgCodeToComponent } from 'core/factory';
import { MediaPlaybackStatus } from 'services/media';
import { media as mediaService } from 'services';
import { useObservable, useInterface } from 'core/hooks';
import { div } from 'core/html';
import { unmount } from 'core/dom';
import download from './download_button.svg?raw';
import './play_button.scss';

const buttonSvg = svgCodeToComponent(download);

function replaceId(source: string, id: string) {
  return source.replace('$id$', id);
}

function buttonSvgWithId(id: string, props?: Record<string, any>) {
  const svg = buttonSvg(props);
  svg.querySelectorAll('[id^="$id$"]').forEach((element) => element.id = replaceId(element.id, id)); // eslint-disable-line no-param-reassign
  svg.querySelectorAll('[begin^="$id$"]').forEach((element) => element.setAttribute('begin', replaceId(element.getAttribute('begin')!, id)));
  return svg;
}

export default function playButton(doc: Document.document) {
  const downloadButtonSvg = buttonSvgWithId(doc.id, { class: 'download' });
  const playButtonSvg = play({ class: 'play hidden' });
  const pauseButtonSvg = pause({ class: 'pause hidden' });
  const cancelButtonSvg = close({ class: 'cancel hidden' });

  let currStatus: MediaPlaybackStatus = MediaPlaybackStatus.NotStarted;
  let currProgress = -1;
  const container = div`.playButton`({
    onClick: () => {
      if (currStatus === MediaPlaybackStatus.NotStarted || currStatus === MediaPlaybackStatus.Stopped) {
        mediaService.resumeAudio(doc);
      } else {
        mediaService.pauseAudio(doc);
      }
    },
  }, div`.playButton__inner`(cancelButtonSvg, downloadButtonSvg, playButtonSvg, pauseButtonSvg),
  );

  const setStatus = (status: MediaPlaybackStatus) => {
    if (currStatus !== status) {
      currStatus = status;
      if (status === MediaPlaybackStatus.Downloading) {
        const button = downloadButtonSvg.getElementById(`${doc.id}_button`) as SVGGElement;
        button.dispatchEvent(new Event('click'));
      }

      downloadButtonSvg.classList.toggle('hidden', status !== MediaPlaybackStatus.Downloading);
      cancelButtonSvg.classList.toggle('hidden', status !== MediaPlaybackStatus.Downloading);
      playButtonSvg.classList.toggle('hidden', status !== MediaPlaybackStatus.Stopped);
      pauseButtonSvg.classList.toggle('hidden', status !== MediaPlaybackStatus.Playing);
      if (status !== MediaPlaybackStatus.Downloading && status !== MediaPlaybackStatus.NotStarted) {
        setTimeout(() => unmount(downloadButtonSvg), 1000);
      }
    }
  };

  const setProgress = (progress: number) => {
    if (currProgress !== progress) {
      const animation = downloadButtonSvg.getElementById(`${doc.id}_animation`) as SVGAnimationElement;
      animation.setAttribute('from', `${Math.max(2, currProgress * 2 * Math.PI * 19)} 1000`);
      animation.setAttribute('to', `${Math.max(2, progress * 2 * Math.PI * 19)} 1000`);
      if ((animation as any).beginElement) (animation as any).beginElement();
      currProgress = progress;
    }
  };

  useObservable(container, mediaService.audioInfo(doc), (info) => {
    setStatus(info.status);
    setProgress(info.downloadProgress);
  });


  return useInterface(container, {
    download: () => {
      mediaService.downloadAudio(doc);
    },
  });
}
