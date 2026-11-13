export type AccessEventDto = {
  id: string;
  at: string;
  kind: 'login' | 'logout';
  userName: string;
  roleName: string;
  /** ว่าง = บัญชีถูกลบไปแล้ว */
  branch: string;
  ip: string | null;
  device: string;
};

export type AccessLogDto = {
  from: string;
  to: string;
  events: AccessEventDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  logins: number;
  logouts: number;
  ipCount: number;
};
