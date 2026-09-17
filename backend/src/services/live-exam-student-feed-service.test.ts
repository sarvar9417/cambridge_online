import { describe,expect,it,vi } from 'vitest';
import { LiveExamStudentFeedService } from './live-exam-student-feed-service.js';

const student={id:'11111111-1111-4111-8111-111111111111',role:'student' as const,schoolId:'school',fullName:'Student'};
const teacher={...student,id:'22222222-2222-4222-8222-222222222222',role:'teacher' as const};

describe('LiveExamStudentFeedService',()=>{
  it('shows enrolled published/live discovery separately from joined history',async()=>{
    const query=vi.fn().mockResolvedValue({rows:[
      {id:'active',title:'Active',status:'question_open',marking_mode:'peer',current_question_index:1,published_at:new Date('2026-09-17T08:00:00Z'),updated_at:new Date('2026-09-17T09:00:00Z'),class_name:'AS',participant_id:'p1',question_count:3,participant_count:12,earned:2,possible:9,allow_late_join:true},
      {id:'upcoming',title:'Upcoming',status:'published',marking_mode:'teacher',current_question_index:0,published_at:new Date('2026-09-17T08:30:00Z'),updated_at:new Date('2026-09-17T08:30:00Z'),class_name:'AS',participant_id:null,question_count:5,participant_count:0,earned:null,possible:null,allow_late_join:false},
      {id:'late',title:'Late join',status:'question_open',marking_mode:'teacher',current_question_index:0,published_at:new Date('2026-09-17T08:45:00Z'),updated_at:new Date('2026-09-17T08:45:00Z'),class_name:'AS',participant_id:null,question_count:4,participant_count:8,earned:null,possible:null,allow_late_join:true},
      {id:'finished',title:'Finished',status:'finished',marking_mode:'peer',current_question_index:2,published_at:new Date('2026-09-16T08:00:00Z'),updated_at:new Date('2026-09-16T10:00:00Z'),class_name:'AS',participant_id:'p2',question_count:3,participant_count:10,earned:7,possible:9,allow_late_join:false},
    ]});
    const service=new LiveExamStudentFeedService({query} as never);
    const feed=await service.feed(student);

    expect(feed.active.map((item)=>item.id)).toEqual(['active']);
    expect(feed.upcoming.map((item)=>item.id)).toEqual(['upcoming','late']);
    expect(feed.history.map((item)=>item.id)).toEqual(['finished']);
    expect(feed.upcoming[0]).toMatchObject({joined:false,canJoinWithCode:false,earned:null,possible:null});
    expect(feed.upcoming[1]).toMatchObject({canJoinWithCode:true});
    expect(feed.history[0]).toMatchObject({earned:7,possible:9});
    expect(String(query.mock.calls[0]?.[0])).toContain("les.status<>'draft'");
    expect(String(query.mock.calls[0]?.[0])).toContain("e.student_id=$1 and e.left_at is null");
    expect(String(query.mock.calls[0]?.[0])).not.toContain('les.join_code');
  });

  it('is students-only',async()=>{
    const query=vi.fn();
    const service=new LiveExamStudentFeedService({query} as never);
    await expect(service.feed(teacher)).rejects.toMatchObject({code:'students_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });
});
