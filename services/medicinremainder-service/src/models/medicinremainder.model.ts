import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

/* =======================
   INTERFACE
======================= */

interface IMedicineSchedule {
  id: number;
  scheduleId?: string; // Virtual ID
  userId: number; // Owner — references users table in user-service DB
  medicineName: string;
  dosage: string; // e.g. 500mg
  days: string[]; // ["Monday","Wednesday"]
  timeSlots: string[]; // ["08:00","14:00"]
  startDate: Date;
  endDate?: Date;
  isActive?: boolean;
}

/* =======================
   MODEL
======================= */

type MedicineScheduleCreationAttributes =
  Optional<
    IMedicineSchedule,
    "id" | "endDate" | "isActive" | "scheduleId"
  >;

class MedicineSchedule
  extends Model<
    IMedicineSchedule,
    MedicineScheduleCreationAttributes
  >
  implements IMedicineSchedule
{
  public id!: number;
  public readonly scheduleId!: string;
  public userId!: number;
  public medicineName!: string;
  public dosage!: string;
  public days!: string[];
  public timeSlots!: string[];
  public startDate!: Date;
  public endDate?: Date;
  public isActive?: boolean;
}

MedicineSchedule.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    scheduleId: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        if (!id) return null;
        return `#MED${String(id).padStart(5, "0")}`;
      },
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    medicineName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    dosage: {
      type: DataTypes.STRING,
    },

    days: {
      type: DataTypes.JSONB, // ["Monday","Tuesday"]
      allowNull: false,
    },

    timeSlots: {
      type: DataTypes.JSONB, // ["08:00","20:00"]
      allowNull: false,
    },

    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    endDate: {
      type: DataTypes.DATE,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "medicine_schedules",
    modelName: "MedicineSchedule",
    timestamps: true,
    paranoid:true
  }
);

export default MedicineSchedule;


