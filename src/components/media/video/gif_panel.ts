
import { div } from 'core/html';
import { media, message } from 'services';
import { getAttributeVideo } from 'helpers/files';
import { VirtualizedList } from 'components/ui';
import { documentToInputMedia } from 'helpers/message';
import './gif_panel.scss';
import gifPreview from './gif';

// to do: refactor types
function renderGifForPanel(id: string) {
  const doc = media.savedGifsMap.get(id)!;
  const videoAttr = getAttributeVideo(doc)!;
  const { w, h } = videoAttr;
  const element = gifPreview(doc, { className: 'gif-panel__item' }, undefined, (gif) => {
    message.sendMediaMessage(documentToInputMedia(gif));
  });
  element.style.width = `${(w / h) * 100}px`;

  return element;
}

export default function gifsPanel() {
  // gfs panel created only once, so it is legal
  media.loadSavedGifs();

  const scroll = new VirtualizedList({
    items: media.savedGifsIds,
    renderer: renderGifForPanel,
    batch: 10,
    batchService: 15,
    threshold: 1,
    topReached: true,
    className: 'gif-panel__scroll',
  });

  return div`.gif-panel`(scroll.container);
}
