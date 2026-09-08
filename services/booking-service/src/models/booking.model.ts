import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

/* =======================
   INTERFACE
======================= */

interface IBooking {
  id: number;

  bookingNumber: number;
  bookingId?: string;


  patient_name: string;
  patient_phone: string;
  patient_place?: string;
  patient_dob?: string;
  patient_age: number;
  patient_gender?: string;

  userId?: number;
  patientId?: number;

  hospitalName?: string;

  doctorId: number;
  hospitalId: number;

  booking_date: Date;

  consulting_time?: string;

  doctor_name: string;
  doctor_department: string;

  token?: number;

  status:
    | "pending"
    | "accepted"
    | "declined"
    | "completed"
    | "cancel";

  booking_status: "user booking" | "hospital booking";

  reason?: string;

  isActive?: boolean;
}

/* =======================
   OPTIONAL CREATE FIELDS
======================= */

type BookingCreationAttributes = Optional<
  IBooking,
  | "id"
  |"bookingNumber"
  | "bookingId"
  | "userId"
  | "patientId"
  | "patient_place"
  | "patient_dob"
  | "patient_gender"
  | "consulting_time"
  | "token"
  | "status"
  | "reason"
  | "isActive"
>;

/* =======================
   MODEL CLASS
======================= */

class Booking
  extends Model<IBooking, BookingCreationAttributes>
  implements IBooking
{
  public id!: number;

  public bookingNumber!: number;
  public readonly bookingId!: string;

  public patient_name!: string;
  public patient_phone!: string;
  public patient_place?: string;
  public patient_dob?: string;
  public patient_age!: number;
  public patient_gender?: string;

  public userId?: number;
  public patientId?: number;

  public doctorId!: number;
  public hospitalId!: number;

  public booking_date!: Date;

  public consulting_time?: string;

  public doctor_name!: string;
  public doctor_department!: string;

  public token?: number;
  public hospitalName?: string;

  public status!:
    | "pending"
    | "accepted"
    | "declined"
    | "completed"
    | "cancel";

  public booking_status!: "user booking" | "hospital booking";

  public reason?: string;

  public isActive?: boolean;

  // timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/* =======================
   INIT MODEL
======================= */

Booking.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
  bookingNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    bookingId: {
      type: DataTypes.VIRTUAL,
      get() {
        const num = this.getDataValue("bookingNumber");

        return num
          ? `#BK${String(num).padStart(5, "0")}`
          : "#BK00000";
      },
    },
    patient_name: {
      type: DataTypes.STRING(120),
      allowNull: false,

      validate: {
        notEmpty: true,
        len: [2, 120],
      },
    },

    patient_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,

      validate: {
        notEmpty: true,
        len: [10, 20],
      },
    },

    patient_place: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    patient_dob: {
      type: DataTypes.STRING,
      allowNull: true,
    },

       hospitalName: {
      type: DataTypes.STRING,
    },

    patient_age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    patient_gender: {
      type: DataTypes.ENUM("Male", "Female", "Other"),
      allowNull: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    patientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    token: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

   
    doctor_name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    doctor_department: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    booking_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    consulting_time: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "accepted",
        "declined",
        "completed",
        "cancel"
      ),

      allowNull: false,

      defaultValue: "pending",
    },

    booking_status: {
      type: DataTypes.ENUM("user booking", "hospital booking"),
      allowNull: false,
      defaultValue: "user booking",
    },

    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },

  {
    sequelize,

    modelName: "Booking",

    tableName: "bookings",

    timestamps: true,

    indexes: [
      {
        fields: ["doctorId"],
      },

      {
        fields: ["hospitalId"],
      },

      {
        fields: ["userId"],
      },

      {
        fields: ["booking_date"],
      },

      {
        fields: ["status"],
      },
         {
        unique: true,
        fields: ["hospitalId", "bookingNumber"],
      },
    ],
  }
);

export default Booking;