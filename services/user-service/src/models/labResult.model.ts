import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

interface ILabResult {
  id: number;
  labId: number;
  userId: number;
  hospitalId: number;
  patientId: number;
  doctorId: number;
  department: string;
  testName: string;
  imageUrl?: string;
  hospitalName?: string;
  patientName?: string;
  doctorName?: string;
  labName?: string;
  status: "received" | "progress" | "pending";
  isActive?: boolean;
}

type LabResultCreationAttributes = Optional<
  ILabResult,
  "id" | "imageUrl" | "status" | "isActive"
>;

class LabResult extends Model<ILabResult, LabResultCreationAttributes> implements ILabResult {
  public id!: number;
  public labId!: number;
  public hospitalId!: number;
  public patientId!: number;
  public doctorId!: number;
  public department!: string;
  public testName!: string;
  public imageUrl?: string;
  public status!: "received" | "progress" | "pending";
  public isActive?: boolean;
  public userId: number;
  public hospitalName?: string;
  public labName?: string;
  public patientName?: string;
  public doctorName?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LabResult.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    labId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

      userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

     hospitalName: {
      type: DataTypes.STRING,
    },

       labName: {
      type: DataTypes.STRING,
    },

      patientName: {
      type: DataTypes.STRING,
    },

      doctorName: {
      type: DataTypes.STRING,
    },


    department: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    testName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("received", "progress", "pending"),
      allowNull: false,
      defaultValue: "pending",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "LabResult",
    tableName: "lab_result",
    timestamps: true,
    indexes: [
      { fields: ["labId"] },
      { fields: ["hospitalId"] },
      { fields: ["patientId"] },
      { fields: ["doctorId"] },
      { fields: ["status"] },
    ],
  }
);

export default LabResult;
