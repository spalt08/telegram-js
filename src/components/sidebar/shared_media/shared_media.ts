import * as icons from 'components/icons';
import { heading, tabsPanel } from 'components/ui';
import { div, nothing } from 'core/html';
import { Peer } from 'mtproto-js';
import docsPanel from '../panels/documents';
import linksPanel from '../panels/links';
import mediaPanel from '../panels/media';
import './shared_media.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function sharedMedia({ onBack }: SidebarComponentProps, peer: Peer) {
  const container = div`.sharedMediaSidebar`(
    heading({
      title: 'Shared Media',
      buttons: [
        { icon: icons.back, position: 'left', onClick: () => onBack && onBack() },
      ],
    }),
    peer ? tabsPanel({ className: 'sharedMediaSidebar__panels', headerAlign: 'space-between' }, {
      Media: mediaPanel(peer),
      Docs: docsPanel(peer),
      Links: linksPanel(peer),
    }) : nothing,
  );

  return container;
}
