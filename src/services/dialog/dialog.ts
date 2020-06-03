import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { userCache, chatCache, messageCache, dialogCache } from 'cache';
import { dialogPeerToDialogId, peerMessageToId, peerToId } from 'helpers/api';
import {
  Peer,
  InputDialogPeer,
  Dialog,
  MessagesGetDialogs,
  MessagesDialogs,
  MessagesPeerDialogs,
} from 'mtproto-js';
import { peerToInputDialogPeer } from 'cache/accessors';

import MessageService from '../message/message';
import makeDialogReadReporter, { DialogReadReporter } from './dialog_read_reporter';

/**
 * Singleton service class for handling dialogs
 */
export default class DialogsService {
  readonly dialogs = new BehaviorSubject(dialogCache.indices.order.getIds());

  readonly loading = new BehaviorSubject(false);

  protected isComplete = false;

  // The dialogs cache can be filled with the previus session dialogs. They aren't real and must be replaced on load.
  protected areRealDialogsLoaded = false;

  protected readReporters: Record<string, DialogReadReporter> = {};

  constructor(private messageService: MessageService) {
    dialogCache.indices.order.changes.subscribe(() => {
      this.dialogs.next(dialogCache.indices.order.getIds());
    });

    dialogCache.changes.subscribe((changes) => {
      changes.forEach(([action, _dialog, dialogId]) => {
        if (action === 'remove') {
          if (this.readReporters[dialogId]) {
            this.readReporters[dialogId].destroy();
            delete this.readReporters[dialogId];
          }
        }
      });
    });

    // The client pushes it before pushing messages
    client.updates.on('chat', (chat) => {
      // It has a broken access_hash for some reason so it shouldn't replace an existing chat
      if (!chatCache.has(chat.id)) {
        chatCache.put(chat);
      }
    });

    messageCache.indices.history.newestMessages.subscribe(([peer, messageId]) => {
      this.changeOrLoadDialog(peer, (dialog) => {
        if (dialog._ !== 'dialog' || dialog.top_message === messageId) {
          return undefined;
        }

        let unread = dialog.unread_count;
        const message = messageCache.get(peerMessageToId(dialog.peer, messageId));
        if (message && message._ !== 'messageEmpty' && message.out === false) {
          if (message.id > dialog.top_message) unread++;
          else unread = Math.max(0, unread - 1);
        }

        return {
          ...dialog,
          top_message: messageId,
          unread_count: unread,
        };
      });
    });

    // incoming message were read
    client.updates.on('updateReadHistoryInbox', (update) => {
      this.changeOrLoadDialog(update.peer, (dialog) => ({
        ...dialog,
        read_inbox_max_id: update.max_id,
        unread_count: update.still_unread_count,
      }));
    });

    // outcoming message were read
    client.updates.on('updateReadHistoryOutbox', (update) => {
      this.changeOrLoadDialog(update.peer, (dialog) => ({
        ...dialog,
        read_outbox_max_id: update.max_id,
      }));
    });

    // incoming message were read (channel)
    client.updates.on('updateReadChannelInbox', (update) => {
      this.changeOrLoadDialog({ _: 'peerChannel', channel_id: update.channel_id }, (dialog) => ({
        ...dialog,
        read_inbox_max_id: update.max_id,
        unread_count: update.still_unread_count,
      }));
    });

    // outcoming message were read (channel)
    client.updates.on('updateReadChannelOutbox', (update) => {
      this.changeOrLoadDialog({ _: 'peerChannel', channel_id: update.channel_id }, (dialog) => ({
        ...dialog,
        read_outbox_max_id: update.max_id,
      }));
    });

    client.updates.on('updateDialogUnreadMark', (update) => {
      if (update.peer._ === 'dialogPeer') {
        this.changeOrLoadDialog(update.peer.peer, (dialog) => ({
          ...dialog,
          unread_mark: update.unread,
        }));
      }
    });

    client.updates.on('updateDialogPinned', (update) => {
      if (update.peer._ === 'dialogPeer') {
        this.changeOrLoadDialog(update.peer.peer, (dialog) => ({
          ...dialog,
          pinned: update.pinned,
        }));
      }
    });
  }

  async updateDialogs(offsetDate = 0) {
    if (this.loading.value) {
      return;
    }

    try {
      this.loading.next(true);
      await this.doUpdateDialogs(offsetDate);
    } finally {
      this.loading.next(false);
    }
  }

