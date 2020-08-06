import { WebPage } from 'mtproto-js';
import { nothing, div, text } from 'core/html';
import photo from 'components/media/photo/photo';
import './preview.scss';
import { mount } from 'core/dom';

export default function webpagePreview(webpage: WebPage, className?: string) {
  if (webpage._ === 'webPageEmpty') return nothing;
  if (webpage._ === 'webPagePending') return nothing;
  if (webpage._ === 'webPageNotModified') return nothing;

  // let photo: HTMLElement | Node = nothing;

  // if (webpage.photo && webpage.photo._ === 'photo') {
  //   photo = div`.webpage-preview__photo`(photoPreview(webpage.photo));
  // }

  const header = div`.webpage-preview__header`(text(webpage.site_name || ''));
  const title = div`.webpage-preview__title`(text(webpage.title || ''));
  const description = text(webpage.description || '');
  const content = div`.webpage-preview__content`(header, title, description);

  if (webpage._ === 'webPage' && webpage.photo?._ === 'photo') {
    switch (webpage.type) {
      case 'photo':
      case 'video': {
        const photoEl = div`.webpage-preview__photo`(
          photo(webpage.photo, { fit: 'contain', width: 320, height: 320, showLoader: false }),
        );
        mount(content, photoEl, header);

        break;
      }

      default: {
        const photoEl = div`.webpage-preview__photo.small`(
          photo(webpage.photo, { fit: 'cover', width: 60, height: 60, showLoader: false }),
        );
        mount(content, photoEl, header);
        mount(content, div({ style: { clear: 'both' } }));
      }
    }
  }

  return div`.webpage-preview${`webtype-${webpage.type}`}${className}`(
    content,
  );
}
