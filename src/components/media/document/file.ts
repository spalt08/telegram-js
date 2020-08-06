import { file, useProgress } from 'client/media';
import { materialSpinner } from 'components/icons';
import { datetime } from 'components/ui';
import { listen, mount, unmountChildren, unmount } from 'core/dom';
import { div, text } from 'core/html';
import { getAttributeFilename, getDocumentLocation, getReadableSize } from 'helpers/files';
import { downloadForm, downloadLink } from 'helpers/other';
import { Document, Message } from 'mtproto-js';
import { isSafari } from 'helpers/browser';
import { request } from 'client/context';
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

export default function documentFile(document: Document.document, message?: Message, className?: string) {
  const filenameAttribute = getAttributeFilename(document);

  let filename = '';
  if (filenameAttribute) filename = filenameAttribute.file_name;

  let icon: HTMLElement;
  if (document.thumbs && document.thumbs.length > 0) {
    icon = div`.document-file__thumb`(photoRenderer(document, { fit: 'cover', width: 50, height: 50 }));
  } else icon = div`.document-file__icon`(div`.document-file__ext`(text(filename.split('.').pop() || '')));

  const sizeEl = div`.document-file__size`(...renderMeta(document, message));

  const container = div`.document-file${className}`(
    icon,
    div`.document-file__info`(
      div`.document-file__title`(text(filename)),
      sizeEl,
    ),
  );

  let progress: HTMLDivElement | undefined;
  let isDownloading = false;

  const { dc_id, size, mime_type } = document;
  const location = getDocumentLocation(document);
  const options = { dc_id, size, mime_type, progress: isSafari };
  const src = file(location, options);

  listen(icon, 'click', () => {
    if (isSafari) {
      if (isDownloading) return;
      isDownloading = true;

      container.classList.add('downloading');
      if (!progress) progress = div`.document-file__circleprogress`(materialSpinner());
      mount(icon, progress);
      unmountChildren(sizeEl);
      sizeEl.textContent = '0%';

      useProgress(container, src, (downloaded) => {
        if (downloaded < size) sizeEl.textContent = `${((downloaded / size) * 100).toFixed(1)}%`;
        else {
          sizeEl.textContent = getReadableSize(document.size);
          isDownloading = false;
        }
      });

      request('download', { url: src, location, options }, ({ url }) => {
        downloadLink(filename, url);
        URL.revokeObjectURL(url);
        if (progress) unmount(progress);
        sizeEl.textContent = getReadableSize(document.size);
      });
    } else {
      downloadForm(filename, src);
    }
  });

  return container;
}
