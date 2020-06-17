import { chatCache, messageCache, userCache } from 'cache';
import client from 'client/client';
import { channelIdToPeer, userIdToPeer } from 'helpers/api';
import { Chat, Peer, User } from 'mtproto-js';
import { BehaviorSubject } from 'rxjs';
import MainService from './main';
import MessagesService, { PeerScrollTarget } from './message/message';

type UrlHandler = [RegExp, (regExp: RegExpMatchArray, context: any) => boolean];

function urlRequiresConfirmation(url: string) {
  return !/(^|\.)(telegram\.org|telegra\.ph|telesco\.pe)$/i.test(url);
}

function tryConvertUrlToLocal(rawUrl: string) {
  const url = rawUrl.length > 8192 ? rawUrl.substr(0, 8192) : rawUrl;
  const regexp = /^(https?:\/\/)?(www\.)?(telegram\.(me|dog)|t\.me)\/(.+)$/i;
  const telegramMeMatch = url.match(regexp);
  if (telegramMeMatch) {
    const query = telegramMeMatch[5];

    const joinChatMatch = query.match(/^joinchat\/([a-zA-Z0-9._-]+)(\?|$)/i);
    if (joinChatMatch) return `tg://join?invite=${encodeURI(joinChatMatch[1])}`;

    const stickerSetMatch = query.match(/^addstickers\/([a-zA-Z0-9._]+)(\?|$)/i);
    if (stickerSetMatch) return `tg://addstickers?set=${encodeURI(stickerSetMatch[1])}`;

    const themeMatch = query.match(/^addtheme\/([a-zA-Z0-9._]+)(\?|$)/i);
    if (themeMatch) return `tg://addtheme?slug=${encodeURI(themeMatch[1])}`;

    const languageMatch = query.match(/^setlanguage\/([a-zA-Z0-9._-]+)(\?|$)/i);
    if (languageMatch) return `tg://setlanguage?lang=${encodeURI(languageMatch[1])}`;

    const shareUrlMatch = query.match(/^share\/url\/?\?(.+)$/i);
    if (shareUrlMatch) return `tg://msg_url?${shareUrlMatch[1]}`;

    const confirmPhoneMatch = query.match(/^confirmphone\/?\?(.+)/i);
    if (confirmPhoneMatch) return `tg://confirmphone?${confirmPhoneMatch[1]}`;

    const ivMatch = query.match(/^iv\/?\?(.+)(#|$)/i);
    if (ivMatch) return url;

    const socksMatch = query.match(/^socks\/?\?(.+)(#|$)/i);
    if (socksMatch) return `tg://socks?${socksMatch[1]}`;

    const proxyMatch = query.match(/^proxy\/?\\?(.+)(#|$)/i);
    if (proxyMatch) return `tg://proxy?${proxyMatch[1]}`;

    const bgMatch = query.match(/^bg\/([a-zA-Z0-9._-]+)(\?(.+)?)?$/i);
    if (bgMatch) {
      const params = bgMatch[3];
      return `tg://bg?slug=${bgMatch[1]}${params ? `&${params}` : ''}`;
    }

    const postMatch = query.match(/^c\/(-?\d+)\/(\d+)(#|$)/i);
    if (postMatch) return `tg://privatepost?channel=${postMatch[1]}&post=${postMatch[2]}`;

    const usernameMatch = query.match(/^([a-zA-Z0-9._]+)(\/?\?|\/?$|\/(\d+)\/?(?:\?|$))/i);
    if (usernameMatch) {
      const params = query.substr(usernameMatch[0].length);
      let postParam = '';
      if (/^\/\d+\/?(?:\?|$)/.test(usernameMatch[2])) {
        postParam = `&post=${usernameMatch[3]}`;
      }
      return `tg://resolve/?domain=${encodeURI(usernameMatch[1])}${postParam}${params ? `&${params}` : ''}`;
    }
  }
  return url;
}

function isValidDomain(domain: string) {
  return /^[a-zA-Z0-9\\.\\_]+$/.test(domain);
}

export default class ClickService {
  #main: MainService;
  #message: MessagesService;
  #botStartTokens = new Map<number, BehaviorSubject<string | undefined>>();
  #botStartGroupTokens = new Map<number, BehaviorSubject<string | undefined>>();

  constructor(main: MainService, message: MessagesService) {
    this.#main = main;
    this.#message = message;
  }

  #resolveUsername = (match: RegExpMatchArray, context: any) => {
    const params = new URLSearchParams(match[1]);
    const domain = params.get('domain')!;
    // if (domain == qsl('telegrampassport')) {
    //   return ShowPassportForm(params);
    // }
    if (!isValidDomain(domain)) {
      return false;
    }
    let start = 'start';
    let startToken = params.get('start') ?? undefined;
    if (!startToken) {
      start = 'startgroup';
      startToken = params.get(start) ?? undefined;
      if (!startToken) {
        start = '';
      }
    }
    let post = start === 'startgroup' ? Infinity : 'firstUnread' as const;
    const postParam = params.get('post');
    if (postParam) {
      post = +postParam;
    }
    // const auto gameParam = params.value(qsl("game"));
    // if (!gameParam.isEmpty() && valid(gameParam)) {
    //   startToken = gameParam;
    //   post = ShowAtGameShareMsgId;
    // }
    const clickFromMessageId = context;
    this.#openPeerByName(
      domain,
      post,
      startToken,
      clickFromMessageId);
    return true;
  };

  #openPeerByName = async (username: string, scrollTarget: PeerScrollTarget, startToken: string | undefined, clickFromMessageId: string) => {
    let userOrChannel: User.user | Chat.channel | undefined;
    userOrChannel = userCache.indices.usernames.findByUsername(username) ?? chatCache.indices.usernames.findByUsername(username);
    if (!userOrChannel) {
      const resolved = await client.call('contacts.resolveUsername', { username });
      userCache.put(resolved.users);
      chatCache.put(resolved.chats);
      const { peer } = resolved;

      if (peer._ === 'peerUser') {
        userOrChannel = userCache.get(peer.user_id) as User.user;
      } else if (peer._ === 'peerChannel') {
        userOrChannel = chatCache.get(peer.channel_id) as Chat.channel;
      }
    }

    let peer: Peer | undefined;
    let user: User.user | undefined;
    if (!userOrChannel) {
      peer = undefined;
    } else if (userOrChannel._ === 'user') {
      peer = userIdToPeer(userOrChannel.id);
      user = userOrChannel;
    } else {
      peer = channelIdToPeer(userOrChannel.id);
    }

    if (!peer) {
      return;
    }

    if (scrollTarget === Infinity && (!peer || peer._ !== 'peerChannel')) {
      if (user && user.bot && !user.bot_nochats && startToken) {
        this.#setStartGroupToken(user, startToken);
        this.#main.openSidebar('addBotToGroup', peer);
      } else if (user && user.bot) {
        // Always open bot chats, even from mention links.
        this.#message.selectPeer(peer);
      } else {
        this.#main.openSidebar('info', peer);
      }
    } else {
      if (scrollTarget === Infinity || peer._ !== 'peerChannel') { // show specific posts only in channels / supergroups
        // eslint-disable-next-line no-param-reassign
        scrollTarget = 'firstUnread';
      }
      if (user && user.bot) {
        this.#setStartToken(user, startToken);
        // if (peer == _history -> peer()) {
        //   _history -> updateControlsVisibility();
        //   _history -> updateControlsGeometry();
        // }
      }
      const returnTo = messageCache.get(clickFromMessageId);
      if (returnTo?._ === 'message') {
        if (returnTo.to_id === peer) {
          // pushReplyReturn(returnTo);
        }
      }
      this.#message.selectPeer(peer, scrollTarget);
    }
  };

  #setStartToken = (bot: User.user, token?: string) => {
    this.#getTokenSubject(bot, this.#botStartTokens).next(token);
  };

  #setStartGroupToken = (bot: User.user, token?: string) => {
    this.#getTokenSubject(bot, this.#botStartGroupTokens).next(token);
  };

  getStartToken = (bot: User.user) => this
    .#getTokenSubject(bot, this.#botStartTokens);

  getStartGroupToken = (bot: User.user) => this
    .#getTokenSubject(bot, this.#botStartGroupTokens);

  #getTokenSubject = (bot: User.user, map: Map<number, BehaviorSubject<string | undefined>>) => {
    let tokenSubject = map.get(bot.id);
    if (!tokenSubject) {
      tokenSubject = new BehaviorSubject(undefined);
      map.set(bot.id, tokenSubject);
    }
    return tokenSubject;
  };

  #resolveUserId = (match: RegExpMatchArray) => {
    const id = +match[1];
    this.#message.selectPeer({ _: 'peerUser', user_id: id });
    return true;
  };

  #resolvePrivatePost = (match: RegExpMatchArray) => {
    const params = new URLSearchParams(match[1]);
    const channelId = +params.get('channel')!;
    const msgId = +params.get('post')!;
    this.#message.selectPeer({ _: 'peerChannel', channel_id: channelId }, msgId);
    return true;
  };

  #localUrlHandlers: UrlHandler[] = [
    // [/^join\/?\?invite=([a-zA-Z0-9._-]+)(&|$)/, joinGroupByHash],
    // [/^addstickers\/?\?set=([a-zA-Z0-9._]+)(&|$)/, showStickerSet],
    // [/^addtheme\/?\?slug=([a-zA-Z0-9._]+)(&|$)/, showTheme],
    // [/^setlanguage\/?(\?lang=([a-zA-Z0-9._-]+))?(&|$)/, setLanguage],
    // [/^msg_url\/?\?(.+)(#|$)/, shareUrl],
    // [/^confirmphone\/?\?(.+)(#|$)/, confirmPhone],
    // [/^share_game_score\/?\?(.+)(#|$)/, shareGameScore],
    // [/^socks\/?\?(.+)(#|$)/, applySocksProxy],
    // [/^proxy\/?\?(.+)(#|$)/, applyMtprotoProxy],
    // [/^passport\/?\?(.+)(#|$)/, showPassport],
    // [/^bg\/?\?(.+)(#|$)/, showWallPaper],
    [/^resolve\/?\?(.+)(#|$)/, this.#resolveUsername],
    [/^privatepost\/?\?(.+)(#|$)/, this.#resolvePrivatePost],
    // [/^settings(\/folders|\/devices|\/language)?$/, resolveSettings],
    // [/^([^?]+)(\?|#|$)/, handleUnknown],
  ];

  #internalUrlHandlers: UrlHandler[] = [
    // [/^media_timestamp\/?\?base=([a-zA-Z0-9._-]+)&t=(\d+)(&|$)/, openMediaTimestamp],
    [/^user-id\/\/([0-9]+)(&|$)/, this.#resolveUserId],
  ];

  private openCustomUrl(protocol: string, handlers: UrlHandler[], url: string, context: any) {
    const urlTrimmed = url.trim();
    if (!urlTrimmed.startsWith(protocol)) {
      return false;
    }
    const command = urlTrimmed.substr(protocol.length, 8192);
    for (let i = 0; i < handlers.length; i++) {
      const handler = handlers[i];
      const match = command.match(handlers[i][0]);
      if (match) {
        return handler[1](match, context);
      }
    }
    return false;
  }

  private openLocalUrl(url: string, context: any) {
    return this.openCustomUrl('tg://', this.#localUrlHandlers, url, context);
  }

  private openInternalUrl(url: string, context: any) {
    return this.openCustomUrl('internal:', this.#internalUrlHandlers, url, context);
  }

  private openUrl(url: string) {
    // Safe attributes: https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
    window.open(url, '_blank', 'noopener noreferrer');
  }

  urlClickHandler = (url: string, context?: any) => {
    const local = tryConvertUrlToLocal(url);

    if (local.startsWith('tg://')) {
      this.openLocalUrl(local, context);
      return true;
    }

    if (local.startsWith('internal:')) {
      this.openInternalUrl(local, context);
      return true;
    }

    this.openUrl(url);
    return true;
  };

  hiddenUrlClickHandler = (url: string, context?: any) => {
    const local = tryConvertUrlToLocal(url);

    const open = this.urlClickHandler.bind(this, local, context);
    if (local.startsWith('tg://') || local.startsWith('internal:')) {
      open();
    } else if (urlRequiresConfirmation(local)) {
      this.#main.showPopup(
        'confirmation',
        {
          body: `Open this link?\n\n${local}`,
          title: 'Open',
          confirmCallback: open,
        },
      );
    } else {
      open();
    }
  };
}
