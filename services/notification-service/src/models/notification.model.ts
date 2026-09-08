



import {
  DataTypes,
  Model,
  Optional,
} from "sequelize";

import sequelize from "../config/db";

/* =======================
   INTERFACE
======================= */

interface INotification {

  id: number;

  userIds?: number[];
  hospitalIds?: number[];
  doctorIds?: number[];
  staffIds?: number[];
  pharmacyIds?: number[];
  labIds?: number[];
  superAdminIds?: number[];

  message: string;

  userReadStatus?: object;
  hospitalReadStatus?: object;
  doctorReadStatus?: object;
  staffReadStatus?: object;
  pharmacyReadStatus?: object;
  labReadStatus?: object;
  superAdminReadStatus?: object;
}

/* =======================
   OPTIONAL FIELDS
======================= */

type NotificationCreationAttributes =
  Optional<
    INotification,
    | "id"
    | "userIds"
    | "hospitalIds"
    | "doctorIds"
    | "staffIds"
    | "pharmacyIds"
    | "labIds"
    | "superAdminIds"
    | "userReadStatus"
    | "hospitalReadStatus"
    | "doctorReadStatus"
    | "staffReadStatus"
    | "pharmacyReadStatus"
    | "labReadStatus"
    | "superAdminReadStatus"
  >;

/* =======================
   MODEL
======================= */

class Notification
  extends Model<
    INotification,
    NotificationCreationAttributes
  >
  implements INotification
{

  public id!: number;

  public userIds?: number[];
  public hospitalIds?: number[];
  public doctorIds?: number[];
  public staffIds?: number[];
  public pharmacyIds?: number[];
  public labIds?: number[];
  public superAdminIds?: number[];

  public message!: string;

  public userReadStatus?: object;
  public hospitalReadStatus?: object;
  public doctorReadStatus?: object;
  public staffReadStatus?: object;
  public pharmacyReadStatus?: object;
  public labReadStatus?: object;
  public superAdminReadStatus?: object;
}

/* =======================
   INIT
======================= */

Notification.init(

  {

    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    /* RECEIVER IDS */

    userIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: [],
    },

    hospitalIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: [],
    },

    doctorIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: [],
    },

    staffIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: [],
    },

    pharmacyIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: [],
    },

    labIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: [],
    },

    superAdminIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: [],
    },

    /* MESSAGE */

    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    /* READ STATUS */

    userReadStatus: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

    hospitalReadStatus: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

    doctorReadStatus: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

    staffReadStatus: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

    pharmacyReadStatus: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

    labReadStatus: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

    superAdminReadStatus: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

  },

  {
    sequelize,
    modelName: "Notification",
    tableName: "notifications",
    timestamps: true,
  }

);

export default Notification;