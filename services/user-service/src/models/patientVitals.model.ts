import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import Patient from "./patient.model";

interface IPatientVitals {
  id: number;
  patientId: number;
  prescriptionId: number;

  temperature?: number;
  pulse?: number;
  respiratoryRate?: number;
  spo2?: number;

  height?: number;
  weight?: number;
  bmi?: number;
  waist?: number;
  bsa?: number;
}

class PatientVitals extends Model<IPatientVitals> implements IPatientVitals {
  public id!: number;
  public patientId!: number;

  public temperature!: number;
  public pulse!: number;
  public respiratoryRate!: number;
  public spo2!: number;

  public height!: number;
  public weight!: number;
  public bmi!: number;
  public waist!: number;
  public bsa!: number;
  public prescriptionId: number;
}

PatientVitals.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    prescriptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,

    },

    temperature: DataTypes.FLOAT,
    pulse: DataTypes.INTEGER,
    respiratoryRate: DataTypes.INTEGER,
    spo2: DataTypes.FLOAT,

    height: DataTypes.FLOAT, // cm
    weight: DataTypes.FLOAT, // kg
    bmi: DataTypes.FLOAT,
    waist: DataTypes.FLOAT,
    bsa: DataTypes.FLOAT,
  },
  {
    sequelize,
    modelName: "PatientVitals",
    tableName: "patient_vitals",
    timestamps: true,
  }
);

// 🔗 Associations: One Patient → Many Vitals
Patient.hasMany(PatientVitals, {
  foreignKey: "patientId",
  as: "vitals",
});

PatientVitals.belongsTo(Patient, {
  foreignKey: "patientId",
  as: "patient",
});

export default PatientVitals;
