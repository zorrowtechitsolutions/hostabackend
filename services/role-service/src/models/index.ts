import Role from "./role.model";
import Permission from "./permission.model";
import RolePermission from "./rolepermission.model";

// associations ONLY HERE
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: "roleId",
  otherKey: "permissionId",
});

Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: "permissionId",
  otherKey: "roleId",
});

export { Role, Permission, RolePermission };