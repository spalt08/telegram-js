import { Document } from 'cache/types';
import { div, text } from 'core/html';
import './audio.scss';
import { getAttributeAudio, getReadableDuration } from 'helpers/files';
import { play, pause, close } from 'components/icons';
import { waveform } from 'components/ui';
import { getInterface, useObservable, useInterface } from 'core/hooks';
import { media as mediaService } from 'services';
import download from 'components/icons/download_button/download_button.svg?raw';
import { svgCodeToComponent } from 'core/factory';
import { unmount } from 'core/dom';
import { AudioPlaybackState, AudioPlaybackStatus } from 'services/media';

function playButton(doc: Document.document) {
  const downloadButtonSvg = svgCodeToComponent(download, doc.file_reference)({ class: 'download' });
  const playButtonSvg = play({ class: 'play hidden' });
  const pauseButtonSvg = pause({ class: 'pause hidden' });
  const cancelButtonSvg = close({ class: 'cancel hidden' });

  let currStatus: AudioPlaybackStatus = AudioPlaybackStatus.NotStarted;
  let currProgress = 0;
  const container = div`.document-audio__play-pause`({
    onClick: () => {
      if (currStatus === AudioPlaybackStatus.NotStarted || currStatus === AudioPlaybackStatus.Stopped) {
        mediaService.playAudio(doc);
      } else {
        mediaService.stopAudio(doc);
      }
    },
  }, div`.buttons`(cancelButtonSvg, downloadButtonSvg, playButtonSvg, pauseButtonSvg));

  return useInterface(container, {
    setStatus: (state: AudioPlaybackStatus) => {
      if (currStatus !== state) {
        currStatus = state;
        downloadButtonSvg.classList.toggle('hidden', state !== AudioPlaybackStatus.Downloading);
        cancelButtonSvg.classList.toggle('hidden', state !== AudioPlaybackStatus.Downloading);
        playButtonSvg.classList.toggle('hidden', state !== AudioPlaybackStatus.Stopped);
        pauseButtonSvg.classList.toggle('hidden', state !== AudioPlaybackStatus.Playing);
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
      if (progress >= 1) {
        setTimeout(() => unmount(downloadButtonSvg), 1000);
      }
    },
  });
}

export default function audio(doc: Document.document, out: boolean) {
  const button = playButton(doc);
  const audioAttribute = getAttributeAudio(doc)!;
  const duration = getReadableDuration(audioAttribute.duration);
  const timing = text(duration);
  const wf = waveform(audioAttribute.waveform!, 192, 23, out ? '#4fae4e' : '#50a2e9', out ? '#aedfa4' : '#cbcbcb');
  const container = div`.document-audio`(
    button,
    div`.document-audio__wave`(
      wf,
      div`.document-audio__timing`(timing),
    ));


  useObservable(container, mediaService.audioInfo(doc), (info) => {
    getInterface(wf).updateProgress(info.playProgress);
    getInterface(button).setStatus(info.status);
    getInterface(button).setProgress(info.downloadProgress);
    const progress = info.status === AudioPlaybackStatus.Playing ? info.playProgress * audioAttribute.duration : audioAttribute.duration;
    if (info.status === AudioPlaybackStatus.Playing) {
      timing.textContent = `${getReadableDuration(progress)} / ${getReadableDuration(audioAttribute.duration)}`;
    } else {
      timing.textContent = getReadableDuration(audioAttribute.duration);
    }
  });

  return container;
}
