import { MessageEntity, MessageCommon } from 'cache/types';
import { strong, text, code, pre, italic, a, fragment } from 'core/html';
import { mount } from 'core/dom';

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
        result.push(text(node.value));
        break;
    }
  } else {
    node.children.forEach((c) => nodeToHtml(c, result));
  }
}

export default function formattedMessage(message: MessageCommon) {
  const root = createTreeNode(message.message);
  message.entities.forEach((e) => applyEntity(root, e.offset, e.length, e));
  const frag = fragment();
  const nodeList: Node[] = [];
  nodeToHtml(root, nodeList);
  nodeList.forEach((value) => mount(frag, value));
  return frag;
}