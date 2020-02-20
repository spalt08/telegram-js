import { div, input, button } from 'core/html';
import { mount, listen } from 'core/dom';
import { smile, attach, send } from 'components/icons';
import { message, media } from 'services';
import { getInterface, useListenWhileMounted, useObservable } from 'core/hooks';
import { chatCache } from 'cache';
import { Document } from 'cache/types';
import stickMojiPanel from './input_stickmoji';
import messageTextarea from './input_textarea';
import './input.scss';

export default function messageInput() {
  const element = div`.msginput.hidden`();
  const textarea = messageTextarea({ onSend: message.sendMessage, maxHeight: 400 });
  const emojiIcon = div`.msginput__emoji`(smile());
  const file = input({ className: 'msginput__attach-input', type: 'file', multiple: true });
  const attachIcon = div`.msginput__attach`(attach(), file);
  const stickmojiPanelEl = stickMojiPanel({
    onSelectEmoji: (emoji: string) => {
      getInterface(textarea).insertText(emoji);
    },
    onSelectSticker: (sticker: Document.document) => {
      message.sendMediaMessage({
        _: 'inputMediaDocument',
        id: {
          _: 'inputDocument',
          id: sticker.id,
          access_hash: sticker.access_hash,
          file_reference: sticker.file_reference,
        },
      });
    },
  });

  const container = div`.msginput__container`(
    div`.msginput__bubble_wrap`(
      stickmojiPanelEl,
      div`.msginput__bubble`(
        emojiIcon,
        textarea,
        attachIcon,
      ),
    ),
    button`.msginput__btn`(
      {
        onClick: () => {
          getInterface(textarea).send();
        },
      },
      send(),
    ),
  );

  let closeTimer: number | undefined;
  const closeDelay = 300;

  const openPanel = () => {
    if (closeTimer) clearTimeout(closeTimer);
    stickmojiPanelEl.classList.add('opened');
    emojiIcon.classList.add('active');
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

  mount(element, container);

  useObservable(element, message.activePeer, (peer) => {
    let hidden = !peer;
    if (peer && peer._ === 'peerChannel') {
      const chat = chatCache.get(peer.channel_id);
      if (chat && chat._ === 'channel' && !chat.megagroup) {
        hidden = true;
      }
    }

    element.classList.toggle('hidden', hidden);
  });

  // upload with dragndrop
  useListenWhileMounted(element, document, 'dragenter', (event: Event) => event.preventDefault());
  useListenWhileMounted(element, document, 'dragleave', (event: Event) => event.preventDefault());
  useListenWhileMounted(element, document, 'dragover', (event: Event) => event.preventDefault());
  useListenWhileMounted(element, document, 'drop', (event: DragEvent) => {
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      media.attachFiles(event.dataTransfer.files);
    }

    event.preventDefault();
  });

  listen(file, 'change', (event: Event) => {
    if (event && event.target && event.target instanceof HTMLInputElement && event.target.files && event.target.files.length > 0) {
      media.attachFiles(event.target.files);
    }
  });

  return element;
}
