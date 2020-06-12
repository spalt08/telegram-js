import { MaybeObservable } from 'core/types';
import { useInterface, useMaybeObservable } from 'core/hooks';
import { listen, mount, unmount } from 'core/dom';
import { div, span, text } from 'core/html';
import './tabs.scss';

export interface TabBadge {
  text: string;
  highlight?: boolean;
}

export default function tabHeader(
  title: MaybeObservable<string>,
  badge: MaybeObservable<TabBadge | undefined>,
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

  const setBadge = (newBadge: MaybeObservable<TabBadge | undefined>) => {
    if (releaseBadge) releaseBadge();
    releaseBadge = useMaybeObservable(container, newBadge, (newBadgeData) => {
      if (newBadgeData) {
        if (!badgeEl) {
          badgeEl = span`.tabs-panel__tab_badge`();
          mount(contentEl, badgeEl);
        }
        badgeEl.textContent = newBadgeData.text;
        badgeEl.classList.toggle('-highlight', !!newBadgeData.highlight);
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
