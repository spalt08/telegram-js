import { div, nothing } from 'core/html';
import { heading, tabsPanel } from 'components/ui';
import * as icons from 'components/icons';
import { message } from 'services';
import mediaPanel from '../panels/media';
import docsPanel from '../panels/documents';
import linksPanel from '../panels/links';
import './shared_media.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function sharedMedia({ onBack }: SidebarComponentProps) {
  const peer = message.activePeer.value;
  return div`.sharedMediaSidebar`(
    heading({
      title: 'Shared Media',
      buttons: [
        { icon: icons.back, position: 'left', onClick: () => onBack && onBack() },
      ],
    }),
    peer ? tabsPanel({ className: 'sharedMediaSidebar__panels', headerAlign: 'space-between' }, [
      { key: 'media', title: 'Media', content: () => mediaPanel(peer) },
      { key: 'docs', title: 'Docs', content: () => docsPanel(peer) },
      { key: 'links', title: 'Links', content: () => linksPanel(peer) },
    ]) : nothing,
  );
}
