import { MessageEntity, MessageCommon } from 'cache/types';
import { strong, text, code, pre, italic, a } from 'core/html';

export function isEmoji(txt: string) {
  // eslint-disable-next-line
  const re = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
  const match = txt.match(re);

  return match && match.length === txt.length / 2;
}

interface TreeNode {
  children: TreeNode[];
  entity?: MessageEntity;
  value?: string;
  length: number;
}

function createTreeNode(str: string, entity?: MessageEntity): TreeNode {
  return {
    children: [],
    entity,
    value: str,
    length: str.length,
  };
}

function applyEntity(node: TreeNode, offset: number, length: number, entity: MessageEntity) {
  if (offset + length >= 0 && offset >= node.length) return;
  if (node.value !== undefined) {
    node.children.push(createTreeNode(node.value.substr(0, offset)));
    node.children.push(createTreeNode(node.value.substr(offset, length), entity));
    node.children.push(createTreeNode(node.value.substr(offset + length)));
    // eslint-disable-next-line no-param-reassign
    node.value = undefined;
  } else {
    let newOffset = offset;
    node.children.forEach((n) => {
      applyEntity(n, newOffset, length, entity);
      newOffset -= n.length;
    });
  }
}

function fixUrl(url: string) {
  return /^([a-zA-Z]{2,}):\/\//.test(url) ? url : (`http://${url}`);
}

function formatPlain(message: string, result: (Text | HTMLElement)[]) {
  result.push(document.createTextNode(message));
}

function nodeToHtml(node: TreeNode, result: (Text | HTMLElement)[]) {
  if (node.value !== undefined) {
    if (!node.entity) {
      formatPlain(node.value, result);
      return;
    }
    switch (node.entity._) {
      case 'messageEntityBold':
        result.push(strong(text(node.value)));
        break;
      case 'messageEntityItalic':
        result.push(italic(text(node.value)));
        break;
      case 'messageEntityPre':
        result.push(pre(text(node.value)));
        break;
      case 'messageEntityCode':
        result.push(code(text(node.value)));
        break;
      case 'messageEntityEmail':
        result.push(a({ href: `mailto:${node.value}` }, text(node.value)));
        break;
      case 'messageEntityUrl':
        result.push(a({ href: fixUrl(node.value), target: '_blank' }, text(node.value)));
        break;
      case 'messageEntityTextUrl':
        result.push(a({ href: fixUrl(node.entity.url), target: '_blank' }, text(node.value)));
        break;
      case 'messageEntityMention':
        result.push(a({ href: '#' }, text(node.value)));
        break;
      case 'messageEntityMentionName':
        result.push(a({ href: '#' }, text(node.value)));
        break;
      case 'messageEntityBotCommand':
        result.push(a({ href: '#' }, text(node.value)));
        break;
      case 'messageEntityHashtag':
        result.push(a({ href: '#' }, text(node.value)));
        break;
      default:
        formatPlain(node.value, result);
        break;
    }
  } else {
    node.children.forEach((c) => nodeToHtml(c, result));
  }
}

export function formatText(message: MessageCommon): DocumentFragment {
  const root = createTreeNode(message.message);
  message.entities.forEach((e) => applyEntity(root, e.offset, e.length, e));
  const fragment = document.createDocumentFragment();
  const result: (Text | HTMLElement)[] = [];
  nodeToHtml(root, result);
  result.forEach((value) => fragment.appendChild(value));
  return fragment;
}
