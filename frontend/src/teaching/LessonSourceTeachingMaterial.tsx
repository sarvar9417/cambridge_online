import {
  sourceTeachingAtomsForSlide,
  sourceTeachingIsTask,
  sourceTeachingIsWorked,
  sourceTeachingKindLabel,
  type SourceTeachingAtom,
  type SourceTeachingChapter,
} from './lesson-source-teaching-model';
import './lesson-source-teaching-material.css';

function SourceAtomCard({ atom }: { atom: SourceTeachingAtom }) {
  const ordered = sourceTeachingIsWorked(atom.kind) || sourceTeachingIsTask(atom.kind);
  const List = ordered ? 'ol' : 'ul';
  return <article className={`lesson-source-teaching-card source-kind-${atom.kind}`} data-source-atom-id={atom.id}>
    <header>
      <div>
        <span>{sourceTeachingKindLabel(atom.kind)}</span>
        <strong>{atom.sourceRef}</strong>
      </div>
      <small>{atom.pageLabel}</small>
    </header>
    {atom.lines.length > 0 && <List>{atom.lines.map((line,index)=><li key={`${atom.id}-${index}`}>{line}</li>)}</List>}
  </article>;
}

/**
 * The supplied PDF is part of the lesson itself, not an optional source drawer.
 * Every curated source atom mapped to the current slide is rendered here on the
 * normal teacher canvas. Provenance remains visible so the teacher can move
 * between explanation, source example/activity and Cambridge exam practice.
 */
export function LessonSourceTeachingMaterial({ chapter, slideId }: { chapter: SourceTeachingChapter; slideId: string }) {
  const atoms = sourceTeachingAtomsForSlide(chapter, slideId);
  if (!atoms.length) return null;
  return <section className="lesson-source-teaching" aria-label="Complete textbook source material">
    <header className="lesson-source-teaching-heading">
      <div>
        <span>TEXTBOOK SOURCE</span>
        <strong>Source material for this teaching step</strong>
      </div>
      <small>{atoms.length} source item{atoms.length === 1 ? '' : 's'}</small>
    </header>
    <div className="lesson-source-teaching-grid">{atoms.map(atom=><SourceAtomCard atom={atom} key={atom.id}/>)}</div>
  </section>;
}
