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

export default function playButton(doc: Document.document) {
  const downloadButtonSvg = svgCodeToComponent(download, doc.id)({ class: 'download' });
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
        const button = downloadButtonSvg.getElementById(`button_${doc.id}`) as SVGGElement;
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
      const animation = downloadButtonSvg.getElementById(`animation_${doc.id}`) as SVGAnimationElement;
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
