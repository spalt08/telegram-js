import { div, img, nothing, text } from 'core/html';
import { MessageCommon, PhotoNotEmpty } from 'cache/types';
import './photo.scss';
import media from 'client/media';
import { getSizeType, getPhotoLocation } from 'helpers/photo';
import { listen, listenOnce } from 'core/dom';
import { getInterface, hasInterface } from 'core/hooks';
import { close } from 'components/icons';
import { profileAvatar, profileTitle } from 'components/profile';
import { datetime } from 'components/ui';
import { PopupInterface } from '../interface';

type Props = {
  rect: DOMRect,
  photo: PhotoNotEmpty,
  message: MessageCommon,
};

const PHOTO_THUMBNAIL_MAX = 320;

/**
 * Media photo popup handler
 */
export default function photoPopup({ rect, photo, message }: Props) {
  const type = getSizeType(photo.sizes, PHOTO_THUMBNAIL_MAX);
  const location = getPhotoLocation(photo, type);
  const src = media.cached(location);

  const closeEl = close({ className: 'photofull_close' });
  const image = img`.photofull_photo`({ src, style: { opacity: '0' } });
  const header = div`.photofull_header`(
    div`.photofull_author`(
      profileAvatar({ _: 'peerUser', user_id: message.from_id }),
      div`.photofull_author-details`(
        profileTitle({ _: 'peerUser', user_id: message.from_id }),
        div`.photofull_author-date`(
          datetime({ timestamp: message.date, full: true }),
        ),
      ),
    ),
    closeEl,
  );
  const footer = message.message ? div`.photofull_footer`(
    div`.photofull_message`(text(message.message)),
  ) : undefined;

  const element = div`.popup.fullscreen`(
    header,
    image,
    footer || nothing,
  );

  listen(image, 'load', () => {
    const next = image.getBoundingClientRect();
    const dx = rect.left - next.left;
    const dy = rect.top - next.top;
    const scale = rect.width / next.width;

    image.style.transformOrigin = 'top left';
    image.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

    listenOnce(image, 'transitionend', () => {
      image.classList.remove('transition');
      image.style.transformOrigin = '';
    });

    requestAnimationFrame(() => {
      image.classList.add('transition');
      image.style.transform = '';
      image.style.opacity = '';
    });
  });

  listen(element, 'click', () => {
    const current = image.getBoundingClientRect();
    const dx = Math.round(rect.left - current.left);
    const dy = Math.round(rect.top - current.top);
    const dscale = rect.width / current.width - 1;

    if (hasInterface<PopupInterface>(element.parentElement)) {
      getInterface(element.parentElement).fade();
      header.classList.add('closing');
      if (footer) footer.classList.add('closing');
    }


    const duration = 200;
    let start: number | undefined;

    const animateClose = (timestamp: number) => {
      if (!start) start = timestamp;

      const progress = timestamp - start;
      const percentage = Math.min(1, progress / duration);

      if (percentage > 0) {
        const scale = 1 + dscale * percentage;
        image.style.transform = `translate(${dx * percentage}px, ${dy * percentage}px) scale(${scale})`;
      }

      if (percentage < 1) {
        requestAnimationFrame(animateClose);
      } else if (hasInterface<PopupInterface>(element.parentElement)) {
        getInterface(element.parentElement).close();
      }
    };

    requestAnimationFrame(animateClose);
  });

  return element;
}
