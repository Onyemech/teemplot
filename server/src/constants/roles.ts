export const UserRoles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  DEPARTMENT_HEAD: 'department_head',
  EMPLOYEE: 'employee',
} as const;

export type UserRole = typeof UserRoles[keyof typeof UserRoles];

export const RoleHierarchy = {
  [UserRoles.OWNER]: 40,
  [UserRoles.ADMIN]: 30,
  [UserRoles.MANAGER]: 25,
  [UserRoles.DEPARTMENT_HEAD]: 20,
  [UserRoles.EMPLOYEE]: 0,
} as const;

export function hasRole(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = RoleHierarchy[userRole as UserRole] || 0;
  const requiredLevel = RoleHierarchy[requiredRole];
  return userLevel >= requiredLevel;
}
