import { div } from 'core/html';
import { getInterface, useInterface } from 'core/hooks';
import { tgs } from 'components/ui';
import tracking from 'assets/monkey_tracking.tgs';
import closing from 'assets/monkey_closing.tgs';
import peeking from 'assets/monkey_peeking.tgs';
import './monkey.scss';

export default function monkey() {
  const monkeyTracking = tgs({ className: 'monkey__state', src: tracking });
  const monkeyClosing = tgs({ className: 'monkey__state hidden', src: closing });
  const monkeyPeeking = tgs({ className: 'monkey__state hidden', src: peeking });

  const element = div`.monkey`(
    monkeyTracking,
    monkeyClosing,
    monkeyPeeking,
  );

  const lookAtCode = (val: string) => {
    const frame = Math.min(20 + Math.floor((val.length / 20) * 120), 175);
    getInterface(monkeyTracking).goTo(frame);
  };

  const followCode = (val: string) => {
    lookAtCode(val);
  };

  const idleCode = (val: string) => {
    getInterface(monkeyTracking).goTo(val.length >= 5 ? 175 : 0, true);
  };

  const closeEyes = () => {
    monkeyTracking.classList.add('hidden');
    monkeyClosing.classList.remove('hidden');
    getInterface(monkeyClosing).goTo(0);
    getInterface(monkeyClosing).goTo(50, true);
  };

  const peek = () => {
    monkeyClosing.classList.add('hidden');
    monkeyPeeking.classList.remove('hidden');
    getInterface(monkeyClosing).goTo(0);
    getInterface(monkeyPeeking).goTo(20, true);
  };

  const unpeek = () => {
    getInterface(monkeyPeeking).goTo(0);
  };

  return useInterface(element, {
    lookAtCode,
    idleCode,
    followCode,
    closeEyes,
    peek,
    unpeek,
  });
}
