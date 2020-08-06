import { chatCache, messageCache, userCache } from 'cache';
import { messageToSenderPeer } from 'cache/accessors';
import { upload } from 'client/media';
import * as icons from 'components/icons';
import photoRenderer from 'components/media/photo/photo';
import { profileTitle } from 'components/profile';
import { bubble, contextMenu, quote } from 'components/ui';
import { animationFrameStart, listen, mount, unmountChildren } from 'core/dom';
import { getInterface, useInterface, useListenWhileMounted, useMaybeObservable, useObservable, useOnMount } from 'core/hooks';
import { div, input } from 'core/html';
import { MaybeObservable } from 'core/types';
import { peerToId } from 'helpers/api';
import { documentToInputMedia } from 'helpers/message';
import { Document, Peer } from 'mtproto-js';
import { click, media, message } from 'services';
import { initWorker } from 'client/context';
import { isSafari } from 'helpers/browser';
import messageShort from '../short';
import recordSendButton from './button';
import './input.scss';
import stickMojiPanel from './input_stickmoji';
import messageTextarea from './input_textarea';

export default function messageInput(peer: MaybeObservable<Peer | null>) {
  let inner: HTMLElement;
  let wrapper: HTMLElement;
  let currentPeer: Peer | undefined;
  let currentPeerId: string | undefined;
  const messageDrafts = new Map<string, string>();

  const btn = recordSendButton({
    onMessage: () => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      getInterface(textarea).send();
    },
    onAudio: ({ blob, duration }) => {
      upload(blob, (file) => {
        message.sendMediaMessage({
          _: 'inputMediaUploadedDocument',
          file,
          mime_type: blob.type,
          attributes: [{
            _: 'documentAttributeAudio',
            voice: true,
            duration,
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
    onSend: (msg) => {
      message.sendMessage(msg);
      if (currentPeerId) {
        messageDrafts.delete(currentPeerId);
      }
    },
    onChange: (value) => {
      if (currentPeerId) {
        messageDrafts.set(currentPeerId, value);
      }
      if (value) btnI.message();
      else btnI.audio();
    },
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

  const hideIfNotAllowedToWrite = (newPeer: Peer | undefined) => {
    let hide = true;
    switch (newPeer?._) {
      case 'peerUser': {
        const user = userCache.get(newPeer.user_id);
        if (user?._ === 'user' && !user.deleted && !(user.bot && click.getStartToken(user).value)) {
          hide = false;
        }
        break;
      }
      case 'peerChat': {
        const chat = chatCache.get(newPeer.chat_id);
        if (chat?._ === 'chat') {
          if ((!chat.default_banned_rights || !chat.default_banned_rights?.send_messages) && !chat.kicked && !chat.left) {
            hide = false;
          }
        }
        break;
      }
      case 'peerChannel': {
        const channel = chatCache.get(newPeer.channel_id);
        if (channel?._ === 'channel') {
          const bannedRights = channel.banned_rights ?? channel.default_banned_rights;
          if ((!bannedRights || !bannedRights?.send_messages) && !channel.broadcast && !channel.left) {
            hide = false;
          }
        }
        break;
      }
      default:
    }

    if (hide) {
      container.style.display = 'none';
    } else {
      container.style.removeProperty('display');
    }
  };

  useMaybeObservable(container, peer, true, (newPeer) => {
    if (newPeer) {
      hideIfNotAllowedToWrite(newPeer);
      currentPeer = newPeer;
      currentPeerId = peerToId(newPeer);
      const draft = messageDrafts.get(currentPeerId);
      textarea.value = draft ?? '';
    } else {
      textarea.value = '';
      container.style.display = 'none';
    }
  });

  useOnMount(container, () => {
    if (isSafari) initWorker();
  });

  return useInterface(container, {
    updateVisibility: () => hideIfNotAllowedToWrite(currentPeer),
  });
}
