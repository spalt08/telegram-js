import { div } from 'core/html';
import { listen } from 'core/dom';
import * as icons from 'components/icons';
import { VirtualizedList } from 'components/ui';
import { useInterface } from 'core/hooks';
import emojiCategory, { categories } from './category';
import './panel.scss';

const categoryIcons: Record<string, SVGSVGElement> = {
  people: icons.smile(),
  nature: icons.animals(),
  foods: icons.eats(),
  activity: icons.car(),
  places: icons.sport(),
  objects: icons.lamp(),
  flags: icons.flag(),
};

export default function emojiPanel(onSelect?: (emoji: string) => void) {
  let active: string = '';

  const onTrace = (nextActive?: string) => {
    if (nextActive && active !== nextActive) {
      if (active) categoryIcons[active].classList.remove('active');
      categoryIcons[nextActive].classList.add('active');
      active = nextActive;
    }
  };

  const categoryList = new VirtualizedList({
    className: 'emoji-panel__content',
    items: categories,
    pivotBottom: false,
    renderer: (key: string) => emojiCategory(key, onSelect),
    batch: 9,
    threshold: 1,
    onTrace,
  });

  const recentIcon = div`.emoji-panel__tab`(icons.recent());

  const ic = categories.map<Node>((key: string) => {
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
      ...ic,
    ),
  );

  return useInterface(container, {
    update() {
      categoryList.trace();
    },
  });
}
