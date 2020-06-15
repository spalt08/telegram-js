
import { div } from 'core/html';
import { media } from 'services';
import { getAttributeVideo } from 'helpers/files';
import { VirtualizedList } from 'components/ui';
import videoRenderer from './video';
import './gif_panel.scss';

// to do: refactor types
function renderGifForPanel(id: string) {
  const doc = media.savedGifsMap.get(id)!;
  const videoAttr = getAttributeVideo(doc)!;
  const { w, h } = videoAttr;
  const element = videoRenderer(doc, { className: 'gif-panel__item' }) as HTMLElement;
  element.style.width = `${(w / h) * 100}px`;

  return element;
}

export default function gifsPanel() {
  // gfs panel created only once, so it is legal
  media.loadSavedGis();

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
