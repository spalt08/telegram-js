import { Message, WebPage } from 'cache/types';
import { div, text, a, nothing } from 'core/html';
import { newWindowLinkAttributes } from 'const';
import { ripple } from 'components/ui';
import { textToColorCode } from 'cache/accessors';
import photoRenderer from '../photo/photo';
import './webpage_link.scss';

function emptyPhotoPlaceholder(webpage: WebPage) {
  if (webpage._ === 'webPage' && webpage.site_name) {
    const colorClass = `color-${textToColorCode(webpage.site_name)}`;
    return div`.webpageLink__emptyphoto ${colorClass}`(text(webpage.site_name[0].toUpperCase()));
  }

  return nothing;
}

export default function webpageLink(msg?: Message) {
  if (msg?._ !== 'message' || msg.media?._ !== 'messageMediaWebPage' || msg.media.webpage._ !== 'webPage') {
    return div(); // todo: render messages without webPage media
  }

  return ripple({ tag: 'div' },
    [
      div`.webpageLink`(
        div`.webpageLink__photo`(
          msg.media.webpage.photo
            ? photoRenderer(msg.media.webpage.photo, { width: 40, height: 40, fit: 'cover', thumb: true, showLoader: false })
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
