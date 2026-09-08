import { useEffect, useMemo, useState } from 'react';
import { api, type LessonProgress } from '../lib/api';
import { useRoute } from '../lib/router';
import {
  STUDENT_STUDY_CHAPTERS,
  pageSlideIds,
  resolveStudentStudyLocation,
  studentStudyChapter,
  studentStudyPages,
  type StudyChapter,
} from './student-lesson-topic-model';
import './student-lesson-progress.css';

export function completedForChapter(progress: LessonProgress[], chapterNo: number, validSlideIds?: Set<string>) {
  return new Set(
    progress
      .filter((item) => item.chapterNo === chapterNo && item.completedAt && (!validSlideIds || validSlideIds.has(item.slideId)))
      .map((item) => item.slideId),
  );
}

export function completedPagesForChapter(progress: LessonProgress[], chapter: StudyChapter) {
  const validSlideIds=new Set(chapter.slides.map(slide=>slide.id));
  const completedSlides=completedForChapter(progress,chapter.number,validSlideIds);
  return new Set(
    studentStudyPages(chapter)
      .filter(({page})=>{
        const ids=pageSlideIds(page);
        return ids.length>0&&ids.every(id=>completedSlides.has(id));
      })
      .map(({page})=>page.id),
  );
}

function mergeProgress(current:LessonProgress[], saved:LessonProgress[]) {
  const keys=new Set(saved.map(item=>`${item.chapterNo}:${item.slideId}`));
  return [...saved,...current.filter(item=>!keys.has(`${item.chapterNo}:${item.slideId}`))];
}

export function StudentLessonProgress() {
  const route = useRoute();
  const chapterNo = Number(route.params.get('chapter') || 0);
  const chapter = studentStudyChapter(chapterNo);
  const location=chapter?resolveStudentStudyLocation(
    chapter,
    route.params.get('topic'),
    route.params.get('page'),
    route.params.get('slide'),
  ):null;
  const currentSlideIds=location?pageSlideIds(location.page):[];
  const currentPageKey=location?`${chapterNo}:${location.page.id}`:'';
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api<{data:LessonProgress[]}>('/content/lessons/progress')
      .then((result) => { if (!cancelled) setProgress(result.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!chapter || !currentSlideIds.length) return;
    let cancelled=false;
    void Promise.all(currentSlideIds.map(slideId=>api<LessonProgress>('/content/lessons/progress', {
      method: 'PUT',
      body: JSON.stringify({ chapterNo: chapter.number, slideId, completed:false }),
    }))).then(saved=>{if(!cancelled)setProgress(current=>mergeProgress(current,saved));}).catch(()=>{});
    return()=>{cancelled=true;};
  }, [chapterNo, currentPageKey]);

  const totalPages = useMemo(
    () => STUDENT_STUDY_CHAPTERS.reduce((sum, item) => sum + studentStudyPages(item).length, 0),
    [],
  );
  const completedTotal = STUDENT_STUDY_CHAPTERS.reduce(
    (sum,item)=>sum+completedPagesForChapter(progress,item).size,
    0,
  );
  const chapterPages=useMemo(()=>chapter?studentStudyPages(chapter):[],[chapter]);
  const completedInChapter=chapter?completedPagesForChapter(progress,chapter):new Set<string>();
  const completedSlidesInChapter=chapter
    ? completedForChapter(progress,chapter.number,new Set(chapter.slides.map(slide=>slide.id)))
    : new Set<string>();
  const currentComplete=Boolean(location&&currentSlideIds.length&&currentSlideIds.every(id=>completedSlidesInChapter.has(id)));

  const markComplete = async () => {
    if (!chapter || !location || !currentSlideIds.length || currentComplete || saving) return;
    setSaving(true);
    try {
      const saved=await Promise.all(currentSlideIds.map(slideId=>api<LessonProgress>('/content/lessons/progress', {
        method: 'PUT',
        body: JSON.stringify({ chapterNo: chapter.number, slideId, completed:true }),
      })));
      setProgress(current=>mergeProgress(current,saved));
    } finally {
      setSaving(false);
    }
  };

  return <section className="slp" aria-label="Dars progressi">
    <div className="slp-overall">
      <span>STUDY PROGRESS</span>
      <strong>{completedTotal}/{totalPages}</strong>
      <div aria-hidden="true"><i style={{width:`${totalPages ? (completedTotal / totalPages) * 100 : 0}%`}} /></div>
    </div>
    {chapter && location ? <div className="slp-current">
      <span>Chapter {chapter.number} · {location.topic.code==='overview'?'Overview':location.topic.code}</span>
      <strong>{completedInChapter.size}/{chapterPages.length} page tugallangan</strong>
      <button type="button" disabled={!currentSlideIds.length || currentComplete || saving} onClick={markComplete}>
        {currentComplete ? '✓ Page tugallangan' : saving ? 'Saqlanmoqda…' : 'Bu page’ni tugatdim'}
      </button>
    </div> : <p>Chapter ochilganda o‘qilgan va tugallangan semantic pages barcha qurilmalarda saqlanadi.</p>}
  </section>;
}
