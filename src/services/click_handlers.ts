import { main } from 'services';
import { internalUrlHandlers, localUrlHandlers, UrlHandler } from './url_handlers';

export function urlRequiresConfirmation(url: string) {
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

export function showConfirmation(body: string, title: string | undefined, confirmCallback: () => void) {
  main.showPopup('confirmation', { body, title, confirmCallback });
}

export function hiddenUrlClickHandler(url: string, context?: any) {
  // eslint-disable-next-line no-param-reassign
  url = tryConvertUrlToLocal(url);

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const open = urlClickHandler.bind(null, url, context);
  if (url.startsWith('tg://') || url.startsWith('internal:')) {
    open();
  } else if (urlRequiresConfirmation(url)) {
    showConfirmation(`Open this link?\n\n${url}`, 'Open', () => { open(); });
  } else {
    open();
  }
}

function openCustomUrl(protocol: string, handlers: UrlHandler[], url: string, context: any) {
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

function openLocalUrl(url: string, context: any) {
  return openCustomUrl('tg://', localUrlHandlers, url, context);
}

function openInternalUrl(url: string, context: any) {
  return openCustomUrl('internal:', internalUrlHandlers, url, context);
}

function openUrl(url: string) {
  // Safe attributes: https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
  window.open(url, '_blank', 'noopener noreferrer');
}

export function urlClickHandler(url: string, context?: any) {
  const local = tryConvertUrlToLocal(url);

  if (local.startsWith('tg://')) {
    openLocalUrl(local, context);
    return true;
  }

  if (local.startsWith('internal:')) {
    openInternalUrl(local, context);
    return true;
  }

  openUrl(url);
  return true;
}
