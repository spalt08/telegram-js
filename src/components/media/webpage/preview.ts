import { WebPage } from 'cache/types';
import { nothing, div, text } from 'core/html';
import photo from 'components/media/photo/photo';
import './preview.scss';
import { mount } from 'core/dom';

export default function webpagePreview(webpage: WebPage) {
  if (webpage._ === 'webPageEmpty') return nothing;
  if (webpage._ === 'webPagePending') return nothing;
  if (webpage._ === 'webPageNotModified') return nothing;

  // let photo: HTMLElement | Node = nothing;

  // if (webpage.photo && webpage.photo._ === 'photo') {
  //   photo = div`.webpage-preview__photo`(photoPreview(webpage.photo));
  // }

  const title = div`.webpage-preview__title`(text(webpage.title || ''));
  const description = text(webpage.description || '');
  const content = div`.webpage-preview__content`(title, description);

  if (webpage._ === 'webPage' && webpage.photo?._ === 'photo') {
    switch (webpage.type) {
      case 'photo':
      case 'video': {
        const photoEl = div`.webpage-preview__photo`(photo(webpage.photo, { fit: 'contain', width: 320, height: 320, showLoader: false }));
        mount(content, photoEl);

        break;
      }

      default: {
        const photoEl = div`.webpage-preview__photo.small`(photo(webpage.photo, { fit: 'cover', width: 60, height: 60, showLoader: false }));
        mount(content, photoEl, title);
        mount(content, div({ style: { clear: 'both' } }));
      }
    }
  }

  const element = div`.webpage-preview`(
    div`.webpage-preview__header`(text(webpage.site_name || '')),
    content,
  );

  element.classList.add(`webtype-${webpage.type}`);

  return element;
}
