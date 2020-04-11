import { MessageEntity, Message } from 'mtproto-js';
import { strong, text, code, pre, em, a, fragment, span } from 'core/html';
import { mount } from 'core/dom';
import { newWindowLinkAttributes } from 'const';
import { todoAssertHasValue } from 'helpers/other';

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
    value: str || undefined,
    length: str.length,
  };
}

function applyEntity(node: TreeNode, offset: number, length: number, entity: MessageEntity) {
  if (offset < 0 || (offset + length >= 0 && offset >= node.length)) return;
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

function nodeToHtml(node: TreeNode, result: Node[]) {
  if (node.value !== undefined) {
    if (!node.entity) {
      result.push(text(node.value));
      return;
    }
    switch (node.entity._) {
      case 'messageEntityBold':
        result.push(strong(text(node.value)));
        break;
      case 'messageEntityItalic':
        result.push(em(text(node.value)));
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
        result.push(a({ ...newWindowLinkAttributes, href: fixUrl(node.value) }, text(node.value)));
        break;
      case 'messageEntityTextUrl':
        result.push(a({ ...newWindowLinkAttributes, href: fixUrl(node.entity.url) }, text(node.value)));
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
        result.push(text(node.value));
        break;
    }
  } else {
    node.children.forEach((c) => nodeToHtml(c, result));
  }
}

export function highlightLinks(message: string) {
  const regexp = /(@\w+|#\w+|(?:https:\/\/)?t.me\/[\w/]+|https:\/\/tginfo.me\/[\w/]+)/;
  const parts = message
    .split(regexp)
    .filter((part) => part)
    .map((part) => {
      if (part.startsWith('@')
      || part.startsWith('#')
      || part.startsWith('t.me/')
      || part.startsWith('https://t.me/')
      || part.startsWith('https://tginfo.me/')) {
        return a({ ...newWindowLinkAttributes, href: '#' }, text(part));
      }
      return text(part);
    });

  return span(...parts);
}

export function formattedMessage(message: Message.message | string) {
  if (typeof message === 'string') return highlightLinks(message);

  const root = createTreeNode(message.message);
  todoAssertHasValue(message.entities).forEach((e) => applyEntity(root, e.offset, e.length, e));
  const frag = fragment();
  const nodeList: Node[] = [];
  nodeToHtml(root, nodeList);
  nodeList.forEach((value) => mount(frag, value));
  return frag;
}
