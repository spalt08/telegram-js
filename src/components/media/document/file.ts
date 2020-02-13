import { Document } from 'cache/types';
import { div, text } from 'core/html';
import { getAttributeFilename, getReadableSize } from 'helpers/files';
import './file.scss';
import photoRenderer from '../photo/photo';

export default function documentFile(document: Document) {
  const filenameAttributte = getAttributeFilename(document);

  let filename = '';
  if (filenameAttributte) filename = filenameAttributte.file_name;

  let icon;
  if (document.thumbs && document.thumbs.length > 0) {
    icon = div`.document-file__thumb`(photoRenderer(document, { fit: 'cover', width: 50, height: 50, showLoader: false }));
  } else icon = div`.document-file__icon`(text(document.mime_type.split('/').pop() || ''));

  console.log(document);

  return div`.document-file`(
    icon,
    div`.document-file__info`(
      div`.document-file__title`(text(filename)),
      div`.document-file__size`(text(getReadableSize(document))),
    ),
  );
}
