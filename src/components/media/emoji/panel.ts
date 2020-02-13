import { div } from 'core/html';
import { listen } from 'core/dom';
import { smile, animals, recent, sport, lamp, flag, eats, car } from 'components/icons';
import { VirtualizedList } from 'components/ui';
import { useInterface } from 'core/hooks';
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

export default function emojiPanel(onSelect?: (emoji: string) => void) {
  let active: string = '';

  const onFocus = (nextActive: string) => {
    if (active !== nextActive) {
      if (active) categoryIcons[active].classList.remove('active');
      categoryIcons[nextActive].classList.add('active');
      active = nextActive;
    }
  };

  const categoryList = new VirtualizedList({
    className: 'emoji-panel__content',
    items: categories,
    renderer: (key: string) => emojiCategory(key, onSelect),
    batch: 9,
    threshold: 1,
    onFocus,
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
    categoryList.container,
    div`.emoji-panel__tabs`(
      recentIcon,
      ...icons,
    ),
  );

  return useInterface(container, {
    update() {
      categoryList.updateHeigths(true);
      categoryList.updateOffsets();
      categoryList.updateTopElement();
    },
  });
}
