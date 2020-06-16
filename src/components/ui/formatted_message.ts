import { mount } from 'core/dom';
import { a, code, em, fragment, pre, strong, text } from 'core/html';
import { Message, MessageEntity, PollResults } from 'mtproto-js';
import { message } from 'services';
import { hiddenUrlClickHandler } from 'services/click_handlers';

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

export function createAnchor(url: string, ...children: Node[]) {
  const onClick = (e: Event) => {
    e.preventDefault();
    hiddenUrlClickHandler(url);
  };

  return a({ href: url, onClick }, ...children);
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
        result.push(createAnchor(fixUrl(node.value), text(node.value)));
        break;
      case 'messageEntityTextUrl':
        result.push(createAnchor(fixUrl(node.entity.url), text(node.value)));
        break;
      case 'messageEntityMention':
        result.push(createAnchor(`https://t.me/${node.value.substr(1)}`, text(node.value)));
        break;
      case 'messageEntityMentionName':
        result.push(createAnchor(`internal:user-id//${node.entity.user_id}`, text(node.value)));
        break;
      case 'messageEntityBotCommand':
        result.push(a({ href: '', onClick: (e: Event) => { e.preventDefault(); message.sendMessage(node.value ?? ''); } }, text(node.value)));
        break;
      case 'messageEntityHashtag':
        result.push(createAnchor(node.value, text(node.value)));
        break;
      default:
        result.push(text(node.value));
        break;
    }
  } else {
    node.children.forEach((c) => nodeToHtml(c, result));
  }
}

export function formattedMessage(msg: Message.message | PollResults) {
  let str;
  let entities;
  if (msg._ === 'message') {
    str = msg.message;
    entities = msg.entities;
  } else {
    str = msg.solution || '';
    entities = msg.solution_entities;
  }
  const root = createTreeNode(str);
  if (entities) {
    entities.forEach((e) => applyEntity(root, e.offset, e.length, e));
  }
  const frag = fragment();
  const nodeList: Node[] = [];
  nodeToHtml(root, nodeList);
  nodeList.forEach((value) => mount(frag, value));
  return frag;
}
