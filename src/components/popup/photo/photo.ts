import { div, nothing, text } from 'core/html';
import { Message, Peer, Photo } from 'mtproto-js';
import { cached } from 'client/media';
import { getPhotoLocation, getOrientation, getSize } from 'helpers/photo';
import { listen, mount } from 'core/dom';
import { getInterface, hasInterface, useListenWhileMounted } from 'core/hooks';
import { close } from 'components/icons';
import { profileAvatar, profileTitle } from 'components/profile';
import photoRenderer from 'components/media/photo/photo';
import { datetime } from 'components/ui';
import { main } from 'services';
import { KeyboardKeys } from 'const';
import { PhotoOptions } from 'helpers/other';
import { PopupInterface } from '../interface';
import './photo.scss';

type Props = {
  rect: DOMRect,
  photo: Photo.photo,
  peer: Peer,
  message: Message.message,
  options: PhotoOptions,
};

const ease = (t: number) => t * (2 - t);

/**
 * Media photo popup handler
 */
export default function photoPopup({ rect, options, photo, peer, message }: Props) {
  const closeEl = close({ className: 'photofull_close' });

  const header = div`.photofull_header`(
    div`.photofull_author`(
      profileAvatar(peer, undefined, false),
      div`.photofull_author-details`(
        profileTitle(peer, false),
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

  const photoEl = photoRenderer(photo, {
    fit: 'contain',
    width: Math.min(1200, window.innerWidth * 0.85),
    height: Math.max(100, window.innerHeight - 160),
    showLoader: false,
  });

  if (!(photoEl instanceof HTMLElement)) return nothing;

  const width = parseInt(photoEl.style.width, 10);
  const height = parseInt(photoEl.style.height, 10);
  const top = (window.innerHeight - height) / 2;
  const left = (window.innerWidth - width) / 2;

  const cachedSmall = cached(getPhotoLocation(photo, getSize(photo.sizes, options.width, options.height, options.fit)?.type));
  if (cachedSmall && photoEl instanceof HTMLElement) getInterface(photoEl).setThumb(cachedSmall);

  const orientation = getOrientation(photo.sizes);
  const transitionerEl = div`.photofull_image${orientation}`();

  const dx = rect.left - left;
  const dy = rect.top - top;
  const dwidth = rect.width - width;
  const dheight = rect.height - height;

  transitionerEl.style.width = `${rect.width}px`;
  transitionerEl.style.height = `${rect.height}px`;
  transitionerEl.style.left = `${left}px`;
  transitionerEl.style.top = `${top}px`;
  transitionerEl.style.position = 'absolute';
  transitionerEl.style.transform = `translate(${dx}px, ${dy}px)`;

  mount(transitionerEl, photoEl);

  const element = div`.popup.fullscreen`(
    header,
    transitionerEl,
    footer || nothing,
  );

  let start: number | undefined;
  const duration = 200;

  let appeared = false;

  const animateApppear = (timestamp: number) => {
    if (!start) start = timestamp;

    const progress = timestamp - start;
    const percentage = ease(Math.min(1, progress / duration));

    if (percentage > 0) {
      transitionerEl.style.transform = `translate(${dx * (1 - percentage)}px, ${dy * (1 - percentage)}px)`;
      transitionerEl.style.width = `${rect.width - dwidth * percentage}px`;
      transitionerEl.style.height = `${rect.height - dheight * percentage}px`;
    }

    if (percentage < 1) {
      requestAnimationFrame(animateApppear);
    } else {
      appeared = true;
      start = undefined;
      // transitionerEl.style.top = '';
      // transitionerEl.style.left = '';
      // transitionerEl.style.transform = '';
      // transitionerEl.style.position = '';
    }
  };

  requestAnimationFrame(animateApppear);

  const remove = () => {
    if (hasInterface<PopupInterface>(element.parentElement)) {
      getInterface(element.parentElement).fade();

      header.classList.add('closing');
      if (footer) footer.classList.add('closing');

      const next = transitionerEl.getBoundingClientRect();
      const dx2 = rect.left - next.left;
      const dy2 = rect.top - next.top;
      const dwidth2 = rect.width - next.width;
      const dheight2 = rect.height - next.height;

      transitionerEl.style.width = `${next.width}px`;
      transitionerEl.style.height = `${next.height}px`;
      transitionerEl.style.left = `${next.left}px`;
      transitionerEl.style.top = `${next.top}px`;
      transitionerEl.style.position = 'absolute';

      let start2: number | undefined;

      const animateClose = (timestamp: number) => {
        if (!start2) start2 = timestamp;

        const progress = timestamp - start2;
        const percentage = ease(Math.min(1, progress / duration));
        if (percentage > 0) {
          transitionerEl.style.transform = `translate(${dx2 * percentage}px, ${dy2 * percentage}px)`;
          transitionerEl.style.width = `${next.width + dwidth2 * percentage}px`;
          transitionerEl.style.height = `${next.height + dheight2 * percentage}px`;
        }

        if (percentage < 1) {
          requestAnimationFrame(animateClose);
        } else {
          main.closePopup();
        }
      };

      requestAnimationFrame(animateClose);
    }
  };

  listen(closeEl, 'click', remove);

  useListenWhileMounted(element, window, 'keyup', (event: KeyboardEvent) => {
    if (event.keyCode === KeyboardKeys.ESC) {
      remove();
    }
  });

  useListenWhileMounted(element, window, 'click', (event: MouseEvent) => {
    if (!appeared) return;

    const erect = element.getBoundingClientRect();

    if (event.pageX < erect.left || event.pageX > erect.left + rect.width || event.pageY < rect.top || event.pageY > erect.top + erect.height) {
      remove();
    }
  });

  return element;
}
