import { Peer } from 'cache/types';
import { div } from 'core/html';
import { tabsPanel } from 'components/ui';
import mediaPanel from './media_panel';
import docsPanel from './docs_panel';
import './shared_media.scss';

export default function sharedMediaPanel(peer: Peer) {
  return tabsPanel({ className: 'shared-media' }, {
    Media: mediaPanel(peer),
    Docs: docsPanel(peer),
    Links: div(),
  });
}