  async loadMoreDialogs() {
    if (!this.isComplete && this.areRealDialogsLoaded) {
      const last = dialogCache.get(this.dialogs.value[this.dialogs.value.length - 1] as string);
      if (last) {
        const msg = messageCache.get(peerMessageToId(last.peer, last.top_message));
        if (msg && msg._ !== 'messageEmpty') await this.updateDialogs(msg.date);
      }
    }
  }

  reportMessageRead(peer: Peer, messageId: number) {
    const dialogId = dialogPeerToDialogId(peer);
    if (!dialogCache.has(dialogId)) {
      return;
    }

    if (!this.readReporters[dialogId]) {
      this.readReporters[dialogId] = makeDialogReadReporter(peer);
    }
    this.readReporters[dialogId].reportRead(messageId);
  }

  protected async doUpdateDialogs(offsetDate = 0) {
    const chunk = 30;
    const payload: MessagesGetDialogs = {
      offset_date: offsetDate,
      offset_id: 0,
      offset_peer: { _: 'inputPeerEmpty' },
      limit: chunk,
      hash: 0,
    };

    let data: MessagesDialogs | undefined;
    try {
      data = await client.call('messages.getDialogs', payload);
    } catch (err) {
      if (err.message?.indexOf('USER_MIGRATE_') > -1) {
        // todo store dc
        client.setBaseDC(+err.message.slice(-1));
        await this.doUpdateDialogs(offsetDate);
        return;
      }
    }

    if (data && (data._ === 'messages.dialogs' || data._ === 'messages.dialogsSlice')) {
      let dialogsToPreload: Dialog[] | undefined;
      if (this.dialogs.value.length === 0) dialogsToPreload = data.dialogs.slice(0, 10);

      if (data.dialogs.length < chunk - 10) { // -10 just in case
        this.isComplete = true;
      }

      userCache.put(data.users);
      chatCache.put(data.chats);
      messageCache.put(data.messages);
      if (this.areRealDialogsLoaded) {
        dialogCache.put(data.dialogs);
      } else {
        this.areRealDialogsLoaded = true;
        dialogCache.replaceAll(data.dialogs);
      }
      this.messageService.pushMessages(data.messages);

      if (dialogsToPreload) {
        /* no await */this.preloadMessages(dialogsToPreload);
      }
    }
  }

  protected changeOrLoadDialog(peer: Peer, modify: (dialog: Dialog) => Dialog | null | undefined) {
    const dialog = dialogCache.get(peerToId(peer));

    if (dialog) {
      const newDialog = modify(dialog);
      if (newDialog) {
        dialogCache.put(newDialog);
      }
    } else {
      this.loadPeerDialogs([peer]);
    }
  }

  protected loadPeerDialogs(peers: Peer[]) {
    const inputPeers: InputDialogPeer[] = [];

    peers.forEach((peer) => {
      try {
        inputPeers.push(peerToInputDialogPeer(peer));
      } catch (error) {
        // It's not a destiny to chat with this peer
      }
    });

    this.loadInputPeerDialogs(inputPeers);
  }

  protected async loadInputPeerDialogs(peers: InputDialogPeer[]) {
    const request = { peers };
    let data: MessagesPeerDialogs.messagesPeerDialogs;
    try {
      data = await client.call('messages.getPeerDialogs', request);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Failed to load peer dialogs', { request, err });
      }
      return;
    }
    userCache.put(data.users);
    chatCache.put(data.chats);
    messageCache.put(data.messages);
    dialogCache.put(data.dialogs);
    this.messageService.pushMessages(data.messages);
  }

  protected async preloadMessages(_dialogs: Dialog[]) {
    // for (let i = 0; i < dialogs.length; i++) {
    //   const dialog = dialogs[i];
    //   if (dialog._ !== 'dialog' || dialog.unread_count > 0) {
    //     continue;
    //   }

    //   // Postpone a bit to let more important requests go
    //   // eslint-disable-next-line no-await-in-loop
    //   await new Promise((resolve) => setTimeout(resolve, 100));

    //   let messages: MessagesMessages;
    //   try {
    //     // eslint-disable-next-line no-await-in-loop
    //     messages = await client.call('messages.getHistory', {
    //       peer: peerToInputPeer(dialogs[i].peer),
    //       offset_id: 0,
    //       offset_date: 0,
    //       add_offset: -10,
    //       limit: 20,
    //       max_id: 0,
    //       min_id: 0,
    //       hash: 0,
    //     }, {
    //       thread: 2,
    //     });
    //   } catch (err) {
    //     return;
    //   }
    //   if (messages._ !== 'messages.messagesNotModified') {
    //     userCache.put(messages.users);
    //     chatCache.put(messages.chats);
    //     messageCache.indices.history.putNewestMessages(messages.messages);
    //   }
    // }
  }
}
