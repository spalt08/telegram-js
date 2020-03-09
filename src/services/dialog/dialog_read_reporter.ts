import { dialogCache } from 'cache';
import { Dialog, Peer } from 'cache/types';
import { peerToInputChannel, peerToInputPeer } from 'cache/accessors';
import client from 'client/client';
import { dialogPeerToDialogId } from 'helpers/api';

export interface DialogReadReporter {
  reportRead(readMessageId: number): void;
  destroy(): void;
}

const THROTTLE_TIME = 500;

async function sendReport(peer: Peer, messageId: number) {
  switch (peer._) {
    case 'peerChannel': {
      await client.call('channels.readHistory', { channel: peerToInputChannel(peer), max_id: messageId });
      break;
    }
    default:
      await client.call('messages.readHistory', { peer: peerToInputPeer(peer), max_id: messageId });
  }
}

/**
 * Sends read report to the server. Does no more.
 */
export default function makeDialogReadReporter(peer: Peer): DialogReadReporter {
  function getDialog() {
    return dialogCache.get(dialogPeerToDialogId(peer)) as Dialog.dialog | undefined;
  }

  let lastReportedMessageId = getDialog()?.read_inbox_max_id ?? 0;
  let lastReadMessageId = lastReportedMessageId;
  let isDestroyed = false;
  let throttleTimeout = 0;
  let isSending = false;
  let shouldResendOnSendEnd = false;

  // Sends a report if it isn't being sent already
  async function sendReportWithQueue() {
    if (isSending) {
      shouldResendOnSendEnd = true;
      return;
    }

    try {
      isSending = true;

      do {
        shouldResendOnSendEnd = false;
        const idToSend = lastReadMessageId;

        try {
          // eslint-disable-next-line no-await-in-loop
          await sendReport(peer, idToSend);
          lastReportedMessageId = idToSend;
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error('Failed to send dialog read report', error);
          }
        }
      } while (shouldResendOnSendEnd && !isDestroyed);
    } finally {
      isSending = false;
    }
  }

  function reportRead(messageId: number) {
    if (messageId <= lastReadMessageId && messageId <= lastReportedMessageId) {
      return;
    }

    lastReadMessageId = messageId;

    if (!throttleTimeout) {
      throttleTimeout = (setTimeout as typeof window.setTimeout)(() => {
        throttleTimeout = 0;
        sendReportWithQueue();
      }, THROTTLE_TIME);
    }
  }

  function destroy() {
    isDestroyed = true;
    clearTimeout(throttleTimeout);
  }

  return { reportRead, destroy };
}
