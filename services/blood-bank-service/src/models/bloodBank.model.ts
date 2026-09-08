import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

/* =======================
   INTERFACE
======================= */

interface IBloodBank {
  id: number;
  stockNumber: number;
  stockId?: string; // Virtual ID
  hospitalId: number;
  bloodGroup: string;
  count: number;
  isDelete?: boolean;
}

/* =======================
   CREATION TYPE
======================= */

type BloodBankCreationAttributes = Optional<
  IBloodBank,
  "id" |"stockNumber"| "stockId" | "count" | "isDelete"
>;

/* =======================
   MODEL CLASS
======================= */

class BloodBank
  extends Model<IBloodBank, BloodBankCreationAttributes>
  implements IBloodBank
{
  public id!: number;
  public stockNumber!: number;

  public readonly stockId!: string;
  public hospitalId!: number;
  public bloodGroup!: string;
  public count!: number;
  public isDelete?: boolean;

  // timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/* =======================
   INIT MODEL
======================= */

BloodBank.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
   stockId: {
  type: DataTypes.VIRTUAL,
  get() {
    const num = this.getDataValue("stockNumber");

    return num
      ? `#BLD${String(num).padStart(5, "0")}`
      : "#BLD00000";
  },
},
stockNumber: {
  type: DataTypes.INTEGER,
  allowNull: false,
},
    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bloodGroup: {
      type: DataTypes.ENUM("A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"),
      allowNull: false,
    },
    count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isDelete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
   
  },

  {
    sequelize,
    modelName: "BloodBank",
    tableName: "blood_banks",
    timestamps: true,
    paranoid: true, // Enables Soft Delete

    indexes: [
       {
    unique: true,
    fields: ["hospitalId", "stockNumber"],
  },
      {
        unique: true,
        fields: ["hospitalId", "bloodGroup"], // Each hospital has unique blood group entries
      },
    ],
  }
);

export default BloodBank;
