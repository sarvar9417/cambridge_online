import { useEffect, useMemo, useState } from 'react';
import { api, type LessonProgress } from '../lib/api';
import { useRoute } from '../lib/router';
import { STUDENT_STUDY_CHAPTERS } from './StudentLessons';
import './student-lesson-progress.css';

export function completedForChapter(progress: LessonProgress[], chapterNo: number) {
  return new Set(progress.filter((item) => item.chapterNo === chapterNo && item.completedAt).map((item) => item.slideId));
}

export function StudentLessonProgress() {
  const route = useRoute();
  const chapterNo = Number(route.params.get('chapter') || 0);
  const slideId = route.params.get('slide') ?? '';
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
    if (![1, 7, 13].includes(chapterNo) || !slideId) return;
    void api<LessonProgress>('/content/lessons/progress', {
      method: 'PUT',
      body: JSON.stringify({ chapterNo, slideId, completed:false }),
    }).then((saved) => {
      setProgress((current) => [saved, ...current.filter((item) => !(item.chapterNo === saved.chapterNo && item.slideId === saved.slideId))]);
    }).catch(() => {});
  }, [chapterNo, slideId]);

  const totalSlides = useMemo(() => STUDENT_STUDY_CHAPTERS.reduce((sum, chapter) => sum + chapter.slides.length, 0), []);
  const completedTotal = new Set(progress.filter((item) => item.completedAt).map((item) => `${item.chapterNo}:${item.slideId}`)).size;
  const chapter = STUDENT_STUDY_CHAPTERS.find((item) => item.number === chapterNo);
  const completedInChapter = chapter ? completedForChapter(progress, chapterNo) : new Set<string>();
  const currentComplete = Boolean(slideId && completedInChapter.has(slideId));

  const markComplete = async () => {
    if (!chapter || !slideId || currentComplete || saving) return;
    setSaving(true);
    try {
      const saved = await api<LessonProgress>('/content/lessons/progress', {
        method: 'PUT',
        body: JSON.stringify({ chapterNo, slideId, completed:true }),
      });
      setProgress((current) => [saved, ...current.filter((item) => !(item.chapterNo === saved.chapterNo && item.slideId === saved.slideId))]);
    } finally {
      setSaving(false);
    }
  };

  return <section className="slp" aria-label="Dars progressi">
    <div className="slp-overall">
      <span>STUDY PROGRESS</span>
      <strong>{completedTotal}/{totalSlides}</strong>
      <div aria-hidden="true"><i style={{width:`${totalSlides ? (completedTotal / totalSlides) * 100 : 0}%`}} /></div>
    </div>
    {chapter ? <div className="slp-current">
      <span>Chapter {chapter.number}</span>
      <strong>{completedInChapter.size}/{chapter.slides.length} qism tugallangan</strong>
      <button type="button" disabled={!slideId || currentComplete || saving} onClick={markComplete}>
        {currentComplete ? '✓ Tugallangan' : saving ? 'Saqlanmoqda…' : 'Bu qismni tugatdim'}
      </button>
    </div> : <p>Chapter ochilganda o‘qilgan va tugallangan qismlar barcha qurilmalarda saqlanadi.</p>}
  </section>;
}
