import { CHAPTER_7 } from '../teaching/lesson-content-chapter7-complete';
import { LESSON_CHAPTERS as SOURCE_CHAPTERS } from '../teaching/lesson-content-source-complete';
import type { HodderLessonSlide } from '../teaching/lesson-content-hodder-types';
import {
  buildTopicPlan,
  flattenTopicPages,
  type LessonTopic,
  type TopicPage,
} from '../teaching/lesson-topic-plan';

export type StudyChapter = (typeof SOURCE_CHAPTERS)[number] | typeof CHAPTER_7;

export const STUDENT_STUDY_CHAPTERS: StudyChapter[] = [...SOURCE_CHAPTERS, CHAPTER_7]
  .sort((a, b) => a.number - b.number);

export function studentStudyChapter(number: number) {
  return STUDENT_STUDY_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
}

export function studentStudyTopics(chapter: StudyChapter): LessonTopic[] {
  return buildTopicPlan(chapter.slides as readonly HodderLessonSlide[], chapter.subtopics);
}

export function studentStudyPages(chapter: StudyChapter) {
  return flattenTopicPages(studentStudyTopics(chapter));
}

export function studentStudyUrl(chapterNo: number, topicCode: string, pageIndex: number) {
  return `oquvchi/darslar?chapter=${chapterNo}&topic=${encodeURIComponent(topicCode)}&page=${pageIndex + 1}`;
}

export function pageSlideIds(page: TopicPage) {
  return [...new Set(page.slides.map((slide) => slide.id))];
}

export type StudentStudyLocation = {
  topics: LessonTopic[];
  flatPages: ReturnType<typeof flattenTopicPages>;
  topic: LessonTopic;
  page: TopicPage;
  pageIndex: number;
  flatIndex: number;
  legacySlideMatched: boolean;
};

/**
 * Resolve the canonical Chapter -> Topic -> Page location.
 *
 * `slide` is accepted only as a backwards-compatible inbound deep link. New
 * navigation never emits slide-based URLs; a legacy slide is mapped to the
 * semantic topic/page that contains it.
 */
export function resolveStudentStudyLocation(
  chapter: StudyChapter,
  topicParam: string | null,
  pageParam: string | null,
  legacySlideId: string | null = null,
): StudentStudyLocation | null {
  const topics = studentStudyTopics(chapter);
  const flatPages = flattenTopicPages(topics);
  if (!flatPages.length) return null;

  const explicitTopic = topicParam ? topics.find((topic) => topic.code === topicParam) : null;
  if (explicitTopic?.pages.length) {
    const requested = Number(pageParam ?? '1');
    const pageIndex = Math.max(
      0,
      Math.min(explicitTopic.pages.length - 1, Number.isFinite(requested) ? Math.trunc(requested) - 1 : 0),
    );
    const page = explicitTopic.pages[pageIndex]!;
    const flatIndex = flatPages.findIndex((item) => item.topic.code === explicitTopic.code && item.page.id === page.id);
    return { topics, flatPages, topic: explicitTopic, page, pageIndex, flatIndex, legacySlideMatched: false };
  }

  if (legacySlideId) {
    const flatIndex = flatPages.findIndex((item) => item.page.slides.some((slide) => slide.id === legacySlideId));
    if (flatIndex >= 0) {
      const target = flatPages[flatIndex]!;
      return {
        topics,
        flatPages,
        topic: target.topic,
        page: target.page,
        pageIndex: target.pageIndex,
        flatIndex,
        legacySlideMatched: true,
      };
    }
  }

  const first = flatPages[0]!;
  return {
    topics,
    flatPages,
    topic: first.topic,
    page: first.page,
    pageIndex: first.pageIndex,
    flatIndex: 0,
    legacySlideMatched: false,
  };
}

/** Legacy helper kept for existing callers/tests while slide URLs are retired. */
export function resolveStudySlideIndex(chapter: StudyChapter, slideId: string | null) {
  if (!slideId) return 0;
  const index = chapter.slides.findIndex((slide) => slide.id === slideId);
  return index < 0 ? 0 : index;
}
