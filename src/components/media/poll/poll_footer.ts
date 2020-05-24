import { ripple } from 'components/ui';
import { getInterface, useInterface } from 'core/hooks';
import { div, text } from 'core/html';
import { pluralize } from 'helpers/other';
import './poll_footer.scss';

export enum VoteButtonState {
  Vote,
  ViewResults,
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
    ? `${voters} ${pluralize(voters, 'vote', 'votes')}`
    : 'No votes';
}

function formatStateText(state: VoteButtonState, voters: number, quiz: boolean, publicVoters: boolean, multipleChoice: boolean) {
  switch (state) {
    case VoteButtonState.Vote:
      if (multipleChoice) {
        return voteText;
      }
      return pluralizeVoters(quiz, voters);
    case VoteButtonState.ViewResults:
      if (publicVoters && voters > 0) {
        return viewResultsText;
      }
      return pluralizeVoters(quiz, voters);
    default:
      return voteText;
  }
}

type Props = {
  quiz: boolean,
  publicVoters: boolean,
  multipleChoice: boolean,
  onSubmit: () => void,
  onViewResults: () => void,
};

export default function pollFooter({ quiz, publicVoters, multipleChoice, onSubmit, onViewResults }: Props) {
  let state = VoteButtonState.Vote;
  let voters = 0;
  let optionsSelected = false;
  const stateText = text('');
  const footer = div`.pollFooter`(
    {
      onClick: async () => {
        switch (state) {
          case VoteButtonState.ViewResults:
            if (voters > 0 && publicVoters) {
              onViewResults();
            }
            break;
          case VoteButtonState.Vote:
            if (multipleChoice) {
              onSubmit();
            }
            break;
          default:
            break;
        }
      },
    },
    stateText,
  );
  const container = ripple({}, [footer]);

  const setRippleEnable = getInterface(container).setEnabled;

  const updateState = () => {
    stateText.textContent = formatStateText(state, voters, quiz, publicVoters, multipleChoice);
    const enabled = (state === VoteButtonState.Vote && optionsSelected)
      || (state === VoteButtonState.ViewResults && publicVoters && voters > 0);
    setRippleEnable(enabled);
    footer.classList.toggle('-inactive', !enabled);
  };

  updateState();

  return useInterface(container as HTMLElement, {
    updateState: (newState: VoteButtonState, newOptionsSelected: boolean) => {
      state = newState;
      optionsSelected = newOptionsSelected;
      updateState();
    },
    updateVoters: (newVoters: number) => {
      voters = newVoters;
      updateState();
    },
  });
}
