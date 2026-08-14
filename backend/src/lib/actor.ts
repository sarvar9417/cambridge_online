export type UserStatus = 'pending' | 'active' | 'suspended';

export interface Actor {
  id: string;
  role: 'owner' | 'teacher' | 'student';
  schoolId: string | null;
  fullName: string;
  /**
   * Self-registered students start as `pending` and only become `active` once a
   * teacher assigns them to a class and group.
   */
  status?: UserStatus;
}
