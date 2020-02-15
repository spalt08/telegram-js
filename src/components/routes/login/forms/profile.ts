import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { div, form, h1, p, text, input, img } from 'core/html';
import { button, textInput } from 'components/ui';
import { blurAll, listen } from 'core/dom';
import { getInterface, useListenWhileMounted } from 'core/hooks';
import { auth } from 'services';
import { humanizeErrorOperator } from 'helpers/humanizeError';
import '../login.scss';

/**
 * Layout for Sign UP
 */
export default function formProfile() {
  const isProcessing = new BehaviorSubject<boolean>(false);
  const { errFirstName, errLastName } = auth;

  const inputFirstName = textInput({
    label: 'Name',
    autocomplete: 'given-name',
    error: errFirstName.pipe(humanizeErrorOperator()),
    disabled: isProcessing,
    onChange: () => errFirstName.value !== undefined && errFirstName.next(undefined),
  });

  const inputLastName = textInput({
    label: 'Last Name (optional)',
    autocomplete: 'family-name',
    error: errLastName.pipe(humanizeErrorOperator()),
    disabled: isProcessing,
    onChange: () => errLastName.value !== undefined && errLastName.next(undefined),
  });

  // todo: Add photo uploader
  const image = img`.login__upload_preview`();
  const uploader = (
    div`.login__upload`(
      image,
      input({ type: 'file', accept: '.png,.jpg,.jpeg', multiple: false }),
    )
  );

  const element = (
    form`.login__form`(
      uploader,
      h1`.login__title`(text('Your Name')),
      p`.login__description`(text('Enter your name and add \na profile picture')),
      div`.login__inputs`(
        inputFirstName,
        inputLastName,
        button({
          label: isProcessing.pipe(map((prcs: boolean) => (prcs ? 'Please wait...' : 'Start Messaging'))),
          disabled: isProcessing,
          loading: isProcessing,
        }),
      ),
    )
  );

  const saveFile = (file: File) => {
    auth.profilePhoto = file;
  };

  const displayFile = (file: File) => {
    const readerURL = new FileReader();
    readerURL.onload = () => {
      if (readerURL.result) {
        image.src = readerURL.result as string;
        uploader.classList.add('uploaded');
      }
    };
    readerURL.readAsDataURL(file);
  };

  listen(uploader, 'change', (event: Event) => {
    if (!(event.target instanceof HTMLInputElement) || !event.target.files) return;

    saveFile(event.target.files[0]);
    displayFile(event.target.files[0]);
  });

  // drag n drop
  useListenWhileMounted(element, document, 'dragenter', (event: Event) => {
    event.preventDefault();
    uploader.classList.add('dragged');
  });

  useListenWhileMounted(element, document, 'dragleave', (event: Event) => {
    event.preventDefault();
    uploader.classList.remove('dragged');
  });

  useListenWhileMounted(element, document, 'dragover', (event: Event) => {
    event.preventDefault();
    uploader.classList.add('dragged');
  });

  useListenWhileMounted(element, document, 'drop', (event: DragEvent) => {
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      saveFile(event.dataTransfer.files[0]);
      displayFile(event.dataTransfer.files[0]);
    }
    uploader.classList.remove('dragged');
    event.preventDefault();
  });

  listen(element, 'submit', (event: Event) => {
    event.preventDefault();
    blurAll(element);

    if (!isProcessing.value) {
      isProcessing.next(true);

      const firstName = getInterface(inputLastName).getValue();
      const lastName = getInterface(inputLastName).getValue();

      auth.signUp(firstName, lastName, () => isProcessing.next(false));
    }
  });

  return element;
}
