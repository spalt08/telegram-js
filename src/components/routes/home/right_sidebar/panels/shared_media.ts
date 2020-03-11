import { Peer } from 'client/schema';
import { tabsPanel } from 'components/ui';
import mediaPanel from './media_panel';
import docsPanel from './docs_panel';
import linksPanel from './links_panel';
import './shared_media.scss';

export default function sharedMediaPanel(peer: Peer) {
  return tabsPanel({ className: 'shared-media' }, {
    Media: mediaPanel(peer),
    Docs: docsPanel(peer),
    Links: linksPanel(peer),
  });
}
