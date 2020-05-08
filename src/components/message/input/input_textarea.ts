import { textarea } from 'core/html';
import { listen } from 'core/dom';
import { KeyboardKeys } from 'const/dom';
import { useInterface } from 'core/hooks';
import './input_textarea.scss';

type Props = {
  onSend: (message: string) => void,
  onChange?: (message: string) => void,
  maxHeight: number
};

export default function messageTextarea({ onSend, onChange, maxHeight = 400 }: Props) {
  const lineHeight = 20;
  const element = textarea({ className: 'message-text', placeholder: 'Message' });

  let height = element.offsetHeight;
  let nextHeight = height;
  let frameNumber: number | undefined;

  const sendMessage = () => {
    onSend(element.value.trim());
    element.value = '';
    element.style.transition = '';
    element.style.height = '';
  };

  listen(element, 'keypress', (event: KeyboardEvent) => {
    if (event.keyCode === KeyboardKeys.ENTER && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  listen(element, 'input', () => {
    if (frameNumber) cancelAnimationFrame(frameNumber);

    element.scrollTop = 0;
    element.style.height = '';
    element.style.transition = '';

    const lines = element.value.split('\n').length;
    const linesHeight = lines * lineHeight;
    const newHeight = Math.min(Math.max(element.scrollHeight, linesHeight), maxHeight);

    if (height === 0 || height === newHeight) {
      height = newHeight;
      element.style.height = `${newHeight}px`;
    } else {
      element.style.height = `${height}px`;
      nextHeight = newHeight;

      frameNumber = requestAnimationFrame(() => {
        element.style.transition = 'height 0.1s ease-out';
        element.style.height = `${nextHeight}px`;
        height = nextHeight;

        if (height >= 400) element.style.overflow = 'auto';
        else {
          element.style.overflow = 'hidden';
          element.scrollTop = 0;
        }
      });
    }

    if (onChange) onChange(element.value);
  });

  return useInterface(element, {
    insertText(text: string) {
      const selection = element.selectionStart;
      element.value = element.value.slice(0, element.selectionStart) + text + element.value.slice(element.selectionEnd);
      element.selectionStart = element.selectionEnd = selection + text.length;
    },
    send() {
      sendMessage();
    },
  });
}
