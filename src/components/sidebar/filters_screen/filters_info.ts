import { div, text } from 'core/html';
import * as icons from 'components/icons';
import { tgs, ripple } from 'components/ui';
import foldersSticker from 'assets/folders1.tgs';
import { getInterface, useOnMount } from 'core/hooks';
import './filters_info.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

export default function filtersInfo(onNavigate: SidebarComponentProps['onNavigate']) {
  const image = tgs({
    className: 'filtersInfo__image -hidden',
    src: foldersSticker,
    loop: false,

    // When the sticker is loaded during the screen appear animation, a freeze happens.
    // The play start is delayed to avoid the animation freeze.
    autoplay: false,
  });

  let unwatchMount: (() => void) | undefined = useOnMount(image, () => {
    setTimeout(() => {
      getInterface(image).play();
      image.classList.remove('-hidden');
    }, 400);
    if (unwatchMount) {
      unwatchMount();
      unwatchMount = undefined;
    }
  });

  const handleAddClick = () => onNavigate?.('filterForm', undefined);

  return (
    div`.filtersInfo`(
      image,
      div`.filtersInfo__text`(
        text('Create folders for different groups of chats and quickly switch between them.'),
      ),
      ripple({ tag: 'button', className: 'filtersInfo__add', contentClass: 'filtersInfo__add_content', onClick: handleAddClick }, [
        icons.add({ class: 'filtersInfo__add_icon' }),
        text('Create Folder'),
      ]),
    )
  );
}
