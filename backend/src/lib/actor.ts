export interface Actor {
  id: string;
  role: 'owner' | 'teacher' | 'student';
  schoolId: string | null;
  fullName: string;
}
