import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";




interface IPermission {
  id: number;
  module: string;
  action: string;
}

class Permission
  extends Model<IPermission>
  implements IPermission {

  public id!: number;
  public module!: string;
  public action!: string;
}

Permission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    module: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Permission",
    tableName: "permissions",
    timestamps: false,
  }
);


export default Permission;