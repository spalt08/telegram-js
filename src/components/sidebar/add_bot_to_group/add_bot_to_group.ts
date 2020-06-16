import { chatCache, userCache } from 'cache';
import { chatToTitle, userToTitle } from 'cache/accessors';
import client from 'client/client';
import * as icons from 'components/icons';
import { heading, list } from 'components/ui';
import { div } from 'core/html';
import { channelIdToPeer, chatIdToPeer, peerIdToPeer, peerToId } from 'helpers/api';
import { Peer } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import { bots, message } from 'services';
import { showConfirmation } from 'services/click_handlers';
import contact from '../contact/contact';
import './add_bot_to_group.scss';

type SidebarComponentProps = import('../sidebar').SidebarComponentProps;

function confirmAddBot(botPeer: Peer.peerUser, chatPeer: Peer, closeSidebar: (() => void) | undefined) {
  if (chatPeer._ === 'peerChat' || chatPeer._ === 'peerChannel') {
    const chat = chatCache.get(chatPeer._ === 'peerChat' ? chatPeer.chat_id : chatPeer.channel_id);
    const bot = userCache.get(botPeer.user_id);
    if (chat && (chat._ === 'chat' || chat._ === 'channel') && bot && bot._ === 'user' && bot.bot) {
      showConfirmation(`Do you want to add «${userToTitle(bot)}» to the group «${chatToTitle(chat)}»?`, 'Add bot', () => {
        bots.sendBotStart(bot, chatPeer);
        // client.call('messages.addChatUser', { chat_id: chat.id, user_id: peerToInputUser(botPeer), fwd_limit: 1 });
        if (closeSidebar) closeSidebar();
        message.selectPeer(chatPeer);
      });
    }
  }
}

const groups = new BehaviorSubject<string[]>([]);
let prevRequestTime = 0;

function refreshGroupList() {
  // To avoid FLOOD_WAIT errors we limit request rate of messages.getAllChats
  if (Date.now() - prevRequestTime > 60 * 1000) {
    prevRequestTime = Date.now();

    client.call('messages.getAllChats', { except_ids: [] })
      .then((chats) => {
        const availableGroups = chats.chats.filter((c) => {
          if (c._ === 'chat' && !c.deactivated && !c.kicked) return true;
          if ((c._ === 'channel' && !c.broadcast && !(c.banned_rights || c.default_banned_rights)?.invite_users)) return true;
          return false;
        });
        chatCache.put(availableGroups);
        groups.next(availableGroups.map((g) => {
          const p = g._ === 'chat' ? chatIdToPeer(g.id) : channelIdToPeer(g.id);
          return peerToId(p);
        }));
      });
  }
}

export default function addBotToGroup({ onBack }: SidebarComponentProps, botPeer: Peer.peerUser) {
  const groupList = list({
    items: groups,
    renderer(id) {
      const chatPeer = peerIdToPeer(id);
      return contact({ peer: chatPeer, clickMiddleware: () => confirmAddBot(botPeer, chatPeer, onBack) });
    },
  });
  const rootEl = div`.addBotToGroup`(
    heading({
      title: 'Select a group',
      buttons: [
        { icon: icons.close, position: 'left', onClick: () => onBack && onBack() },
      ],
    }),
    div`.addBotToGroup__content`(groupList),
  );

  refreshGroupList();

  return rootEl;
}
