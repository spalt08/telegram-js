import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { userCache, chatCache, messageCache, dialogCache } from 'cache';
import {
  peerToDialogId,
  dialogToId,
  inputPeerToInputDialogPeer,
  inputPeerToPeer,
  peerMessageToId,
  peerToId,
  dialogPeerToDialogId,
  peerToDialogPeer,
  isDialogInFolder,
} from 'helpers/api';
import {
  Peer,
  InputDialogPeer,
  Dialog,
  MessagesGetDialogs,
  MessagesDialogs,
  MessagesPeerDialogs,
  InputPeer, DialogPeer,
} from 'mtproto-js';
import { dialogPeerToInputDialogPeer } from 'cache/accessors';

import MessageService from '../message/message';
import makeDialogReadReporter, { DialogReadReporter } from './dialog_read_reporter';

/**
 * Singleton service class for handling dialogs
 */
export default class DialogsService {
  // todo: Remove in favour of the filter service
  readonly dialogs = new BehaviorSubject(dialogCache.indices.order.getIds());

  readonly loading = new BehaviorSubject(false);

  protected isComplete = false;

  // The dialogs cache can be filled with the previous session dialogs. They aren't real and must be replaced on load.
  protected areRealDialogsLoaded = false;

  /** The date of the top message of the last dialog that was loaded sequentially */
  protected lastLoadedDate: number | undefined;

  protected readReporters: Record<string, DialogReadReporter> = {};

  /**
   * Ids of peers of dialogs that are requested by peer and being loaded now. Used to now load same dialogs simultaneously.
   */
  protected loadingPeers = new Set<string>();

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
      this.changeOrLoadDialog(peerToDialogPeer(peer), (dialog) => {
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
      this.changeOrLoadDialog(peerToDialogPeer(update.peer), (dialog) => ({
        ...dialog,
        read_inbox_max_id: update.max_id,
        unread_count: update.still_unread_count,
      }));
    });

    // outcoming message were read
    client.updates.on('updateReadHistoryOutbox', (update) => {
      this.changeOrLoadDialog(peerToDialogPeer(update.peer), (dialog) => ({
        ...dialog,
        read_outbox_max_id: update.max_id,
      }));
    });

    // incoming message were read (channel)
    client.updates.on('updateReadChannelInbox', (update) => {
      this.changeOrLoadDialog(peerToDialogPeer({ _: 'peerChannel', channel_id: update.channel_id }), (dialog) => ({
        ...dialog,
        read_inbox_max_id: update.max_id,
        unread_count: update.still_unread_count,
      }));
    });

    // outcoming message were read (channel)
    client.updates.on('updateReadChannelOutbox', (update) => {
      this.changeOrLoadDialog(peerToDialogPeer({ _: 'peerChannel', channel_id: update.channel_id }), (dialog) => ({
        ...dialog,
        read_outbox_max_id: update.max_id,
      }));
    });

    client.updates.on('updateDialogUnreadMark', (update) => {
      if (update.peer._ === 'dialogPeer') {
        this.changeOrLoadDialog(update.peer, (dialog) => ({
          ...dialog,
          unread_mark: update.unread,
        }));
      }
    });

    client.updates.on('updateDialogPinned', (update) => {
      if (update.peer._ === 'dialogPeer') {
        this.changeOrLoadDialog(update.peer, (dialog) => ({
          ...dialog,
          pinned: update.pinned,
        }));
        if (update.pinned) {
          dialogCache.indices.pinned.add('start', [peerToDialogId(update.peer.peer)]);
        } else {
          dialogCache.indices.pinned.remove([peerToDialogId(update.peer.peer)]);
        }
      }
    });

