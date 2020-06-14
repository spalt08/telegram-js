import { div, input } from 'core/html';
import { listen, unmountChildren, mount, animationFrameStart } from 'core/dom';
import * as icons from 'components/icons';
import { media, message } from 'services';
import { getInterface, useListenWhileMounted, useObservable } from 'core/hooks';
import { Document } from 'mtproto-js';
import { bubble, contextMenu, quote } from 'components/ui';
import { documentToInputMedia } from 'helpers/message';
import { messageCache } from 'cache';
import { upload } from 'client/media';
import { messageToSenderPeer } from 'cache/accessors';
import { profileTitle } from 'components/profile';
import photoRenderer from 'components/media/photo/photo';
import stickMojiPanel from './input_stickmoji';
import messageTextarea from './input_textarea';
import './input.scss';
import recordSendButton from './button';
import messageShort from '../short';

export default function messageInput() {
  let inner: HTMLElement;
  let wrapper: HTMLElement;

  const btn = recordSendButton({
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    onMessage: () => message.sendMessage(textarea.value),
    onAudio: ({ blob, duration, waveform }) => {
      upload(blob, (file) => {
        message.sendMediaMessage({
          _: 'inputMediaUploadedDocument',
          file,
          mime_type: blob.type,
          attributes: [{
            _: 'documentAttributeAudio',
            voice: true,
            duration,
            waveform,
          }],
        });
      });
    },
    onStartRecording: () => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      container.classList.add('-recording');
    },
    onFinishRecording: () => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      container.classList.remove('-recording');
    },
  });

  const btnI = getInterface(btn);

  const textarea = messageTextarea({
    onSend: message.sendMessage,
    onChange: (value) => value ? btnI.message() : btnI.audio(),
    maxHeight: 400,
  });

  const emojiIcon = div`.msginput__emoji`(icons.smile({ className: 'msginput__icon' }));

  const fileInput = input`.msginput__file`({
    type: 'file',
    multiple: true,
    onChange: (event: Event) => {
      if (event && event.target && event.target instanceof HTMLInputElement && event.target.files && event.target.files.length > 0) {
        media.attachFiles(event.target.files);
      }
    },
  });

  const attachmentMenu = contextMenu({
    className: 'msginput__attachments-menu',
    options: [
      { icon: icons.photo, label: 'Photo or Video', onClick: () => fileInput.click() },
      { icon: icons.document, label: 'Document', onClick: () => fileInput.click() },
      { icon: icons.document, label: 'Poll', onClick: () => {} },
    ],
  });

  const attachIcon = div`.msginput__attach`(icons.attach({ className: 'msginput__icon' }));

  const quoteCancel = div`.msginput__quote-cancel`(icons.close());
  const quoteContainer = div`.msginput__quote.hidden`();

  const container = div`.msginput`(
    wrapper = div`.msginput__wrapper`(
      inner = div`.msginput__container`(
        bubble({ className: 'msginput__bubble bubble-first-last' },
          quoteContainer,
          div`.msginput__bubble-content`(
            emojiIcon,
            textarea,
            attachIcon,
          ),
        ),
        btn,
      ),
    ),
  );

  const stickmojiPanelEl = stickMojiPanel({
    onSelectEmoji: (emoji: string) => getInterface(textarea).insertText(emoji),
    onSelectSticker: (sticker: Document.document) => message.sendMediaMessage(documentToInputMedia(sticker)),
    onClose: () => {
      if (container.previousElementSibling) container.previousElementSibling.classList.remove('-messagePanelShowed');
    },
  });

  listen(attachIcon, 'click', (event: MouseEvent) => {
    stickmojiPanelEl.classList.add('-closing');
    event.stopPropagation();
    event.preventDefault();

    if (attachmentMenu.parentElement) getInterface(attachmentMenu).close();
    else mount(inner, attachmentMenu);
  });

  // Reply
  useObservable(container, message.replyToMessageID, true, (msgID) => {
    unmountChildren(quoteContainer);

    if (msgID) {
      const msg = messageCache.get(msgID);

      if (msg && msg._ !== 'messageEmpty') {
        let preview: Node | undefined;

        if (msg._ === 'message' && msg.media?._ === 'messageMediaPhoto' && msg.media.photo?._ === 'photo') {
          preview = div`.quote__img`(photoRenderer(msg.media.photo, { fit: 'cover', width: 32, height: 32 }));
        }

        mount(quoteContainer, quoteCancel);
        mount(quoteContainer, quote(
          profileTitle(messageToSenderPeer(msg)),
          messageShort(msg),
          preview,
        ));

        animationFrameStart().then(() => quoteContainer.classList.remove('hidden'));
      }
    } else quoteContainer.classList.add('hidden');
  });

  listen(quoteCancel, 'click', () => {
    message.unsetReply();
  });

  // Sticker & Emoji Panel Handling
  const toggleStickMojiPanel = (event: MouseEvent) => {
    // open
    if (stickmojiPanelEl.classList.contains('-closing') || !stickmojiPanelEl.parentElement) {
      if (!stickmojiPanelEl.parentElement) mount(wrapper, stickmojiPanelEl);
      if (container.previousElementSibling) container.previousElementSibling.classList.add('-messagePanelShowed');
      stickmojiPanelEl.classList.remove('-closing');

    // close
    } else {
      stickmojiPanelEl.classList.add('-closing');
      if (container.previousElementSibling) container.previousElementSibling.classList.remove('-messagePanelShowed');
    }

    getInterface(attachmentMenu).close();
    event.preventDefault();
    event.stopPropagation();
  };

  listen(emojiIcon, 'click', toggleStickMojiPanel);

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
