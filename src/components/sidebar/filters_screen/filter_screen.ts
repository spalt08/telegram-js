import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { DialogFilter } from 'mtproto-js';
import { div, text } from 'core/html';
import { contextMenu, heading } from 'components/ui';
import * as icons from 'components/icons';
import { getInterface, useObservable } from 'core/hooks';
import { mount, unmount } from 'core/dom';
import { folder as folderService } from 'services';
import './filter_screen.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

const emptyFilter: DialogFilter = {
  _: 'dialogFilter',
  contacts: false,
  non_contacts: false,
  groups: false,
  broadcasts: false,
  bots: false,
  exclude_muted: false,
  exclude_read: false,
  exclude_archived: false,
  id: 0,
  title: '',
  pinned_peers: [],
  include_peers: [],
  exclude_peers: [],
};

function makeHeader(isCreating: boolean, onBack?: () => void, onDelete?: () => void) {
  if (isCreating) {
    return heading({
      title: isCreating ? 'New Folder' : 'Edit Folder',
      buttons: [{ icon: icons.back, position: 'left', onClick: () => onBack?.() }],
      className: 'filterScreen__head',
    });
  }

  let header: HTMLElement;

  const moreContextMenu = contextMenu({
    className: 'filterScreen__head_context-menu',
    options: [
      { icon: icons.del, type: 'danger', label: 'Delete Folder', onClick: () => onDelete?.() },
    ],
  });

  const toggleContextMenu = (event: MouseEvent) => {
    if (moreContextMenu.parentElement) getInterface(moreContextMenu).close();
    else mount(header, moreContextMenu);

    event.stopPropagation();
  };

  header = heading({
    title: isCreating ? 'New Folder' : 'Edit Folder',
    buttons: [
      { icon: icons.back, position: 'left', onClick: () => onBack?.() },
      { icon: icons.more, position: 'right', onClick: toggleContextMenu },
    ],
    className: 'filterScreen__head',
  });

  return header;
}

export default function filterScreen(
  { onBack }: SidebarComponentProps,
  filterSubject: BehaviorSubject<Readonly<DialogFilter> | undefined>,
) {
  let header: HTMLElement | undefined;
  const deleteFilter = () => {
    if (filterSubject.value) {
      folderService.removeFilter(filterSubject.value.id);
      // eslint-disable-next-line no-unused-expressions
      onBack?.();
    }
  };

  let filterId = undefined;
  let editingFilter: DialogFilter = emptyFilter;

  const content = (
    div`.filterScreen`(
      div`.filterScreen__body`(
        text(filterSubject.pipe(map((filter) => filter ? filter.title : 'No filter'))),
      ),
    )
  );

  useObservable(content, filterSubject.pipe(map((filter) => !!filter), distinctUntilChanged()), true, (isEditing) => {
    if (header) {
      unmount(header);
    }
    header = makeHeader(!isEditing, onBack, deleteFilter);
    mount(content, header, content.firstChild ?? undefined);
  });

  return content;
}
