import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

/* =======================
   MEDICATION INTERFACE
======================= */

interface IMedication {
  medicine_name: string;
  dosage: string;
  duration: string;
  frequency: string;
  timing: string;
  instructions?: string;
}

/* =======================
   PRESCRIPTION INTERFACE
======================= */

interface IPrescription {

  id: number;

  prescriptionNumber: number;
  prescriptionId?: string;
  bookingId: number; // 🔥 important
  userId: number;
  patientId?: number;
  patientName: string;
  hospitalName: string;
  doctorId: number;
  hospitalId: number;

  complaint: string;

  medications: IMedication[];

  investigations?: string[];

  advice?: string;

  next_consultation?: Date;

  empty_stomach?: boolean;
  date?: Date; 
  prescribedBy: string;
  canvasBg : string;
  design: string[];
  gender: string;
  age: number;
  contact: string;

  deleteDate?: Date;
  isActive?: boolean;
  isDelete?: boolean;

}

/* =======================
   OPTIONAL FIELDS
======================= */

type PrescriptionCreationAttributes =
  Optional<
    IPrescription,
    | "id"
    | "patientId"
    | "investigations"
    | "advice"
    | "next_consultation"
    | "empty_stomach"
    | "deleteDate"
    | "isActive"
    | "isDelete"
    
  >;

/* =======================
   MODEL CLASS
======================= */

class Prescription
  extends Model<
    IPrescription,
    PrescriptionCreationAttributes
  >
  implements IPrescription
{

  public id!: number;

  public prescriptionNumber!: number;
  public prescriptionId?: string;
  public bookingId!: number;
  public userId!: number;
  public patientId?: number;
  public doctorId!: number;
  public hospitalId!: number;

  public complaint!: string;

  public medications!: IMedication[];

  public investigations?: string[];

  public advice?: string;

  public next_consultation?: Date;

  public empty_stomach?: boolean;
  public date?: Date;

  public deleteDate?: Date;
  public isActive?: boolean;
  public isDelete?: boolean;
  public prescribedBy: string;

  public canvasBg: string;
  public design: string[];

  public hospitalName: string;
  public patientName: string;

  public age: number;
  public contact: string;
  public gender: string;
  

} 

/* =======================
   INIT
======================= */

Prescription.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    prescriptionNumber: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null temporarily to not break existing rows before backfill
    },

    prescriptionId: {
      type: DataTypes.VIRTUAL,
      get() {
        const num = this.getDataValue("prescriptionNumber");
        return num
          ? `#PRS${String(num).padStart(5, "0")}`
          : "#PRS00000";
      },
    },

    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    prescribedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  

      age: {
      type: DataTypes.INTEGER,
      
    },

      contact: {
      type: DataTypes.STRING,
    },
      gender: {
      type: DataTypes.STRING,
    },

    patientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    complaint: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    medications: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    investigations: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    advice: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    next_consultation: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    empty_stomach: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

      date: {
      type: DataTypes.DATE,
    },
    
    deleteDate: {
      type: DataTypes.DATE,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    isDelete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

       canvasBg:
    {
      type: DataTypes.STRING,
    },


       hospitalName:
    {
      type: DataTypes.STRING,
    },


       patientName:
    {
      type: DataTypes.STRING,
    },


    design: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },

  },

  {
    sequelize,
    modelName: "Prescription",
    tableName: "prescriptions",
    timestamps: true,
  }
);

import Patient from "./patient.model";

Prescription.belongsTo(Patient, {
  foreignKey: "patientId",
  targetKey: "patientNumber",
  as: "patientDetails"
});

export default Prescription;