import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from './lib/actor.js';
import { AnalyticsService } from './services/analytics-service.js';

const student: Actor = { id: 'student', role: 'student', schoolId: 'school', fullName: 'Student' };
const owner: Actor = { id: 'owner', role: 'owner', schoolId: 'school', fullName: 'Owner' };

describe('analytics authorization and calculations', () => {
  it('students cannot read a class heatmap', async () => {
    const query = vi.fn();
    await expect(
      new AnalyticsService({ query } as unknown as Pool).heatmap(student, 'class'),
    ).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalled();
  });

  it('students cannot read another student mastery', async () => {
    const query = vi.fn();
    await expect(
      new AnalyticsService({ query } as unknown as Pool).mastery(student, 'other'),
    ).rejects.toMatchObject({ status: 404 });
    expect(query).not.toHaveBeenCalled();
  });

  it('non-owners cannot read AI quality', async () => {
    const query = vi.fn();
    await expect(
      new AnalyticsService({ query } as unknown as Pool).aiQuality(student),
    ).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalled();
  });

  it('heatmap exposes evidence and numeric mastery', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rows: [{ student_id: 's', full_name: 'S', topic: 1, mastery: '0.75', evidence: '12' }],
      });
    const data = await new AnalyticsService({ query } as unknown as Pool).heatmap(owner, 'class');
    expect(data[0]).toMatchObject({ studentId: 's', mastery: 0.75, evidence: 12 });
  });

  it('mark point query retains the minimum sample threshold', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rows: [] });
    await new AnalyticsService({ query } as unknown as Pool).markPoints(owner, 'class');
    expect(query.mock.calls[1]![0]).toContain('having count(*)>=8');
  });

  it('AI quality only counts teacher-reviewed points in the owner school', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await new AnalyticsService({ query } as unknown as Pool).aiQuality(owner);
    expect(query.mock.calls[0]![0]).toContain('gp.teacher_matched is not null');
    expect(query.mock.calls[0]![0]).toContain('c.school_id=$1');
    expect(query.mock.calls[0]![1]).toEqual(['school']);
  });
});
