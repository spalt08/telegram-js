import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { div } from 'core/html';
import { listenOnce, unmount, mount, animationFrameStart } from 'core/dom';
import { useInterface, getInterface, useMaybeObservable } from 'core/hooks';
import { MaybeObservable } from 'core/types';
import simpleList from '../simple_list';
import tabHeader, { TabBadge } from './tab_header';
import './tabs.scss';

export interface TabItem {
  key: string;
  title: MaybeObservable<string>;
  badge?: MaybeObservable<TabBadge | undefined>;
  // Warning: the function isn't recalled when changed
  content: () => HTMLElement;
}

interface TabMeta {
  factory: () => HTMLElement;
  content?: HTMLElement;
  index: number;
}

type Props = {
  className?: string,
  headerAlign?: 'center' | 'space-between' | 'stretch',
  hideHeader?: MaybeObservable<boolean>,
};

export default function tabsPanel({ className = '', headerAlign = 'center', hideHeader }: Props, tabs: MaybeObservable<TabItem[]>) {
  let tabsMeta: Record<string, TabMeta> = {};
  const selected = new BehaviorSubject<string | undefined>(undefined);
  let isLocked = false;
  let change: (key: keyof any) => void;

  const tabsHeader = simpleList<TabItem, ReturnType<typeof tabHeader>>({
    items: tabs,
    getItemKey: (tab) => tab.key,
    render: (tab) => tabHeader(
      tab.title,
      tab.badge,
      selected.pipe(map((key) => tab.key === key), distinctUntilChanged()),
      () => change(tab.key),
    ),
    update: (tabNode, tabData) => {
      const tabControl = getInterface(tabNode);
      tabControl.setTitle(tabData.title);
      tabControl.setBadge(tabData.badge);
    },
    props: {
      className: `tabs-panel__header -${headerAlign}`,
    },
  });
  const contentEl = div`.tabs-panel__container`();
  const container = div`.tabs-panel${className}`(contentEl);

  change = (nextSelected: string) => {
    if (isLocked) return;
    if (selected.value === nextSelected) return;
    if (!tabsMeta[nextSelected]) return;

    isLocked = true;

    const removingTabMeta = tabsMeta[selected.value!];
    const appearingTabMeta = tabsMeta[nextSelected];
    const removingIndex = removingTabMeta.index;
    const appearingIndex = appearingTabMeta.index;
    const removingEl = removingTabMeta.content;
    const appearingEl = appearingTabMeta.content = appearingTabMeta.content || appearingTabMeta.factory();

    const direction = removingIndex > appearingIndex ? 'right' : 'left';

    selected.next(nextSelected);

    appearingEl.classList.add(`appearing-${direction}`);

    if (removingEl) {
      removingEl.classList.add(`removing-${direction}`);

      listenOnce(removingEl, 'transitionend', async () => {
        await animationFrameStart();
        unmount(removingEl);
        removingEl.classList.remove(`removing-${direction}`);
        appearingEl.classList.remove(`appearing-${direction}`);
        isLocked = false;
      });
    } else {
      isLocked = false;
    }

    mount(contentEl, appearingEl);
  };

  useMaybeObservable(container, hideHeader, (isHidden) => {
    if (isHidden && tabsHeader.parentNode) {
      unmount(tabsHeader);
    }
    if (!isHidden && !tabsHeader.parentNode) {
      mount(container, tabsHeader, container.firstChild || undefined);
    }
  });

  useMaybeObservable(container, tabs, (newTabs) => {
    const newTabsMeta: Record<string, TabMeta> = {};

    newTabs.forEach((tab, index) => {
      newTabsMeta[tab.key] = {
        factory: tab.content,
        content: tabsMeta[tab.key]?.content,
        index,
      };
    });

    // Unselect the selected tab if it's removed
    if (selected.value !== undefined && !newTabsMeta[selected.value]) {
      selected.next(undefined);
    }

    // Remove removed tabs
    Object.keys(tabsMeta).forEach((key) => {
      if (!newTabsMeta[key]) {
        const { content } = tabsMeta[key];
        if (content) unmount(content);
        delete tabsMeta[key];
      }
    });

    // Switch a tab if no tab is selected
    if (selected.value === undefined && newTabs.length) {
      const { key } = newTabs[0];
      const tabMeta = newTabsMeta[key];
      selected.next(key);
      tabMeta.content = tabMeta.content || tabMeta.factory();
      mount(contentEl, tabMeta.content!);
    }

    tabsMeta = newTabsMeta;
  });

  return useInterface(container, {
    change,
  });
}
