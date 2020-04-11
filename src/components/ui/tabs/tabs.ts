import { div, text } from 'core/html';
import { listenOnce, unmount, mount } from 'core/dom';
import { useInterface, hasInterface, getInterface } from 'core/hooks';
import ripple from '../ripple/ripple';
import './tabs.scss';

interface TabsInterface {
  shouldRemove(): void,
  didAppear(): void,
}

type TabsItems = Record<string, HTMLElement>;
type Props = {
  className?: string,
  headerAlign?: 'center' | 'space-between' | 'stretch';
};

export default function tabsPanel({ className = '', headerAlign = 'center' }: Props, tabs: TabsItems) {
  const tabsIndexes = Object.keys(tabs);

  let selected = 0;
  let isLocked = false;

  const tabsEl: HTMLElement[] = [];
  let change: (index: number) => void;

  for (let i = 0; i < tabsIndexes.length; i += 1) {
    // The ripple here gives rendering glitches in Safari. Also is slows the UI in the stimoji panel.
    tabsEl[i] = ripple({
      className: 'tabs-panel__tab',
      contentClass: 'tabs-panel__tab_content',
      onClick: () => change(i), // eslint-disable-line no-loop-func
    }, [
      text(tabsIndexes[i]),
    ]);
  }

  const contentEl = div`.tabs-panel__container`(tabs[tabsIndexes[selected]]);
  const container = div`.tabs-panel${className}`(
    div`.tabs-panel__header ${`-${headerAlign}`}`(...tabsEl),
    contentEl,
  );

  tabsEl[selected].classList.add('-active');

  change = (nextSelected: number) => {
    if (isLocked) return;
    if (selected === nextSelected) return;

    isLocked = true;

    const removingEl = tabs[tabsIndexes[selected]];
    const appearingEl = tabs[tabsIndexes[nextSelected]];

    let direction = 'left';
    if (nextSelected < selected) direction = 'right';

    // trigger interface if exists
    if (hasInterface<TabsInterface>(removingEl) && getInterface(removingEl).shouldRemove) getInterface(removingEl).shouldRemove();

    tabsEl[selected].classList.remove('-active');
    tabsEl[nextSelected].classList.add('-active');

    appearingEl.classList.add(`appearing-${direction}`);
    removingEl.classList.add(`removing-${direction}`);

    selected = nextSelected;

    listenOnce(removingEl, 'transitionend', () => {
      unmount(removingEl);
      removingEl.classList.remove(`removing-${direction}`);
      appearingEl.classList.remove(`appearing-${direction}`);
      isLocked = false;

      // trigger interface if exists
      if (hasInterface<TabsInterface>(appearingEl) && getInterface(appearingEl).didAppear) getInterface(appearingEl).didAppear();
    });

    mount(contentEl, appearingEl);
  };

  return useInterface(container, {
    change,
  });
}
