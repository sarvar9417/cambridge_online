import type { LessonPresentationBeat } from './lesson-experience-model';
import { coursePresentationFrameInfo } from './course-classroom-presentation';
import './course-classroom-presentation.css';

export function hasCourseClassroomPresentationVisual(beat:LessonPresentationBeat){
  return Boolean(coursePresentationFrameInfo(beat));
}

export function CourseClassroomPresentationVisual({beat}:{beat:LessonPresentationBeat}){
  const info=coursePresentationFrameInfo(beat);
  if(!info)return null;
  const {frame,lesson,lessonIndex,stage}=info;
  return <div className={`hcf hcf--${stage}`} data-chapter={frame.chapter} data-topic={frame.topicCode}>
    <div className="hcf-map">
      {frame.lessons.map((item,index)=><section className={index===lessonIndex?'active':''} key={item.title}>
        <span>{index+1}</span>
        <div><small>LESSON {index+1}</small><strong>{item.title}</strong></div>
      </section>)}
    </div>
    <div className="hcf-core" aria-hidden="true">
      <span>{frame.topicCode}</span><i>→</i><b>{lesson.title}</b><i>→</i><span>{stage==='recap'?'RETRIEVAL':'SOURCE CONCEPTS'}</span>
    </div>
    <footer>Hodder source-backed classroom sequence · {lesson.pages.length>1?`pp.${lesson.pages[0]}–${lesson.pages.at(-1)}`:`p.${lesson.pages[0]}`}</footer>
  </div>;
}
