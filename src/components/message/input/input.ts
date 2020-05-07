import { div } from 'core/html';
import { listen } from 'core/dom';
import * as icons from 'components/icons';
import { media, message } from 'services';
import { getInterface, useListenWhileMounted } from 'core/hooks';
import { Document } from 'mtproto-js';
import { bubble, contextMenu } from 'components/ui';
import { documentToInputMedia } from 'helpers/message';
import stickMojiPanel from './input_stickmoji';
import messageTextarea from './input_textarea';
import './input.scss';
import recordSendButton from './button';

export default function messageInput() {
  const btn = recordSendButton({
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onMessage: () => message.sendMessage(textarea.value),
    onAudio: () => console.log('audio no implemented'),
  });

  const btnI = getInterface(btn);

  const textarea = messageTextarea({
    onSend: message.sendMessage,
    onChange: (value) => value ? btnI.message() : btnI.audio(),
    maxHeight: 400,
  });

  const emojiIcon = div`.msginput__emoji`(icons.smile());

  const stickmojiPanelEl = stickMojiPanel({
    onSelectEmoji: (emoji: string) => getInterface(textarea).insertText(emoji),
    onSelectSticker: (sticker: Document.document) => message.sendMediaMessage(documentToInputMedia(sticker)),
  });

  // Upload with Click
  const onFile = (event: Event) => {
    if (event && event.target && event.target instanceof HTMLInputElement && event.target.files && event.target.files.length > 0) {
      media.attachFiles(event.target.files);
    }
  };

  const attachmentMenu = contextMenu({
    className: 'msginput__attachments-menu',
    options: [
      { icon: icons.photo, label: 'Photo or Video', onFile },
      { icon: icons.document, label: 'Document', onFile },
      { icon: icons.document, label: 'Poll', onClick: () => {} },
    ],
  });

  const attachIcon = div`.msginput__attach`(
    {
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        getInterface(attachmentMenu).toggle();
      },
    },
    icons.attach(),
  );

  const container = div`.msginput`(
    div`.msginput__container`(
      stickmojiPanelEl,
      bubble({ className: 'msginput__bubble -first -last' },
        div`.msginput__bubble-content`(
          emojiIcon,
          textarea,
          attachIcon,
        ),
      ),
      btn,
      attachmentMenu,
    ),
  );

  // Sticker & Emoji Panel Handling
  let closeTimer: number | undefined;
  const closeDelay = 300;

  const openPanel = () => {
    if (closeTimer) clearTimeout(closeTimer);
    stickmojiPanelEl.classList.add('opened');
    emojiIcon.classList.add('active');
    getInterface(attachmentMenu).close();
  };

  const closePanel = () => {
    stickmojiPanelEl.classList.remove('opened');
    emojiIcon.classList.remove('active');
  };

  const closePanelDelayed = () => {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(closePanel as TimerHandler, closeDelay);
  };

  listen(emojiIcon, 'mouseenter', openPanel);
  listen(emojiIcon, 'mouseleave', closePanelDelayed);
  listen(stickmojiPanelEl, 'mouseenter', openPanel);
  listen(stickmojiPanelEl, 'mouseleave', closePanelDelayed);

  // Upload with Drag'n'Drop
  useListenWhileMounted(container, document, 'dragenter', (event: Event) => event.preventDefault());
  useListenWhileMounted(container, document, 'dragleave', (event: Event) => event.preventDefault());
  useListenWhileMounted(container, document, 'dragover', (event: Event) => event.preventDefault());
  useListenWhileMounted(container, document, 'drop', (event: DragEvent) => {
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      media.attachFiles(event.dataTransfer.files);
    }

    event.preventDefault();
  });

  return container;
}
