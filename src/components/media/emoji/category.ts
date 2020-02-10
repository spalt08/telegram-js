import { text, div } from 'core/html';
import emoji from './emoji';
import data from './categories.json';
import './category.scss';

const categoryItems = data as Record<string, string[]>;
const titles: Record<string, string> = {
  people: 'Smileys & People',
  nature: 'Animals & Nature',
  foods: 'Food & Drink',
  activity: 'Activity',
  places: 'Travel & Places',
  objects: 'Objects & Symbols',
  flags: 'Flags',
};

export const categories = Object.keys(titles);

/**
 * Emoji category
 */
export default function emojiCategory(key: string, onSelect?: (emoji: string) => void) {
  if (!categoryItems[key]) throw new Error(`Unknown emoji category: ${key}`);

  return (
    div`.emoji-category`(
      div`.emoji-category__title`(text(titles[key])),
      div`.emoji-category__items`(
        ...categoryItems[key].map((emojiCode: string) => div`.emoji-category__item`(emoji(emojiCode, onSelect))),
      ),
    )
  );
}
