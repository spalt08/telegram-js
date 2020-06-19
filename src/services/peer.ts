import { chatCache, chatFullCache, pinnedMessageCache, userCache, userFullCache } from 'cache';
import { peerToInputChannel, peerToInputUser } from 'cache/accessors';
import client from 'client/client';
import { inputPeerToInputChannel, inputPeerToInputUser, peerToId } from 'helpers/api';
import { InputChannel, InputPeer, InputUser, Peer } from 'mtproto-js';
import { EMPTY, timer } from 'rxjs';
import { debounceTime, map, switchMap } from 'rxjs/operators';
import MessageService from './message/message';
import UsersService from './user';
import ChatsService from './chat';

const UPDATE_INTERVAL = 60 * 1000; // every minute

/**
 * Singleton service class for handling peers
 */
export default class PeerService {
  #lastUpdateTime = new Map<string, number>();

  #userService: UsersService;
  #chatService: ChatsService;

  constructor(messageService: MessageService, userService: UsersService, chatService: ChatsService) {
    this.#userService = userService;
    this.#chatService = chatService;

    messageService.activePeer
      .pipe(
        debounceTime(300), // Wait a bit to not interfere the messages loading
        switchMap((peer) => {
          if (peer) {
            const lastUpdateTime = this.#lastUpdateTime.get(peerToId(peer));
            const dueTime = lastUpdateTime ? UPDATE_INTERVAL - (Date.now() - lastUpdateTime) : 0;
            return timer(dueTime, UPDATE_INTERVAL).pipe(map(() => peer)); // periodically update full info about the peer
          }
          return EMPTY;
        }),
      )
      .subscribe((peer) => this.loadFullInfo(peer));
  }

  private async loadFullInfo(peer: Peer) {
    switch (peer._) {
      case 'peerChannel': {
        const channelFull = await client.call('channels.getFullChannel', {
          channel: peerToInputChannel(peer),
        });
        if (channelFull.full_chat) {
          userCache.put(channelFull.users);
          chatCache.put(channelFull.chats);
          chatFullCache.put(channelFull.full_chat);
          if (channelFull.full_chat.pinned_msg_id) {
            this.loadPinnedMessage(peer, channelFull.full_chat.pinned_msg_id);
          }
        }
        break;
      }
      case 'peerChat': {
        const chatFull = await client.call('messages.getFullChat', {
          chat_id: peer.chat_id,
        });
        if (chatFull.full_chat) {
          userCache.put(chatFull.users);
          chatCache.put(chatFull.chats);
          chatFullCache.put(chatFull.full_chat);
          if (chatFull.full_chat.pinned_msg_id) {
            this.loadPinnedMessage(peer, chatFull.full_chat.pinned_msg_id);
          }
        }
        break;
      }
      case 'peerUser': {
        const userFull = await client.call('users.getFullUser', {
          id: peerToInputUser(peer),
        });
        userFullCache.put(userFull);
        if (userFull.pinned_msg_id) {
          this.loadPinnedMessage(peer, userFull.pinned_msg_id);
        }
        break;
      }
      default:
    }

    this.#lastUpdateTime.set(peerToId(peer), Date.now());
  }

  private async loadPinnedMessage(peer: Peer, pinnedMessageId: number) {
    switch (peer._) {
      case 'peerChannel': {
        const msg = await client.call('channels.getMessages', {
          channel: peerToInputChannel(peer),
          id: [{ _: 'inputMessageID', id: pinnedMessageId }],
        });
        if (msg._ === 'messages.channelMessages' && msg.messages.length > 0 && msg.messages[0]._ === 'message') {
          userCache.put(msg.users);
          chatCache.put(msg.chats);
          pinnedMessageCache.put(msg.messages[0]);
        }
        break;
      }
      default: {
        const msg = await client.call('messages.getMessages', {
          id: [{ _: 'inputMessageID', id: pinnedMessageId }],
        });
        if (msg._ === 'messages.messages' && msg.messages.length > 0 && msg.messages[0]._ === 'message') {
          userCache.put(msg.users);
          chatCache.put(msg.chats);
          pinnedMessageCache.put(msg.messages[0]);
        }
      }
    }
  }

  loadMissingPeers(inputPeers: InputPeer[]) {
    const inputUsers: InputUser[] = [];
    const inputChannels: InputChannel[] = [];
    const chatIds: number[] = [];

    let inputUser: InputUser | null;
    let inputChannel: InputChannel | null;

    inputPeers.forEach((peer) => {
      if (peer._ === 'inputPeerChat') {
        chatIds.push(peer.chat_id);
        return;
      }

      inputUser = inputPeerToInputUser(peer);
      if (inputUser) {
        inputUsers.push(inputUser);
        return;
      }

      inputChannel = inputPeerToInputChannel(peer);
      if (inputChannel) {
        inputChannels.push(inputChannel);
        return; // eslint-disable-line no-useless-return
      }
    });

    Promise.all([
      this.#userService.loadMissingUsers(inputUsers),
      this.#chatService.loadMissingChannels(inputChannels),
      this.#chatService.loadMissingChats(chatIds),
    ]);
  }
}
