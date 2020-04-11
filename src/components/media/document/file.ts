import { Document, Message } from 'mtproto-js';
import { div, text } from 'core/html';
import { getAttributeFilename, getReadableSize, getDocumentLocation } from 'helpers/files';
import { downloadByUrl } from 'helpers/other';
import { datetime } from 'components/ui';
import { listen, mount, unmountChildren, unmount } from 'core/dom';
import { materialSpinner } from 'components/icons';
import { download, cached as getCached } from 'client/media';
import photoRenderer from '../photo/photo';
import './file.scss';

const renderMeta = (document: Document.document, message: Message | undefined) => {
  const nodes: Node[] = [text(getReadableSize(document.size))];

  if (message?._ === 'message') {
    const fileSendTime = datetime({ timestamp: message.date, date: true });
    nodes.push(text(' \u00b7 '));
    nodes.push(fileSendTime);
  }

  return nodes;
};

export default function documentFile(document: Document.document, message?: Message) {
  const filenameAttributte = getAttributeFilename(document);

  let filename = '';
  if (filenameAttributte) filename = filenameAttributte.file_name;

  let icon: HTMLElement;
  if (document.thumbs && document.thumbs.length > 0) {
    icon = div`.document-file__thumb`(photoRenderer(document, { fit: 'cover', width: 50, height: 50, showLoader: false }));
  } else icon = div`.document-file__icon`(div`.document-file__ext`(text(filename.split('.').pop() || '')));

  const sizeEl = div`.document-file__size`(...renderMeta(document, message));

  const container = div`.document-file`(
    icon,
    div`.document-file__info`(
      div`.document-file__title`(text(filename)),
      sizeEl,
    ),
  );

  let progress: HTMLDivElement | undefined;
  let isDownloading = false;

  listen(icon, 'click', () => {
    if (isDownloading) return;

    const cached = getCached(getDocumentLocation(document, ''));

    if (cached) {
      downloadByUrl(filename, cached);
      return;
    }

    isDownloading = true;

    container.classList.add('downloading');
    if (!progress) progress = div`.document-file__circleprogress`(materialSpinner());
    mount(icon, progress);
    unmountChildren(sizeEl);
    sizeEl.textContent = '0%';

    download(
      getDocumentLocation(document, ''),
      { dc_id: document.dc_id, size: document.size, mime_type: document.mime_type },

      // ready
      (src: string) => {
        downloadByUrl(filename, src);

        sizeEl.textContent = getReadableSize(document.size);
        if (progress) unmount(progress);
        container.classList.remove('downloading');
      },

      // progress
      (downloaded: number, total: number) => {
        sizeEl.textContent = `${((downloaded / total) * 100).toFixed(1)}%`;
      },
    );
  });

  return container;
}
