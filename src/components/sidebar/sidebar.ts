/* eslint-disable import/no-cycle */
import { div } from 'core/html';
import { mount } from 'core/dom';
import wrapper from './wrapper/wrapper';
import dialogs from './dialogs/dialogs';
import settings from './settings/settings';
import newGroup from './new_group/new_group';
import contacts from './contacts_list/contacts_list';
import './sidebar.scss';

const elements = {
  left: {
    dialogs,
    settings,
    newGroup,
    contacts,
  },
};

type SidebarRendererMap = typeof elements;
type SidebarType = keyof SidebarRendererMap;
type SidebarState<K extends SidebarType> = keyof SidebarRendererMap[K];

type Props<T extends SidebarType> = {
  kind: T,
  initial: SidebarState<'left'>,
  className?: string,
};

export type SidebarComponentProps = {
  onNavigate?: (state: SidebarState<SidebarType>) => void;
  onBack?: () => void;
};

export type SidebarComponent = (props: SidebarComponentProps) => void;

/**
 * Class For Managing Sidebar State
 */
export default function sidebar<T extends SidebarType>({ kind, initial, className }: Props<T>) {
  const container = div`.sidebar${className}`();
  const stack: HTMLElement[] = [];

  const popState = () => {
    let element = stack.pop();

    if (element) {
      container.classList.add('-poping-state');

      element.ontransitionend = () => {
        container.classList.remove('-poping-state');
        element!.ontransitionend = null;
        element!.remove();
        element = undefined;
      };
    }
  };

  const pushState = (state: SidebarState<'left'>) => {
    const element = wrapper(
      elements[kind][state]({
        onNavigate: pushState,
        onBack: popState,
      }),
    );

    mount(container, element);
    stack.push(element);
  };

  pushState(initial);

  return container;
}
