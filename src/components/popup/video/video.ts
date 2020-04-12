import { div, nothing, text } from 'core/html';
import { Message, Peer, Document } from 'mtproto-js';
import { listen, mount } from 'core/dom';
import { getInterface, hasInterface, useListenWhileMounted } from 'core/hooks';
import { close } from 'components/icons';
import { profileAvatar, profileTitle } from 'components/profile';
import { datetime } from 'components/ui';
import { main } from 'services';
import { KeyboardKeys } from 'const';
import videoRenderer from 'components/media/video/video';
import { getAttributeVideo } from 'helpers/files';
import { PopupInterface } from '../interface';

type Props = {
  rect: DOMRect,
  video: Document.document,
  peer?: Peer,
  message?: Message.message,
};

const ease = (t: number) => t * (2 - t);

/**
 * Media video popup handler
 */
export default function videoPopup({ rect, video, peer, message }: Props) {
  const videoAttribute = getAttributeVideo(video);

  if (!videoAttribute) return nothing;

  const closeEl = close({ className: 'photofull_close' });

  const header = div`.photofull_header`(
    div`.photofull_author`(
      peer ? profileAvatar(peer, undefined, false) : nothing,
      peer && message ? div`.photofull_author-details`(
        profileTitle(peer, false),
        div`.photofull_author-date`(
          datetime({ timestamp: message.date, full: true }),
        ),
      ) : nothing,
    ),
    closeEl,
  );

  const footer = message && message.message ? div`.photofull_footer`(
    div`.photofull_message`(text(message.message)),
  ) : undefined;

  const videoEl = videoRenderer(video, {
    fit: 'contain',
    width: Math.min(1200, window.innerWidth * 0.85),
    height: Math.max(100, window.innerHeight - 160),
    showLoader: false,
  }, true);

  if (!(videoEl instanceof HTMLElement)) return nothing;

  const width = parseInt(videoEl.style.width, 10);
  const height = parseInt(videoEl.style.height, 10);
  const top = (window.innerHeight - height) / 2;
  const left = (window.innerWidth - width) / 2;

  // const cachedSmall = cached(getPhotoLocation(photo, getSize(photo.sizes, options.width, options.height, options.fit)?.type));
  // if (cachedSmall && photoEl instanceof HTMLElement) getInterface(photoEl).setThumb(cachedSmall);

  const orientation = videoAttribute.w > videoAttribute.h ? 'landscape' : 'portrait';
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

  mount(transitionerEl, videoEl);

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
