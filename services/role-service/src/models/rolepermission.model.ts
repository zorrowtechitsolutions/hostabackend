import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

interface IRolePermission {
  id: number;
  roleId: number;
  permissionId: number;

  hospitalId?: number;
  labId?: number;
  pharmacyId?: number;
}

interface RolePermissionCreation
  extends Optional<IRolePermission, "id"> {}

class RolePermission
  extends Model<IRolePermission, RolePermissionCreation>
  implements IRolePermission {

  public id!: number;
  public roleId!: number;
  public permissionId!: number;

  public hospitalId?: number;
  public labId?: number;
  public pharmacyId?: number;
}

RolePermission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    labId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    pharmacyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "RolePermission",
    tableName: "role_permissions",
    timestamps: false,
  }
);

export default RolePermission;