import { useEffect, type ComponentProps } from 'react';
import './lesson-studio-source-figure-fix.css';
import './lesson-question-flat-list.css';
import './lesson-question-workspace-v2.css';
import './lesson-question-workspace-controls.css';
import './lesson-question-answer-contrast.css';
import './lesson-studio-v3.css';
import './lesson-exam-insights.css';
import './lesson-student-facing.css';
import './lesson-exam-workspace-v3';
import './lesson-exam-insights';
import './lesson-library-card-fix.css';
import { LessonStudio as LessonStudioV2 } from './LessonStudioV2';
import { installLessonQuestionWorkspaceControls } from './lesson-question-workspace-controls';
import { installLessonStudioProfessionalControls } from './lesson-studio-professional-controls';

type LessonStudioProps = ComponentProps<typeof LessonStudioV2>;

export function LessonStudio(props: LessonStudioProps) {
  useEffect(() => {
    const releaseProfessionalControls = installLessonStudioProfessionalControls();
    const releaseWorkspaceControls = installLessonQuestionWorkspaceControls();
    return () => {
      releaseWorkspaceControls();
      releaseProfessionalControls();
    };
  }, []);
  return <LessonStudioV2 {...props} />;
}
