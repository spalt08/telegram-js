import { div } from 'core/html';
import { listen, listenOnce } from 'core/dom';
import { smile, animals, recent, sport, lamp, flag, eats, car } from 'components/icons';
import { VirtualizedList } from 'components/ui';
import emojiCategory, { categories } from './category';
import './panel.scss';

const categoryIcons: Record<string, SVGSVGElement> = {
  people: smile(),
  nature: animals(),
  foods: eats(),
  activity: car(),
  places: sport(),
  objects: lamp(),
  flags: flag(),
};

export default function emojiPanel() {
  const categoryList = new VirtualizedList({
    className: 'emoji-panel__content',
    items: categories,
    compare: (a: string, b: string) => categories.indexOf(a) > categories.indexOf(b),
    renderer: (key: string) => emojiCategory(key),
    batch: 1,
    threshold: 1,
  });

  const recentIcon = div`.emoji-panel__tab`(recent());

  const icons = categories.map<Node>((key: string) => {
    const icon = div`.emoji-panel__tab`(categoryIcons[key]);

    listen(icon, 'click', () => {
      categoryList.focus(key);
    });

    return icon;
  });

  const container = div`.emoji-panel`(
    categoryList.wrapper,
    div`.emoji-panel__tabs`(
      recentIcon,
      ...icons,
    ),
  );

  listenOnce(container, 'transitionend', () => {
    categoryList.updateHeigths(true);
  });
  return container;
}
