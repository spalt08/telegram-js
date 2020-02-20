import { WebPage, Message } from 'cache/types';
import { div, text, a, nothing } from 'core/html';
import { newWindowLinkAttributes } from 'const';
import { ripple, formattedMessage } from 'components/ui';
import { messageToSenderPeer, textToColorCode } from 'cache/accessors';
import { profileAvatar, profileTitle } from 'components/profile';
import photoRenderer from '../photo/photo';
import './webpage_link.scss';

function emptyPhotoPlaceholder(webpage: WebPage) {
  if (webpage._ === 'webPage' && webpage.site_name) {
    const colorClass = `color-${textToColorCode(webpage.site_name)}`;
    return div`.webpageLink__emptyphoto ${colorClass}`(text(webpage.site_name[0].toUpperCase()));
  }

  return nothing;
}

export default function webpageLink(msg: Message.message) {
  if (msg.media?._ !== 'messageMediaWebPage' || msg.media.webpage._ !== 'webPage') {
    const senderPeer = messageToSenderPeer(msg);
    return ripple({ tag: 'div' },
      [
        div`.webpageLink`(
          div`.webpageLink__photo`(profileAvatar(senderPeer, msg)),
          div`.webpageLink__info`(
            div`.webpageLink__title`(profileTitle(senderPeer)),
            div`.webpageLink__message-text`(formattedMessage(msg)),
          ),
        ),
      ],
    );
  }

  return ripple({ tag: 'div' },
    [
      div`.webpageLink`(
        div`.webpageLink__photo`(
          msg.media.webpage.photo && msg.media.webpage.photo._ === 'photo'
            ? photoRenderer(msg.media.webpage.photo, { width: 50, height: 50, fit: 'cover', thumb: true, showLoader: false })
            : emptyPhotoPlaceholder(msg.media.webpage)),
        div`.webpageLink__info`(
          div`.webpageLink__title`(text(msg.media.webpage.title ?? '')),
          div`.webpageLink__description`(text(msg.media.webpage.description ?? '')),
          div`.webpageLink__link`(a({ ...newWindowLinkAttributes, href: msg.media.webpage.url ?? '#' }, text(msg.media.webpage.display_url ?? ''))),
        ),
      ),
    ],
  );
}
