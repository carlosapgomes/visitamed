export interface UserTagStat {
  id: string;
  userId: string;
  tag: string;
  count: number;
  lastUsedAt: Date;
  updatedAt: Date;
}
