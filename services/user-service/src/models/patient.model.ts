import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import User from "./user.model";

interface ILocation {
  country?: string;
  state?: string;
  district?: string;
  place: string;
  pincode: number;
}

interface IPatient {
  id: number;
  patientId?: string;
  patientNumber?: number;

  userId?: number;
  hospitalId: number;

  name: string;

  bloodGroup?: string;
  gender: string;
  maritalStatus?: string;
  patientType?: string;

  age?: number;
  dob?: Date;

  mobileNumber: string;
  emergencyNumber?: string;
  guardianName?: string;

  addressLine: string;

  location: ILocation;
  hospitalName: string;

  email?: string;
  password?: string;

  vitals?: any[];

  deleteDate?: Date;
  isActive?: boolean;
  isDelete?: boolean;
}

class Patient extends Model<IPatient> implements IPatient {
  public id!: number;
  public readonly patientId!: string;
  public patientNumber!: number;

  public userId!: number;
  public hospitalId!: number;

  public name!: string;

  public bloodGroup?: string;
  public gender!: string;
  public maritalStatus!: string;
  public patientType?: string;

  public age!: number;
  public dob!: Date;

  public mobileNumber!: string;
  public emergencyNumber!: string;
  public guardianName!: string;

  public addressLine!: string;

  public email!: string;
  public password!: string;

  public location!: ILocation;
  public hospitalName!: string;
  public readonly vitals?: any[];

  public deleteDate?: Date;
  public isActive?: boolean;
  public isDelete?: boolean;
}

Patient.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    patientNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    patientId: {
      type: DataTypes.VIRTUAL,
      get() {
        const num = this.getDataValue("patientNumber");
        return num ? `#PT${String(num).padStart(4, "0")}` : "#PT0000";
      },
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,

      references: {
        model: "users",
        key: "id",
      },

      onDelete: "CASCADE",
    },

    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Basic Info
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // ENUMS
    bloodGroup: {
      type: DataTypes.ENUM(
        "A+",
        "A-",
        "B+",
        "B-",
        "O+",
        "O-",
        "AB+",
        "AB-"
      ),
      allowNull: true,
    },

    gender: {
      type: DataTypes.ENUM("Male", "Female", "Other"),
      allowNull: false,
    },

    maritalStatus: {
      type: DataTypes.ENUM(
        "Single",
        "Married",
        "Divorced",
        "Widowed"
      ),
      allowNull: true,
    },

    patientType: {
      type: DataTypes.ENUM("Inpatient", "Outpatient"),
      allowNull: true,
    },

    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    dob: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    // Contact
    mobileNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    emergencyNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    guardianName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    addressLine: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Location JSON
    location: {
      type: DataTypes.JSONB,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,

      validate: {
        isEmail: true,
      },
    },
    hospitalName:{
      type: DataTypes.STRING,
      allowNull: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // ✅ Soft Delete Fields
    deleteDate: {
      type: DataTypes.DATE,
      allowNull: true,
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
    modelName: "Patient",
    tableName: "patients",
    timestamps: true,
  }
);

// 🔗 Associations
User.hasMany(Patient, {
  foreignKey: "userId",
  as: "patients",
});

Patient.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

export default Patient;