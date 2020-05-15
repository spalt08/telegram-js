import { text, div } from 'core/html';
import { ripple } from 'components/ui';
import { useInterface } from 'core/hooks';
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

export default function voteFooter(quiz: boolean, publicVoters: boolean, multipleChoice: boolean, onSubmit: () => void, onShowResults: () => void) {
  let state = VoteButtonState.Vote;
  let voters = 0;
  const stateText = text('');
  const container: HTMLElement = ripple({}, [
    div`.poll__vote-button.-inactive`(
      {
        onClick: async () => {
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

  return useInterface(container, {
    updateState: (newState: VoteButtonState) => {
      state = newState;
      stateText.textContent = formatStateText(state, voters, quiz, publicVoters, multipleChoice);
    },
    updateVoters: (newVoters: number) => {
      voters = newVoters;
      stateText.textContent = formatStateText(state, voters, quiz, publicVoters, multipleChoice);
    },
  });
}
