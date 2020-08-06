import { div } from 'core/html';
import { listen } from 'core/dom';
import * as icons from 'components/icons';
import { VirtualizedList } from 'components/ui';
import { useInterface } from 'core/hooks';
import emojiCategory, { categories } from './category';
import './panel.scss';

const categoryIcons: Record<string, SVGSVGElement> = {
  people: icons.smile({ className: 'emoji-panel__icon -active' }),
  nature: icons.animals({ className: 'emoji-panel__icon' }),
  foods: icons.eats({ className: 'emoji-panel__icon' }),
  activity: icons.car({ className: 'emoji-panel__icon' }),
  places: icons.sport({ className: 'emoji-panel__icon' }),
  objects: icons.lamp({ className: 'emoji-panel__icon' }),
  flags: icons.flag({ className: 'emoji-panel__icon' }),
};

export default function emojiPanel(onSelect?: (emoji: string) => void) {
  let active: string = '';

  const onTrace = (nextActive?: string) => {
    if (nextActive && active !== nextActive) {
      if (active) categoryIcons[active].classList.remove('-active');
      categoryIcons[nextActive].classList.add('-active');
      active = nextActive;
    }
  };

  const categoryList = new VirtualizedList({
    className: 'emoji-panel__content',
    items: categories,
    pivotBottom: false,
    renderer: (key: string) => emojiCategory(key, onSelect),
    batch: 1,
    batchService: 1,
    threshold: 1,
    onTrace,
    topReached: true,
  });

  const recentIcon = div`.emoji-panel__tab`(icons.recent({ className: 'emoji-panel__icon' }));

  const ic = categories.map<Node>((key: string) => {
    const icon = div`.emoji-panel__tab`(categoryIcons[key]);

    listen(icon, 'click', () => {
      categoryList.focus(key);
    });

    return icon;
  });

  const container = div`.emoji-panel`(
    div`.emoji-panel__tabs`(
      recentIcon,
      ...ic,
    ),
    categoryList.container,
  );

  return container;
}
