export const UserRoles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  DEPARTMENT_HEAD: 'department_head',
  EMPLOYEE: 'employee',
} as const;

export type UserRole = typeof UserRoles[keyof typeof UserRoles];

export const RoleLabels = {
  [UserRoles.OWNER]: 'System Owner',
  [UserRoles.ADMIN]: 'Administrator',
  [UserRoles.MANAGER]: 'Manager',
  [UserRoles.DEPARTMENT_HEAD]: 'Manager',
  [UserRoles.EMPLOYEE]: 'Regular Employee',
} as const;

export const RoleHierarchy = {
  [UserRoles.OWNER]: 40,
  [UserRoles.ADMIN]: 30,
  [UserRoles.MANAGER]: 20,
  [UserRoles.DEPARTMENT_HEAD]: 20,
  [UserRoles.EMPLOYEE]: 0,
} as const;
