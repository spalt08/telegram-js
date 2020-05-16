import { text, div } from 'core/html';
import { ripple } from 'components/ui';
import { useInterface, getInterface } from 'core/hooks';
import { pluralize } from 'helpers/other';

export enum VoteButtonState {
  Vote,
  ShowResults,
}

const voteText = 'Vote';
const viewResultsText = 'View Results';

function pluralizeVoters(voters: number, single: string, plural: string) {
  return voters > 0
    ? `${voters} ${pluralize(voters, single, plural)}`
    : `No ${plural}`;
}

function formatStateText(state: VoteButtonState, voters: number, quiz: boolean, publicVoters: boolean, multipleChoice: boolean) {
  if (!multipleChoice && !quiz) {
    return pluralizeVoters(voters, 'vote', 'votes');
  }
  if (quiz) {
    if (state === VoteButtonState.ShowResults && publicVoters) {
      return viewResultsText;
    }
    return pluralizeVoters(voters, 'answer', 'answers');
  }

  // Only multiple choice vote case left.
  if (state === VoteButtonState.ShowResults) {
    if (publicVoters) {
      return viewResultsText;
    }
    return pluralizeVoters(voters, 'vote', 'votes');
  }

  return voteText;
}

export default function pollFooter(quiz: boolean, publicVoters: boolean, multipleChoice: boolean, onSubmit: () => void, onShowResults: () => void) {
  let state = VoteButtonState.Vote;
  let voters = 0;
  const stateText = text('');
  const container = ripple({}, [
    div`.poll__vote-button.-inactive`(
      {
        onClick: async () => {
          if (!publicVoters) {
            return;
          }
          if (state === VoteButtonState.ShowResults) {
            onShowResults();
          } else {
            onSubmit();
          }
        },
      },
      stateText,
    ),
  ]);

  const updateState = () => {
    stateText.textContent = formatStateText(state, voters, quiz, publicVoters, multipleChoice);
    getInterface(container).setEnabled(false);
  };

  updateState();

  return useInterface(container as HTMLElement, {
    ...getInterface(container),
    updateState: (newState: VoteButtonState) => {
      state = newState;
      updateState();
    },
    updateVoters: (newVoters: number) => {
      voters = newVoters;
      updateState();
    },
  });
}
