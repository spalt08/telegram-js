import { div } from 'core/html';
import { listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import { smile, animals, recent, sport, lamp, flag, eats, car } from 'components/icons';
import { list } from 'components/ui';
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
  const categoryList = list({
    className: 'emoji-panel__content',
    items: categories,
    renderer: (key: string) => emojiCategory(key),
    batch: 9,
    threshold: 1,
  });

  const recentIcon = div`.emoji-panel__tab`(recent());

  const icons = categories.map<Node>((key: string) => {
    const icon = div`.emoji-panel__tab`(categoryIcons[key]);

    listen(icon, 'click', () => {
      getInterface(categoryList).focus(key);
    });

    return icon;
  });

  return (
    div`.emoji-panel`(
      categoryList,
      div`.emoji-panel__tabs`(
        recentIcon,
        ...icons,
      ),
    )
  );
}
