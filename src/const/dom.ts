// Safe attributes: https://www.jitbit.com/alexblog/256-targetblank---the-most-underestimated-vulnerability-ever/
export const newWindowLinkAttributes: Partial<HTMLAnchorElement> = {
  target: '_blank',
  rel: 'noopener noreferrer',
};

export const enum KeyboardKeys {
  TAB = 9,
  ENTER = 13,
  ESC = 27,
  ARROW_UP = 38,
  ARROW_DOWN = 40,
}
