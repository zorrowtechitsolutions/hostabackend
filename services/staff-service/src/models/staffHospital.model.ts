import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

interface IStaffHospital {
  id: number;
  staffId: number;
  hospitalId: number;
  status?: string;
  joinedAt?: Date;
  leftAt?: Date;
}

type StaffHospitalCreationAttributes = Optional<IStaffHospital, 'id'>;

class StaffHospital extends Model<IStaffHospital, StaffHospitalCreationAttributes> implements IStaffHospital {
  public id!: number;
  public staffId!: number;
  public hospitalId!: number;
  public status?: string;
  public joinedAt?: Date;
  public leftAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StaffHospital.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    staffId: {
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
    modelName: 'StaffHospital',
    tableName: 'staff_hospitals',
    timestamps: true,
     indexes: [
    {
      unique: true,
      fields: ["staffId", "hospitalId"],
    },
  ],

  }
);

export default StaffHospital;