    client.updates.on('updatePinnedDialogs', (update) => {
      const { order, folder_id } = update;
      if (order) {
        this.loadPeerDialogs(order.filter((peer: DialogPeer) => !dialogCache.has(dialogPeerToDialogId(peer))));

        dialogCache.batchChanges(() => {
          const idsToPin = new Set<string>(order.map(dialogPeerToDialogId));
          const idsToUnpin: string[] = [];
          idsToPin.forEach((id) => dialogCache.change(id, { pinned: true }));
          dialogCache.indices.pinned.eachId((id) => {
            if (!idsToPin.has(id)) {
              idsToUnpin.push(id);
              const dialog = dialogCache.get(id);
              if (dialog && isDialogInFolder(dialog, folder_id)) {
                dialogCache.change(id, { pinned: false });
              }
            }
          });
          dialogCache.indices.pinned.remove(idsToUnpin);
          dialogCache.indices.pinned.add('start', [...idsToPin]);
        });
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
      await this.updateDialogs(this.lastLoadedDate);
      // this.dialogs.value isn't used because it may contain random old dialogs
    }
  }

  reportMessageRead(peer: Peer, messageId: number) {
    const dialogId = peerToDialogId(peer);
    if (!dialogCache.has(dialogId)) {
      return;
    }

    if (!this.readReporters[dialogId]) {
      this.readReporters[dialogId] = makeDialogReadReporter(peer);
    }
    this.readReporters[dialogId].reportRead(messageId);
  }

  loadMissingDialogs(inputPeers: InputPeer[]) {
    const dialogsToLoad: InputDialogPeer[] = [];

    inputPeers.forEach((inputPeer) => {
      const peer = inputPeerToPeer(inputPeer);
      if (peer) {
        if (!dialogCache.has(peerToDialogId(peer))) {
          dialogsToLoad.push(inputPeerToInputDialogPeer(inputPeer));
        }
      }
    });

    this.loadInputPeerDialogs(dialogsToLoad);
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
      if (data.dialogs.length < chunk * 0.9) { // *0.9 just in case
        this.isComplete = true;
      }

      userCache.put(data.users);
      chatCache.put(data.chats);
      messageCache.put(data.messages);
      this.addSequentialDialogs(data.dialogs);
      this.messageService.pushMessages(data.messages);
    }
  }

  protected addSequentialDialogs(dialogs: Dialog[]) {
    // Determine dialogs to preload
    let dialogsToPreload: Dialog[] | undefined;
    if (!this.areRealDialogsLoaded) {
      dialogsToPreload = dialogs.slice(0, 10);
    }

    // Actualize the oldest loaded dialog date
    for (let i = dialogs.length - 1; i >= 0; --i) {
      const msg = messageCache.get(peerMessageToId(dialogs[i].peer, dialogs[i].top_message));
      if (msg && msg._ !== 'messageEmpty') {
        this.lastLoadedDate = msg.date;
        break;
      }
    }

    // Don't remove all dialogs from cache because they can be used by filter pinned peers
    dialogCache.put(dialogs);

    // Actualize pinned dialogs
    const toPin: string[] = [];
    const toUnpin: string[] = [];
    dialogs.forEach((dialog) => {
      const id = dialogToId(dialog);
      (dialog.pinned ? toPin : toUnpin).push(id);
    });
    dialogCache.indices.pinned.remove(toUnpin);
    dialogCache.indices.pinned.add('end', toPin);

    this.areRealDialogsLoaded = true;

    if (dialogsToPreload) {
      /* no await */this.preloadMessages(dialogsToPreload);
    }
  }

  protected changeOrLoadDialog(peer: DialogPeer, modify: (dialog: Dialog) => Dialog | null | undefined) {
    const dialog = dialogCache.get(dialogPeerToDialogId(peer));

    if (dialog) {
      const newDialog = modify(dialog);
      if (newDialog) {
        dialogCache.put(newDialog);
      }
    } else {
      this.loadPeerDialogs([peer]);
    }
  }

  protected loadPeerDialogs(peers: DialogPeer[]) {
    const inputPeers: InputDialogPeer[] = [];

    peers.forEach((peer) => {
      try {
        inputPeers.push(dialogPeerToInputDialogPeer(peer));
      } catch (error) {
        // It's not a destiny to chat with this peer
      }
    });

    this.loadInputPeerDialogs(inputPeers);
  }

  protected async loadInputPeerDialogs(peers: InputDialogPeer[]) {
    const loadingPeerIds: string[] = [];
    const request = {
      peers: [] as InputDialogPeer[],
    };

    try {
      peers.forEach((inputPeer) => {
        if (inputPeer._ === 'inputDialogPeer') {
          const peer = inputPeerToPeer(inputPeer.peer);
          if (peer) {
            const peerId = peerToId(peer);
            if (!this.loadingPeers.has(peerId)) { // Don't load the peer dialog if it's loading now
              loadingPeerIds.push(peerId);
              this.loadingPeers.add(peerId);
            }
          }
        }
      });

      if (!request.peers.length) {
        return;
      }

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
    } finally {
      loadingPeerIds.forEach((peerId) => this.loadingPeers.delete(peerId));
    }
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
