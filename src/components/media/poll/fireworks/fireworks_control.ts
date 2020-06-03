/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { useInterface, useWhileMounted } from 'core/hooks';
import { canvas } from 'core/html';
import Fireworks from './fireforks';
import './fireworks_control.scss';

export default function fireworksControl() {
  const canvasEl = canvas`.fireworksControl`();
  let parentNode: Element;

  const onResize = () => {
    canvasEl.setAttribute('width', (parentNode.clientWidth).toString());
    canvasEl.setAttribute('height', (parentNode.clientHeight).toString());
  };

  const attachToParent = () => {
    parentNode = <Element>canvasEl.parentNode;
    if (!parentNode) return;

    canvasEl.setAttribute('width', (parentNode.clientWidth).toString());
    canvasEl.setAttribute('height', (parentNode.clientHeight).toString());
    window.addEventListener('resize', onResize);
  };

  const detachFromParent = () => {
    window.removeEventListener('resize', onResize);
  };

  useWhileMounted(canvasEl, () => {
    attachToParent();
    return detachFromParent;
  });

  const start = () => {
    const ctx = canvasEl.getContext('2d');
    const fireworks = new Fireworks(ctx);
    fireworks.start();
  };

  return useInterface(canvasEl, { start });
}
