import { div, text } from 'core/html';
import { getInterface, useObservable, WithInterfaceHook, useListenWhileMounted } from 'core/hooks';
import { listen, mount, unmount } from 'core/dom';
import { media as service, message } from 'services';
import { upload } from 'client/media';
import { getReadableSize } from 'helpers/files';
import { send } from 'components/icons';
import messageTextarea from 'components/message/input/input_textarea';
import { InputFile } from 'client/schema';
import { KeyboardKeys } from 'const';
import popupCommon from '../popup_common';
import './send_media.scss';

/**
 * Send media popup handler
 */
export default class SendMediaPopup {
  container: HTMLElement & WithInterfaceHook<{ remove: () => void }>;
  closeEl: HTMLElement;
  contentEl: HTMLElement;
  textarea: HTMLTextAreaElement;
  sendBtn: HTMLElement;
  isSending = false;

  count: number = 0;
  inputFiles: Array<{ file: InputFile, name: string, mime: string }> = [];

  constructor() {
    this.container = (
      popupCommon(
        div`.popup__header`(
          div`.popup__title`(text('Send Media')),
          this.closeEl = div`.popup__close`(),
        ),
        this.contentEl = div`.popup__content.popup-send-media`(),
        div`.popup-send-media__message`(
          this.textarea = messageTextarea({ onSend: this.send, maxHeight: 200 }),
          this.sendBtn = div`.popup-send-media__btn.disabled`(send()),
        ),
      )
    );

    useObservable(this.container, service.attachedFiles, (files: FileList) => {
      if (!files) return;

      for (let i = 0; i < files.length; i++) {
        if (this.count >= 5) return;
        this.handleFile(files.item(i));
      }
    });

    listen(this.closeEl, 'click', getInterface(this.container).remove);
    listen(this.sendBtn, 'click', this.send);

    useListenWhileMounted(this.container, window, 'keypress', (event: KeyboardEvent) => {
      if (event.keyCode === KeyboardKeys.ENTER && !event.keyCode) this.send();
    });
  }

  handleFile = (file: File | null) => {
    if (!file) return;

    const loaderProgressBar = div`.document-file__progress-bar`();
    const loaderProgress = div`.document-file__progress`(loaderProgressBar);

    const fileEl = (
      div`.document-file`(
        div`.document-file__icon`(text(file.name.split('.').pop() || '')),
        div`.document-file__info`(
          div`.document-file__title`(text(file.name)),
          div`.document-file__size`(text(getReadableSize(file.size))),
          loaderProgress,
        ),
      )
    );

    mount(this.contentEl, fileEl);
    this.sendBtn.classList.add('disabled');
    this.count++;

    upload(
      file,

      // ready
      (result: InputFile) => {
        unmount(loaderProgress);
        this.inputFiles.push({ file: result, mime: file.type, name: file.name });
        if (this.inputFiles.length === this.count) {
          this.sendBtn.classList.remove('disabled');
        }
      },

      // progress
      (ready: number, total: number) => {
        loaderProgressBar.style.width = `${((ready / total) * 100).toFixed(1)}%`;
      },
    );
  };

  send = () => {
    if (this.isSending) return;
    if (this.inputFiles.length !== this.count) return;

    this.isSending = true;

    if (this.textarea.value) message.sendMessage(this.textarea.value);

    for (let i = 0; i < this.inputFiles.length; i++) {
      message.sendMediaMessage({
        _: 'inputMediaUploadedDocument',
        file: this.inputFiles[i].file,
        mime_type: this.inputFiles[i].mime,
        attributes: [{
          _: 'documentAttributeFilename',
          file_name: this.inputFiles[i].name,
        }],
      });
    }

    getInterface(this.container).remove();
  };
}
