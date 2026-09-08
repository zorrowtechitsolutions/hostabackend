import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

interface IDoctorHospital {
  id: number;
  doctorId: number;
  hospitalId: number;
  status?: string;
  joinedAt?: Date;
  leftAt?: Date;
}

type DoctorHospitalCreationAttributes = Optional<IDoctorHospital, 'id'>;

class DoctorHospital extends Model<IDoctorHospital, DoctorHospitalCreationAttributes> implements IDoctorHospital {
  public id!: number;
  public doctorId!: number;
  public hospitalId!: number;
  public status?: string;
  public joinedAt?: Date;
  public leftAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DoctorHospital.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    leftAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'DoctorHospital',
    tableName: 'doctor_hospitals',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["doctorId", "hospitalId"],
      },
    ],  

  }
);

export default DoctorHospital;
