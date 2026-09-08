import { useEffect, type ComponentProps } from 'react';
import './lesson-studio-source-figure-fix.css';
import './lesson-question-flat-list.css';
import './lesson-question-workspace-v2.css';
import './lesson-question-workspace-controls.css';
import './lesson-question-answer-contrast.css';
import './lesson-studio-v3.css';
import './lesson-exam-insights.css';
import './lesson-student-facing.css';
import './lesson-library-card-fix.css';
import './lesson-studio-design-refresh.css';
import './lesson-studio-design-refresh-responsive.css';
import './lesson-library-v2.css';
import './lesson-library-v3.css';
import './lesson-course-structure.css';
import './lesson-studio-scroll-fix.css';
import './lesson-studio-board-scroll-fix.css';
import './lesson-topic-pages.css';
import './lesson-topic-pages-hardening.css';
import './lesson-topic-ch7-source-evidence.css';
import { LessonStudio as LessonStudioV2 } from './LessonStudioV2';
import { installLessonExamInsights } from './lesson-exam-insights';
import { installLessonExamWorkspaceV3 } from './lesson-exam-workspace-v3';
import { installLessonQuestionWorkspaceControls } from './lesson-question-workspace-controls';
import { installLessonSlideScrollController } from './lesson-studio-scroll-controller';
import { installLessonStudioProfessionalControls } from './lesson-studio-professional-controls';

type LessonStudioProps = ComponentProps<typeof LessonStudioV2>;

export function LessonStudio(props: LessonStudioProps) {
  useEffect(() => {
    const releaseProfessionalControls = installLessonStudioProfessionalControls();
    const releaseExamWorkspace = installLessonExamWorkspaceV3();
    const releaseExamInsights = installLessonExamInsights();
    const releaseWorkspaceControls = installLessonQuestionWorkspaceControls();
    const releaseSlideScroll = installLessonSlideScrollController();
    return () => {
      releaseSlideScroll();
      releaseWorkspaceControls();
      releaseExamInsights();
      releaseExamWorkspace();
      releaseProfessionalControls();
    };
  }, []);
  return <LessonStudioV2 {...props} />;
}
