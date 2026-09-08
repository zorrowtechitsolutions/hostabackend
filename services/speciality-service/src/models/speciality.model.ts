import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

/* =======================
   INTERFACE
======================= */


export interface ISpeciality {
  id: number;
  name: string;
  imageUrl?: string;
  isActive?: boolean;
  isDelete?: boolean;
}

/* =======================
   CREATION TYPE
======================= */

type SpecialityCreationAttributes = Optional<
  ISpeciality,
  "id" | "imageUrl" | "isActive" | "isDelete" 
>;

/* =======================
   MODEL CLASS
======================= */

class Speciality
  extends Model<ISpeciality, SpecialityCreationAttributes>
  implements ISpeciality
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

Speciality.init(
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
    modelName: "Speciality",
    tableName: "specialitys",
    timestamps: true,

    indexes: [
      {
        fields: ["name"],
      },
    ],
  }
);

export default Speciality;