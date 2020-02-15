import { div } from 'core/html';
import { getInterface, useInterface } from 'core/hooks';
import { tgs } from 'components/ui';
import tracking from 'assets/monkey_tracking.tgs';
import closing from 'assets/monkey_closing.tgs';
import peeking from 'assets/monkey_peeking.tgs';
import './monkey.scss';

export default function monkey() {
  const monkeyTracking = tgs({ className: 'monkey__state', src: tracking, autoplay: true });
  const monkeyClosing = tgs({ className: 'monkey__state hidden', src: closing, autoplay: true });
  const monkeyPeeking = tgs({ className: 'monkey__state hidden', src: peeking, autoplay: true });

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
    getInterface(monkeyClosing).resize();
    getInterface(monkeyClosing).goTo(50);
  };

  const peek = () => {
    monkeyClosing.classList.add('hidden');
    monkeyPeeking.classList.remove('hidden');
    getInterface(monkeyPeeking).resize();
    getInterface(monkeyPeeking).goTo(20);
  };

  const unpeek = () => {
    getInterface(monkeyPeeking).resize();
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
