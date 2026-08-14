import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { ExportService } from "./services/export-service.js";
const teacher = {
    id: "t",
    role: "teacher" as const,
    schoolId: "s",
    fullName: "T",
  },
  student = { ...teacher, id: "u", role: "student" as const };
describe("export authorization", () => {
  it("rejects incompatible export kinds before querying",async()=>{const query=vi.fn();await expect(new ExportService({query}as unknown as Pool).create(teacher,{kind:'feedback',refTable:'assignments',refId:'a'})).rejects.toMatchObject({code:'invalid_export_kind',status:400});expect(query).not.toHaveBeenCalled()});
  it("hides an assignment outside teacher classes", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    await expect(
      new ExportService({ query } as unknown as Pool).create(teacher, {
        kind: "question_paper",
        refTable: "assignments",
        refId: "a",
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(query.mock.calls[0]![0]).toContain("class_teachers");
  });
  it("student can export only own released submission", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    await expect(
      new ExportService({ query } as unknown as Pool).create(student, {
        kind: "feedback",
        refTable: "submissions",
        refId: "x",
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(query.mock.calls[0]![0]).toContain("released_at is not null");
  });
  it("atomically rejects the twenty-first daily export", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [{}] });
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ count: 20 }] })
      .mockResolvedValueOnce({});
    const release = vi.fn();
    const connect = vi.fn().mockResolvedValue({ query: clientQuery, release });
    await expect(
      new ExportService({ query, connect } as unknown as Pool).create(teacher, {
        kind: "question_paper",
        refTable: "assignments",
        refId: "a",
      }),
    ).rejects.toMatchObject({ code: "daily_export_limit", status: 429 });
    expect(clientQuery.mock.calls[1]![0]).toContain("pg_advisory_xact_lock");
    expect(clientQuery.mock.calls[3]![0]).toBe("rollback");
    expect(release).toHaveBeenCalled();
  });
  it("does not expose another user's export status", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    await expect(
      new ExportService({ query } as unknown as Pool).get(teacher, "export-id"),
    ).rejects.toMatchObject({ status: 404 });
    expect(query.mock.calls[0]![0]).toContain("requested_by=$2");
    expect(query.mock.calls[0]![1]).toEqual(["export-id", teacher.id]);
  });
  it('downloads only an owned unexpired completed PDF',async()=>{const query=vi.fn().mockResolvedValue({rowCount:1,rows:[{kind:'question_paper',file_data:Buffer.from('%PDF')}]});const file=await new ExportService({query}as unknown as Pool).file(teacher,'export-id');expect(file.data.toString()).toBe('%PDF');expect(query.mock.calls[0]![0]).toContain("status='succeeded'");expect(query.mock.calls[0]![0]).toContain('expires_at>now()');expect(query.mock.calls[0]![1]).toEqual(['export-id',teacher.id])});
});
