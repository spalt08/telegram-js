/* eslint-disable no-param-reassign, import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, number, button } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';
import { withMountTrigger, fullscreen } from 'storybook/decorators';
import { div, text as textNode } from 'core/html';
import { BehaviorSubject } from 'rxjs';
import list, { VirtualizedList } from './list';

const items = new BehaviorSubject<readonly string[]>([]);

function shuffle(a: any[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function align(count: number) {
  if (count > items.value.length) {
    const next = items.value.slice(0) as string[];
    for (let i = next.length; i < count; i++) next.push(i.toString());
    items.next(next);
  }

  if (count < items.value.length) {
    items.next(items.value.slice(0, count));
  }
}

const stories = storiesOf('Layout | UI Elements / List 5', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(fullscreen);

const renderer = (id: string) => div`.demoListRow${`item${+id % 6}`}`(textNode(`Item #${+id + 1}`));
const selectGroup = (index: string) => Math.floor(+index / 10).toString();
const renderGroup = (index: string) => div`.demoListGroup`(div`.demoListGroup__header`(textNode(index)));

const listTop = new VirtualizedList({ items, renderer, highlightFocused: true });
const listGrouped = list({ items, renderer, renderGroup, selectGroup, groupPadding: 20 });
const listBottom = list({ items, renderer, renderGroup, selectGroup, groupPadding: 20, pivotBottom: true });

stories.add('Common', () => {
  align(number('Items', items.value.length || 500));
  button('Shuffle', () => items.next(shuffle(items.value.slice(0))));

  const scrollIndex = number('Focus #', 50);
  button('Scroll', () => listTop.focus(items.value[scrollIndex]));

  listTop.cfg.onTrace = action('trace');
  return listTop.container;
});

stories.add('Groupped', () => {
  align(number('Items', items.value.length || 500));
  button('Shuffle', () => items.next(shuffle(items.value.slice(0))));

  return listGrouped;
});

stories.add('Bottom Pivot', () => {
  align(number('Items', items.value.length || 100));
  button('Shuffle', () => items.next(shuffle(items.value.slice(0))));

  return listBottom;
});
