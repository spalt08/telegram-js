import { MessageEntity, MessageCommon } from 'cache/types';

export function isEmoji(text: string) {
  // eslint-disable-next-line
  const re = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
  const match = text.match(re);

  return match && match.length === text.length / 2;
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

function toDomObjects(node: TreeNode, result: (Text | HTMLElement)[]) {
  if (node.value !== undefined) {
    if (!node.entity) {
      formatPlain(node.value, result);
      return;
    }
    switch (node.entity._) {
      case 'messageEntityBold': {
        const b = document.createElement('b');
        b.innerText = node.value;
        result.push(b);
        break;
      }
      case 'messageEntityItalic': {
        const i = document.createElement('i');
        i.innerText = node.value;
        result.push(i);
        break;
      }
      case 'messageEntityPre': {
        const pre = document.createElement('pre');
        pre.innerText = node.value;
        result.push(pre);
        break;
      }
      case 'messageEntityCode': {
        const code = document.createElement('code');
        code.innerText = node.value;
        result.push(code);
        break;
      }
      case 'messageEntityEmail': {
        const email = document.createElement('a');
        email.innerText = node.value;
        email.href = `mailto:${node.value}`;
        result.push(email);
        break;
      }
      case 'messageEntityUrl': {
        const url = document.createElement('a');
        url.innerText = node.value;
        url.href = fixUrl(node.value);
        url.target = '_blank';
        result.push(url);
        break;
      }
      case 'messageEntityTextUrl': {
        const textUrl = document.createElement('a');
        textUrl.innerText = node.value;
        textUrl.href = fixUrl(node.entity.url);
        textUrl.target = '_blank';
        result.push(textUrl);
        break;
      }
      case 'messageEntityMention': {
        const mention = document.createElement('a');
        mention.innerText = node.value;
        mention.href = '#';
        result.push(mention);
        break;
      }
      case 'messageEntityMentionName': {
        const mentionName = document.createElement('a');
        mentionName.innerText = node.value;
        mentionName.href = '#';
        result.push(mentionName);
        break;
      }
      case 'messageEntityBotCommand': {
        const botCommand = document.createElement('a');
        botCommand.innerText = node.value;
        botCommand.href = '#';
        result.push(botCommand);
        break;
      }
      case 'messageEntityHashtag': {
        const hashtag = document.createElement('a');
        hashtag.innerText = node.value;
        hashtag.href = '#';
        result.push(hashtag);
        break;
      }
      default:
        formatPlain(node.value, result);
        break;
    }
  } else {
    node.children.forEach((c) => toDomObjects(c, result));
  }
}

export function formatText(message: MessageCommon): DocumentFragment {
  const root = createTreeNode(message.message);
  message.entities.forEach((e) => applyEntity(root, e.offset, e.length, e));
  const fragment = document.createDocumentFragment();
  const result: (Text | HTMLElement)[] = [];
  toDomObjects(root, result);
  result.forEach((value) => fragment.appendChild(value));
  return fragment;
}
