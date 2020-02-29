import { Document } from 'cache/types';
import { play, pause, close } from 'components/icons';
import download from 'components/icons/download_button/download_button.svg?raw';
import { svgCodeToComponent } from 'core/factory';
import { MediaPlaybackStatus } from 'services/media';
import { media as mediaService } from 'services';
import { useInterface } from 'core/hooks';
import { div } from 'core/html';
import { unmount } from 'core/dom';
import './play_button.scss';

export default function playButton(doc: Document.document) {
  const downloadButtonSvg = svgCodeToComponent(download, doc.file_reference)({ class: 'download' });
  const playButtonSvg = play({ class: 'play hidden' });
  const pauseButtonSvg = pause({ class: 'pause hidden' });
  const cancelButtonSvg = close({ class: 'cancel hidden' });

  let currStatus: MediaPlaybackStatus = MediaPlaybackStatus.NotStarted;
  let currProgress = 0;
  const container = div`.playButton`({
    onClick: () => {
      if (currStatus === MediaPlaybackStatus.NotStarted || currStatus === MediaPlaybackStatus.Stopped) {
        mediaService.playAudio(doc);
      } else {
        mediaService.stopAudio(doc);
      }
    },
  }, div`.buttons`(cancelButtonSvg, downloadButtonSvg, playButtonSvg, pauseButtonSvg));

  return useInterface(container, {
    setStatus: (status: MediaPlaybackStatus) => {
      if (currStatus !== status) {
        currStatus = status;
        downloadButtonSvg.classList.toggle('hidden', status !== MediaPlaybackStatus.Downloading);
        cancelButtonSvg.classList.toggle('hidden', status !== MediaPlaybackStatus.Downloading);
        playButtonSvg.classList.toggle('hidden', status !== MediaPlaybackStatus.Stopped);
        pauseButtonSvg.classList.toggle('hidden', status !== MediaPlaybackStatus.Playing);
        if (status !== MediaPlaybackStatus.Downloading && status !== MediaPlaybackStatus.NotStarted) {
          setTimeout(() => unmount(downloadButtonSvg), 1000);
        }
      }
    },
    setProgress: (progress: number) => {
      if (currProgress !== progress) {
        const animation = downloadButtonSvg.getElementById(`animation_${doc.file_reference}`) as SVGAnimationElement;
        animation.setAttribute('from', `${Math.max(2, currProgress * 2 * Math.PI * 19)} 1000`);
        animation.setAttribute('to', `${Math.max(2, progress * 2 * Math.PI * 19)} 1000`);
        if ((animation as any).beginElement) (animation as any).beginElement();
        currProgress = progress;
      }
    },
  });
}
