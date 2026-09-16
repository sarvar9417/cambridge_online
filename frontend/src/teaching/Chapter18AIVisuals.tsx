import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter18-ai-visuals.css';

export const CHAPTER_18_AI_VISUAL_IDS = [
  'h18-1811-dijkstra-steps',
  'h18-1811-dijkstra-worked',
  'h18-1812-astar-heuristic',
  'h18-1812-astar-f-values',
  'h18-1821-ai-hierarchy',
  'h18-1822-machine-learning',
  'h18-1822-labelled-data',
  'h18-1822-supervised-unsupervised',
  'h18-1822-reinforcement-active',
  'h18-1823-neural-networks',
  'h18-1823-deep-workflow',
  'h18-1824-comparison',
  'h18-1826-backprop',
  'h18-1826-regression',
] as const;

export function hasChapter18AIVisual(beat:LessonPresentationBeat){
  return CHAPTER_18_AI_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function DijkstraSteps({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-path" aria-label="Dijkstra shortest path steps">
    <section className={state(reveal,1)}><b>START NODE</b><span>distance = 0</span></section><i>→</i>
    <section className={state(reveal,1)}><b>RELAX NEIGHBOURS</b><span>tentative distance = current + edge</span></section><i>→</i>
    <section className={state(reveal,2)}><b>CHOOSE SMALLEST</b><span>unvisited node with least tentative distance</span></section><i>→</i>
    <section className={state(reveal,3)}><b>MARK VISITED</b><span>repeat until destination / all nodes settled</span></section>
  </div>;
}

function DijkstraWorked({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-graph" aria-label="Dijkstra worked route example">
    <div className={`h18ai-node start ${state(reveal,1)}`}>A<br/><small>0</small></div>
    <span className={state(reveal,1)}>2</span><div className={`h18ai-node ${state(reveal,2)}`}>B<br/><small>2</small></div>
    <span className={state(reveal,2)}>3</span><div className={`h18ai-node ${state(reveal,2)}`}>C<br/><small>5</small></div>
    <span className={state(reveal,3)}>1</span><div className={`h18ai-node goal ${state(reveal,3)}`}>D<br/><small>6</small></div>
    <footer className={state(reveal,3)}>Each settled node keeps the best known route predecessor so the final shortest path can be reconstructed.</footer>
  </div>;
}

function AStarHeuristic({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-astar" aria-label="A star heuristic components">
    <section className={state(reveal,1)}><b>g(n)</b><span>known cost from start</span></section>
    <b className={state(reveal,2)}>+</b>
    <section className={state(reveal,2)}><b>h(n)</b><span>HEURISTIC estimate to goal</span><small>e.g. MANHATTAN distance</small></section>
    <b className={state(reveal,3)}>=</b>
    <section className={state(reveal,3)}><b>f(n)</b><span>estimated total route cost</span></section>
  </div>;
}

function AStarF({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-fgrid" aria-label="A star chooses the smallest f value">
    {[
      ['NODE A','g=4','h=5','f=9'],['NODE B','g=6','h=2','f=8'],['NODE C','g=5','h=6','f=11'],
    ].map((row,i)=><section key={row[0]} className={state(reveal,i===0?1:i===1?2:3)}>{row.map(x=><span key={x}>{x}</span>)}</section>)}
    <footer className={state(reveal,3)}>Choose the open node with the smallest f(n); an effective heuristic guides search toward the goal.</footer>
  </div>;
}

function Hierarchy({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-hierarchy" aria-label="AI machine learning deep learning hierarchy">
    <div className={`h18ai-ring ai ${state(reveal,1)}`}><b>ARTIFICIAL INTELLIGENCE</b>
      <div className={`h18ai-ring ml ${state(reveal,2)}`}><b>MACHINE LEARNING</b>
        <div className={`h18ai-ring dl ${state(reveal,3)}`}><b>DEEP LEARNING</b></div>
      </div>
    </div>
    <footer className={state(reveal,3)}>NARROW AI solves specific tasks; GENERAL / STRONG AI describes broader human-like capability discussed as a future possibility.</footer>
  </div>;
}

function MachineLearning({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-ml" aria-label="Machine learning training model inference cycle">
    <section className={state(reveal,1)}><b>TRAINING DATA</b><span>examples / observations</span></section><i>→</i>
    <section className={state(reveal,2)}><b>LEARNING ALGORITHM</b><span>finds patterns / relationships</span></section><i>→</i>
    <section className={state(reveal,2)}><b>MODEL</b><span>learned representation</span></section><i>→</i>
    <section className={state(reveal,3)}><b>NEW INPUT</b><span>prediction / classification</span></section>
  </div>;
}

function Labelled({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-data" aria-label="Labelled and unlabelled data">
    <section className={state(reveal,1)}><b>LABELLED DATA</b><span>input paired with correct target/category</span><small>used by SUPERVISED LEARNING</small></section>
    <section className={state(reveal,2)}><b>UNLABELLED DATA</b><span>input has no supplied target</span><small>used by UNSUPERVISED LEARNING</small></section>
    <footer className={state(reveal,3)}>SEMI-SUPERVISED learning combines a smaller labelled set with a larger unlabelled set.</footer>
  </div>;
}

function SupervisedUnsupervised({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-compare" aria-label="Supervised and unsupervised learning comparison">
    <section className={state(reveal,1)}><b>SUPERVISED</b><span>known labels / outputs</span><span>learn mapping from input to target</span><small>classification · regression</small></section>
    <section className={state(reveal,2)}><b>UNSUPERVISED</b><span>no target labels</span><span>discover structure or groups</span><small>clustering / pattern discovery</small></section>
  </div>;
}

function Reinforcement({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-rl" aria-label="Reinforcement learning reward punishment cycle">
    <section className={state(reveal,1)}><b>AGENT</b><span>chooses action</span></section><i>→</i>
    <section className={state(reveal,2)}><b>ENVIRONMENT</b><span>new state</span></section><i>→</i>
    <section className={state(reveal,2)}><b>REWARD / PUNISHMENT</b><span>feedback signal</span></section><i>↺</i>
    <section className={state(reveal,3)}><b>POLICY IMPROVES</b><span>prefer actions with better long-term reward</span></section>
  </div>;
}

function NeuralNetwork({reveal}:{reveal:number}){
  const nodes=(n:number,prefix:string)=>Array.from({length:n},(_,i)=><span key={`${prefix}${i}`}>{prefix}{i+1}</span>);
  return <div className="h18ai h18ai-nn" aria-label="Artificial neural network layers">
    <section className={state(reveal,1)}><b>INPUT LAYER</b>{nodes(4,'x')}</section><i>→</i>
    <section className={state(reveal,2)}><b>HIDDEN LAYERS</b>{nodes(5,'h')}</section><i>→</i>
    <section className={state(reveal,3)}><b>OUTPUT LAYER</b>{nodes(2,'y')}</section>
    <footer className={state(reveal,3)}>Weighted connections + activation functions create an ARTIFICIAL NEURAL NETWORK; many hidden layers support DEEP LEARNING.</footer>
  </div>;
}

function DeepWorkflow({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-workflow" aria-label="Deep learning workflow">
    <section className={state(reveal,1)}><b>RAW DATA</b></section><i>→</i>
    <section className={state(reveal,1)}><b>FEATURE LEARNING</b><span>network learns useful representations</span></section><i>→</i>
    <section className={state(reveal,2)}><b>MULTIPLE HIDDEN LAYERS</b><span>increasingly abstract features</span></section><i>→</i>
    <section className={state(reveal,3)}><b>OUTPUT</b><span>classification / prediction</span></section>
  </div>;
}

function Comparison({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-compare" aria-label="Machine learning versus deep learning comparison">
    <section className={state(reveal,1)}><b>MACHINE LEARNING</b><span>can use engineered features</span><span>often smaller data/compute requirement</span><span>models can be easier to interpret</span></section>
    <section className={state(reveal,2)}><b>DEEP LEARNING</b><span>learns hierarchical features automatically</span><span>often needs more data and compute</span><span>can behave as a BLACK BOX</span></section>
    <footer className={state(reveal,3)}>Source applications include TEXT MINING, COMPUTER-ASSISTED TRANSLATION and other pattern-rich tasks.</footer>
  </div>;
}

function Backprop({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-backprop" aria-label="Back propagation error gradient training">
    <section className={state(reveal,1)}><b>FORWARD PASS</b><span>input → prediction</span></section><i>→</i>
    <section className={state(reveal,2)}><b>ERROR</b><span>compare prediction with expected output</span></section><i>→</i>
    <section className={state(reveal,2)}><b>BACK PROPAGATION</b><span>send error information backward</span></section><i>→</i>
    <section className={state(reveal,3)}><b>ERROR GRADIENT</b><span>adjust weights to reduce future error</span></section>
  </div>;
}

function Regression({reveal}:{reveal:number}){
  return <div className="h18ai h18ai-regression" aria-label="Regression model relationship and prediction">
    <div className={`h18ai-axis ${state(reveal,1)}`}><span>y</span><div className="h18ai-points">•　 •　•　　•　 •</div><div className="h18ai-line">╱</div><span>x</span></div>
    <section className={state(reveal,2)}><b>REGRESSION</b><span>model relationship between variables</span><span>use fitted relationship to predict a numeric value</span></section>
    <footer className={state(reveal,3)}>STATIC models use current/fixed input relationships; RECURRENT models feed earlier state/output into later processing.</footer>
  </div>;
}

export function Chapter18AIVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h18-1811-dijkstra-steps': return <DijkstraSteps reveal={reveal}/>;
    case 'h18-1811-dijkstra-worked': return <DijkstraWorked reveal={reveal}/>;
    case 'h18-1812-astar-heuristic': return <AStarHeuristic reveal={reveal}/>;
    case 'h18-1812-astar-f-values': return <AStarF reveal={reveal}/>;
    case 'h18-1821-ai-hierarchy': return <Hierarchy reveal={reveal}/>;
    case 'h18-1822-machine-learning': return <MachineLearning reveal={reveal}/>;
    case 'h18-1822-labelled-data': return <Labelled reveal={reveal}/>;
    case 'h18-1822-supervised-unsupervised': return <SupervisedUnsupervised reveal={reveal}/>;
    case 'h18-1822-reinforcement-active': return <Reinforcement reveal={reveal}/>;
    case 'h18-1823-neural-networks': return <NeuralNetwork reveal={reveal}/>;
    case 'h18-1823-deep-workflow': return <DeepWorkflow reveal={reveal}/>;
    case 'h18-1824-comparison': return <Comparison reveal={reveal}/>;
    case 'h18-1826-backprop': return <Backprop reveal={reveal}/>;
    case 'h18-1826-regression': return <Regression reveal={reveal}/>;
    default: return null;
  }
}
