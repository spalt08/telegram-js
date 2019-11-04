// @flow

import Component from './component';
import { Mutatable } from './mutation';

function literalsToProps(strings: Array<string>, ...values: Array<any>) {
  // const props = {};
  // let parsedProp = '';
  // let v;

  const className = strings[0].slice(1).split('.');

  return { className: (values && values[0]) ? className.concat(values).join(' ') : className.join(' ') };

  // for (let i = 0; i < strings.length; i += 1) {
  //   // if (strings[i] === '') {
  //   //   if (parsedProp) {
  //   //     props[parsedProp] += (props[parsedProp] ? ' ' : '') + values[v++];
  //   //   } else {
  //   //     props[values[v++]] = true;
  //   //   }
  //   //   continue;
  //   // }

  //   // const tokens = strings[i].split(' ');

  //   // for (let j = 0; j < tokens.length; j += 1) {
  //   //   const token = tokens[i];

  //   //   if (token === '') continue;

  //   //   if (token === '"') {
  //   //     parsedProp = '';
  //   //     continue;
  //   //   }

  //   //   if (token.indexOf('=') === -1) {
  //   //     if (parsedProp) {
  //   //       props[parsedProp] += ` ${token}`;
  //   //     } else {
  //   //       props[token] = true;
  //   //     }
  //   //     continue;
  //   //   }

  //   //   const [key, value] = token.split('=');

  //   //   parsedProp = key;
  //   //   props[key] = value.replace('"', '').replace('"', '');
  //   // }
  // }

  // return props;
}

export default function ComponentFactory(tag: string) {
  return function ComponentFactoryWithTag(...args) {
    // Called as constructor
    // new div();
    if (this instanceof ComponentFactoryWithTag) {
      return new Component(tag);
    }

    // Called as Template Litteral
    // div`class="button"`
    if (args[0] && args[0].raw && Array.isArray(args[0])) {
      const props = literalsToProps(args[0], args.length > 1 ? args[1] : undefined);

      return function ChildrenFactory(...children) {
        if (this instanceof ChildrenFactory) return new Component(tag, props);
        return () => new Component(tag, props, children);
      };
    }

    // Called With Props
    // div({ props })
    if (args.length === 1 && typeof args[0] === 'object' && !(args[0] instanceof Mutatable)) {
      const props = args[0];

      return function ChildrenFactory(...children) {
        if (this instanceof ChildrenFactory) return new Component(tag, props);
        return () => new Component(tag, props, children);
      };
    }

    return () => new Component(tag, {}, args);
  };
}
