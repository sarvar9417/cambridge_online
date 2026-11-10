import './answer-cards.css';

export function AnswerCards({ options, order, answer, correctIndex, firstWrong, blocked, onChoose, cardClass = '' }: {
  options: readonly string[];
  order?: readonly number[];
  answer: number | null;
  correctIndex: number;
  firstWrong?: number | null;
  blocked?: boolean;
  onChoose: (index: number) => void;
  cardClass?: string;
}) {
  return <div className="ig-choice-grid" role="group" aria-label="Answer choices">
    {(order ?? options.map((_, index) => index)).map((index, position) => {
      const correct = answer !== null && index === correctIndex;
      const wrong = !correct && (index === answer || index === firstWrong);
      return <button type="button" key={index}
        className={`ig-choice-card ${cardClass}${correct ? ' is-correct' : wrong ? ' is-wrong' : ''}`}
        disabled={blocked || answer !== null || index === firstWrong} onClick={() => onChoose(index)}>
        <span>{String.fromCharCode(65 + position)}</span><strong>{options[index]}</strong>
        {(correct || wrong) && <span className="ig-choice-mark" aria-hidden="true">{correct ? '✓' : '✕'}</span>}
      </button>;
    })}
  </div>;
}
