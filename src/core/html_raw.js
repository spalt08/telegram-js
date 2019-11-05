// @flow

function rawElementFactory<T>(tag: string) {
  return (strings: Array<string>, ...values: Array<string>): any => {
    let className = strings[0].slice(1).split('.');
    className = (values && values[0]) ? className.concat(values).join(' ') : className.join(' ');

    const el = document.createElement(tag);
    el.className = className;

    return el;
  };
}

export const div = rawElementFactory<HTMLDivElement>('div');
export const span = rawElementFactory<HTMLDivElement>('span');
