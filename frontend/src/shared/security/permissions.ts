export const DEFAULT_PERMISSIONS = {
  dashboardRead: 'dashboard.read',
  hrmsEmployeeReadAll: 'hrms.employee.read.all',
  hrmsEmployeeReadTeam: 'hrms.employee.read.team',
  hrmsEmployeeReadSelf: 'hrms.employee.read.self',
  hrmsLeaveApprove: 'hrms.leave.approve',
  osGoalReadAll: 'os.goal.read.all',
  osGoalReadTeam: 'os.goal.read.team',
  osGoalReadSelf: 'os.goal.read.self',
  securityRead: 'security.read',
  securityManage: 'security.manage'
};

export const ROLE_PERMISSION_FALLBACK: Record<string, string[]> = {
  Admin: Object.values(DEFAULT_PERMISSIONS),
  HR: [
    DEFAULT_PERMISSIONS.dashboardRead,
    DEFAULT_PERMISSIONS.hrmsEmployeeReadAll,
    DEFAULT_PERMISSIONS.hrmsLeaveApprove,
    DEFAULT_PERMISSIONS.osGoalReadAll,
    DEFAULT_PERMISSIONS.securityRead
  ],
  Manager: [
    DEFAULT_PERMISSIONS.dashboardRead,
    DEFAULT_PERMISSIONS.hrmsEmployeeReadTeam,
    DEFAULT_PERMISSIONS.hrmsEmployeeReadSelf,
    DEFAULT_PERMISSIONS.hrmsLeaveApprove,
    DEFAULT_PERMISSIONS.osGoalReadTeam,
    DEFAULT_PERMISSIONS.osGoalReadSelf
  ],
  Employee: [
    DEFAULT_PERMISSIONS.dashboardRead,
    DEFAULT_PERMISSIONS.hrmsEmployeeReadSelf,
    DEFAULT_PERMISSIONS.osGoalReadSelf
  ],
  Finance: [
    DEFAULT_PERMISSIONS.dashboardRead,
    DEFAULT_PERMISSIONS.hrmsEmployeeReadAll,
    DEFAULT_PERMISSIONS.osGoalReadAll
  ]
};
