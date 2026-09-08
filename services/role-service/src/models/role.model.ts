// import { DataTypes, Model, Optional } from "sequelize";
// import sequelize from "../config/db";

// interface IRole {
//   id: number;
//   name: string;
//   description?: string;
//   hospitalId?: number;
//   labId?: number;
//   isActive: boolean;
// }

// interface RoleCreation
//   extends Optional<IRole, "id"> {}

// class Role
//   extends Model<IRole, RoleCreation>
//   implements IRole {

//   public id!: number;
//   public name!: string;
//   public description?: string;
//   public hospitalId?: number;
//   public labId?: number;
//   public isActive!: boolean;
// }

// Role.init(
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       autoIncrement: true,
//       primaryKey: true,
//     },

//     name: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },

//     description: {
//       type: DataTypes.STRING,
//     },

//     hospitalId: {
//       type: DataTypes.INTEGER,
//       allowNull: true,
//     },

//     labId: {
//       type: DataTypes.INTEGER,
//       allowNull: true,
//     },

//     isActive: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: true,
//     },
//   },
//   {
//     sequelize,
//     modelName: "Role",
//     tableName: "roles",
//     timestamps: true,
//   }
// );

// export default Role;





import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

interface IRole {
  id: number;
  name: string;
  description?: string;
  hospitalId?: number;
  labId?: number;
  pharmacyId?: number;
  isActive: boolean;
}

interface RoleCreation
  extends Optional<IRole, "id"> {}

class Role
  extends Model<IRole, RoleCreation>
  implements IRole {

  public id!: number;
  public name!: string;
  public description?: string;
  public hospitalId?: number;
  public labId?: number;
  public isActive!: boolean;
  public pharmacyId?: number;
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    description: {
      type: DataTypes.STRING,
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

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Role",
    tableName: "roles",
    timestamps: true,
  }
);

export default Role;