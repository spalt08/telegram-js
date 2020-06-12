import { MaybeObservable } from 'core/types';
import { useInterface, useMaybeObservable } from 'core/hooks';
import { listen, mount, unmount } from 'core/dom';
import { div, span, text } from 'core/html';
import './tabs.scss';

export default function tabHeader(
  title: MaybeObservable<string>,
  badge: MaybeObservable<string> = '',
  isActive: MaybeObservable<boolean>,
  onClick: () => void,
) {
  const titleNode = text('');
  let badgeEl: HTMLElement | undefined;
  const contentEl = div`.tabs-panel__tab_content`(titleNode);
  const container = div`.tabs-panel__tab`(contentEl);

  let releaseTitle: (() => void) | undefined;
  let releaseBadge: (() => void) | undefined;

  const setTitle = (newTitle: MaybeObservable<string>) => {
    if (releaseTitle) releaseTitle();
    releaseTitle = useMaybeObservable(container, newTitle, (titleString) => {
      titleNode.textContent = titleString;
    });
  };

  const setBadge = (newBadge: MaybeObservable<string>) => {
    if (releaseBadge) releaseBadge();
    releaseBadge = useMaybeObservable(container, newBadge, (badgeString) => {
      if (badgeString) {
        if (!badgeEl) {
          badgeEl = span`.tabs-panel__tab_badge`();
          mount(contentEl, badgeEl);
        }
        badgeEl.textContent = badgeString;
      } else if (badgeEl) {
        unmount(badgeEl);
        badgeEl = undefined;
      }
    });
  };

  useMaybeObservable(container, isActive, (value) => {
    container.classList.toggle('-active', value);
  });

  setTitle(title);
  setBadge(badge);

  listen(container, 'click', onClick);

  return useInterface(container, { setTitle, setBadge });
}
