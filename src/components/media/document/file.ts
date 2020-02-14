import { Document, Message } from 'cache/types';
import { div, text } from 'core/html';
import { getAttributeFilename, getReadableSize } from 'helpers/files';
import { datetime } from 'components/ui';
import photoRenderer from '../photo/photo';
import './file.scss';

export default function documentFile(document: Document, message: Message | undefined) {
  const filenameAttributte = getAttributeFilename(document);

  let filename = '';
  if (filenameAttributte) filename = filenameAttributte.file_name;

  let icon;
  if (document.thumbs && document.thumbs.length > 0) {
    icon = div`.document-file__thumb`(photoRenderer(document, { fit: 'cover', width: 50, height: 50, showLoader: false }));
  } else icon = div`.document-file__icon`(text(document.mime_type.split('/').pop() || ''));

  const nodes: Node[] = [text(getReadableSize(document.size))];

  if (message?._ === 'message') {
    const fileSendTime = datetime({ timestamp: message.date, date: true });
    nodes.push(text(' ꞏ '));
    nodes.push(fileSendTime);
  }

  return div`.document-file`(
    icon,
    div`.document-file__info`(
      div`.document-file__title`(text(filename)),
      div`.document-file__size`(...nodes)),
  );
}
