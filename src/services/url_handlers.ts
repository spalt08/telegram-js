import { message } from 'services';
import { showAtProfileMsgId, showAtUnreadMsgId } from './message/message';

export type UrlHandler = [RegExp, (regExp: RegExpMatchArray, context: any) => boolean];

function validDomain(domain: string) {
  return /^[a-zA-Z0-9\\.\\_]+$/.test(domain);
};

function resolveUsername(match: RegExpMatchArray, context: any) {
  const params = new URLSearchParams(match[1]);
  const domain = params.get('domain')!;
  // if (domain == qsl('telegrampassport')) {
  //   return ShowPassportForm(params);
  // }
  if (!validDomain(domain)) {
    return false;
  }
  let start = 'start';
  let startToken = params.get(start);
  if (!startToken) {
    start = 'startgroup';
    startToken = params.get(start);
    if (!startToken) {
      start = '';
    }
  }
  let post: number = start === 'startgroup' ? showAtProfileMsgId : showAtUnreadMsgId;
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
  message.openPeerByName(
    domain,
    post,
    startToken,
    clickFromMessageId);
  return true;
}

export const localUrlHandlers: UrlHandler[] = [
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
  [/^resolve\/?\?(.+)(#|$)/, resolveUsername],
  // [/^privatepost\/?\?(.+)(#|$)/, resolvePrivatePost],
  // [/^settings(\/folders|\/devices|\/language)?$/, resolveSettings],
  // [/^([^?]+)(\?|#|$)/, handleUnknown],
];

export const internalUrlHandlers: UrlHandler[] = [
  // [/^media_timestamp\/?\?base=([a-zA-Z0-9._-]+)&t=(\d+)(&|$)/, openMediaTimestamp],
];
