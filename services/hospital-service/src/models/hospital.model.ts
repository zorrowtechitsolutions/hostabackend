import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import bcrypt from "bcryptjs";

/* =======================
   INTERFACES
======================= */

interface IConsultingSession {
  open: string;
  close: string;
}

interface IWorkingHoursGeneral {
  day: string;
  opening_time?: string;
  closing_time?: string;
  is_holiday?: boolean;
}

interface IWorkingHoursClinic {
  day: string;
  morning_session?: IConsultingSession;
  evening_session?: IConsultingSession;
  is_holiday?: boolean;
  has_break?: boolean;
}

interface IAddress {
  country?: string;
  state?: string;
  district?: string;
  place: string;
  pincode: number;
}


interface FCMTOKEN {
  deviceId: string;
  fcmToken: string;
  platform: "android" | "ios" | "web";
}

export interface IHospital {
  id: number;
  hospitalId?: string; // Virtual ID
  name: string;
  type: string;
  address: IAddress;
  phone: string;
  emergencyContact: string;
  email?: string;
  password?: string;
  latitude: number;
  longitude: number;
  about: string;
  deleteRequested?: boolean;
  working_hours_general?: IWorkingHoursGeneral[];
  working_hours_clinic?: IWorkingHoursClinic[];
  working_hours_clinic_nobreak?: IWorkingHoursGeneral[];
  web: string,
  deleteDate?: Date;
  isActive?: boolean;
  isDelete?: boolean;
  otp?: string;
  otpExpiry?: Date;
  roleId: number;
  imageUrl?: string;
  fcmToken?: FCMTOKEN[];
  status?: string;
}

/* =======================
   CREATION ATTRIBUTES
======================= */

type HospitalCreationAttributes = Optional<
  IHospital,
  | "id"
  | "email"
  | "password"
  | "deleteRequested"
  | "working_hours_general"
  | "working_hours_clinic"
  | "working_hours_clinic_nobreak"
  | "web"
  | "deleteDate"
  | "isActive"
  | "isDelete"
  | "otp"
  | "otpExpiry"
  | "status"
>;

/* =======================
   MODEL CLASS
======================= */

class Hospital
  extends Model<IHospital, HospitalCreationAttributes>
  implements IHospital
{
  public id!: number;
  public readonly hospitalId!: string;
  public name!: string;
  public type!: string;
  public address!: IAddress;
  public phone!: string;
  public emergencyContact!: string;
  public email?: string;
  public password?: string;
  public latitude!: number;
  public longitude!: number;
  public about!: string;
  public deleteRequested?: boolean;
  public working_hours_general?: IWorkingHoursGeneral[];
  public working_hours_clinic?: IWorkingHoursClinic[];
  public working_hours_clinic_nobreak?: IWorkingHoursGeneral[];
  public web: string; 
  public deleteDate?: Date;
  public isActive?: boolean;
  public isDelete?: boolean;
  public roleId: number;
  public otp!: string;
  public otpExpiry!: Date;
  public imageUrl: string;
  public fcmToken?: FCMTOKEN[];
  public status?: string;
}

/* =======================
   INIT MODEL
======================= */

Hospital.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    hospitalId: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        if (!id) return null;
        return `#HOS${String(id).padStart(5, "0")}`;
      },
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    address: {
      type: DataTypes.JSONB,
      allowNull: false,
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
      imageUrl: {
      type: DataTypes.STRING, // 🔥 store imageUrl + public_id
      allowNull: true
    },

    emergencyContact: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

    password: {
      type: DataTypes.STRING,
    },
      web: {
      type: DataTypes.STRING,
    },

    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    about: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    working_hours_general: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    working_hours_clinic: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    working_hours_clinic_nobreak:  {
      type: DataTypes.JSONB,
      allowNull: true,
    },
      roleId: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
      allowNull: true,
    },

    deleteRequested: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otpExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
     fcmToken: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
        defaultValue: [],
    },

    status: {
      type: DataTypes.STRING,
      defaultValue: 'PENDING',
      allowNull: true,
    },
    
  },
  {
    sequelize,
    modelName: "Hospital",
    tableName: "hospitals",
    timestamps: true,

    defaultScope: {
      attributes: { exclude: ["password", "otp", "otpExpiry"] },
    },


    scopes: {
      withPassword: {
        attributes: { include: ["password", "otp", "otpExpiry"] },
      },
    },

    indexes: [
      {
        unique: true,
        fields: ["phone"],
      },
      {
        unique: true,
        fields: ["email"],
      },
      {
        fields: ["latitude"],
      },
      {
        fields: ["longitude"],
      },
    ],
  }
);

/* =======================
   HOOKS (SECURITY)
======================= */

Hospital.beforeCreate(async (hospital: Hospital) => {
  if (hospital.password) {
    hospital.password = await bcrypt.hash(hospital.password, 10);
  }
});

Hospital.beforeUpdate(async (hospital: Hospital) => {
  if (hospital.changed("password")) {
    hospital.password = await bcrypt.hash(hospital.password!, 10);
  }
});



export default Hospital;

