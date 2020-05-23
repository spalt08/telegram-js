import { ripple } from 'components/ui';
import { getInterface, useInterface } from 'core/hooks';
import { div, text } from 'core/html';
import { pluralize } from 'helpers/other';
import './poll_footer.scss';

export enum VoteButtonState {
  Inactive,
  Vote,
  ShowResults,
}

const voteText = 'VOTE';
const viewResultsText = 'VIEW RESULTS';

function pluralizeVoters(quiz: boolean, voters: number) {
  if (quiz) {
    return voters > 0
      ? `${voters} ${pluralize(voters, 'answer', 'answers')}`
      : 'No answers';
  }
  return voters > 0
    ? `${voters} ${pluralize(voters, 'vote', 'votess')}`
    : 'No votes';
}

function formatStateText(state: VoteButtonState, voters: number, quiz: boolean, publicVoters: boolean, multipleChoice: boolean) {
  if (state === VoteButtonState.Inactive || (!multipleChoice && !quiz)) {
    return pluralizeVoters(quiz, voters);
  }
  if (quiz) {
    if (state === VoteButtonState.ShowResults && publicVoters) {
      return viewResultsText;
    }
    return pluralizeVoters(quiz, voters);
  }

  // Only multiple choice vote case left.
  if (state === VoteButtonState.ShowResults) {
    if (publicVoters) {
      return viewResultsText;
    }
    return pluralizeVoters(quiz, voters);
  }

  return voteText;
}

type Props = {
  quiz: boolean,
  publicVoters: boolean,
  multipleChoice: boolean,
  onSubmit: () => void,
  onShowResults: () => void,
};

export default function pollFooter({ quiz, publicVoters, multipleChoice, onSubmit, onShowResults }: Props) {
  let state = VoteButtonState.Vote;
  let voters = 0;
  const stateText = text('');
  const container = ripple({}, [
    div`.pollFooter.-inactive`(
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

  const updateState = () => {
    stateText.textContent = formatStateText(state, voters, quiz, publicVoters, multipleChoice);
    getInterface(container).setEnabled(voters > 0 && state !== VoteButtonState.Inactive);
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
