import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

/* =======================
   INTERFACE
======================= */


export interface ICategory {
  id: number;
  name: string;
  imageUrl?: string;
  isActive?: boolean;
  isDelete?: boolean;
}

/* =======================
   CREATION TYPE
======================= */

type CategoryCreationAttributes = Optional<
  ICategory ,
  "id" | "imageUrl" | "isActive" | "isDelete" 
>;

/* =======================
   MODEL CLASS
======================= */

class Category
  extends Model<ICategory , CategoryCreationAttributes>
  implements ICategory 
{
  public id!: number;
  public name!: string;
  public imageUrl?: string;
  public isActive?: boolean;
  public isDelete?: boolean;

  // timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/* =======================
   INIT MODEL
======================= */

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },

    imageUrl: {
      type: DataTypes.STRING, // 🔥 store imageUrl + public_id
      allowNull: true
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    isDelete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "Category",
    tableName: "category",
    timestamps: true,

    indexes: [
      {
        fields: ["name"],
      },
    ],
  }
);

export default Category;