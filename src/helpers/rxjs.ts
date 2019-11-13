import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { MaybeObservable } from 'core/types';

// eslint-disable-next-line import/prefer-default-export
export function toBehaviorSubject<T>(value: MaybeObservable<T>, initial: T): BehaviorSubject<T> {
  if (value instanceof BehaviorSubject) {
    return value;
  }

  const subject = new BehaviorSubject(initial);

  if (value instanceof Observable) {
    let sourceSubscription: Subscription | undefined;

    const originalSubscribe = subject.subscribe;
    const newSubscribe: typeof originalSubscribe = (...args: any[]) => {
      const subscription = originalSubscribe.apply(subject, args);

      if (subject.observers.length > 0 && !sourceSubscription) {
        sourceSubscription = value.subscribe(subject);
      }

      const originalUnsubscribe = subscription.unsubscribe;
      const newUnsubscribe: typeof originalUnsubscribe = () => {
        originalUnsubscribe.call(subscription);

        if (subject.observers.length === 0 && sourceSubscription) {
          sourceSubscription.unsubscribe();
          sourceSubscription = undefined;
        }
      };
      subscription.unsubscribe = newUnsubscribe;

      return subscription;
    };
    subject.subscribe = newSubscribe;
  }

  return subject;
}
