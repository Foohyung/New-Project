export interface TrainerDto {
  id: string;
  name: string;
  nickname: string;
  specialties: string[];
  bio: string;
  color: string;
  classesThisWeek: number;
  ptUpcoming: number;
}

export interface PtSessionDto {
  id: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  startsAt: string;
  minutes: number;
  status: 'booked' | 'done' | 'cancelled';
}

export interface TrainerDetailDto extends TrainerDto {
  sessions: PtSessionDto[];
  classes: { id: string; title: string; startsAt: string; minutes: number; room: string; booked: number; capacity: number }[];
  /** ผู้ใช้ปัจจุบันจัดการคิว PT ของเทรนเนอร์คนนี้ได้หรือไม่ */
  canManage: boolean;
}
