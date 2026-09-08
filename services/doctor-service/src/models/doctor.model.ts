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
interface IConsultingTwoTime {
  day: string;
  morning_session?: IConsultingSession;
  evening_session?: IConsultingSession;
  is_holiday?: boolean;
  has_break?: boolean;
}
interface IConsultingOneTime  {
  day: string;
  start_time?: string;
  end_time?: string;
  is_holiday?: boolean;
}
interface IAddress {
  country?: string;
  state?: string;
  district?: string;
  place: string;
  pincode: number;
}

interface IOutDoorConsulting {
  time: IConsultingSession;
  place: string;
}
interface FCMTOKEN {
  deviceId: string;
  fcmToken: string;
  platform: "android" | "ios" | "web";
}
interface IDoctor {
  id: number;
  doctorId?: string;
  doctorNumber?: number;
  firstName: string;
  lastName: string;
  department?: string;
  specialist?: string;
  address: IAddress;
  phone: string;
  email?: string;
  password?: string;
  fees?: number;
  dob?: Date;
  hospitalName: string;
  gender?: string;
  knowLanguages?: string[];
  qualification?: string;
  consultingTwo?: IConsultingTwoTime;
  consultingOne?: IConsultingTwoTime;
  outDoorConsulting?: IOutDoorConsulting;
  bookingOpen: boolean;
  displayName:string;
  joiningDate?: Date;
  todayBookingAcceptCount: number;
  roleId: number;
  status?: string;
  isActive?: boolean;
  isDelete?: boolean;
  deleteDate?: Date;
  otp?: string;
  otpExpiry?: Date;
  fcmToken?: FCMTOKEN[];
  hospitalId?: number;
  imageUrl?: string; 
  experience?: string;
  regNo?: string;
  autoDecline?: number;
  appointmentCount?: number;
}

/* =======================
   CREATE TYPE (Optional Fields)
======================= */

type DoctorCreationAttributes = Optional<
  IDoctor,
  "id" |  "email" |  "joiningDate" | "password" | "fees" | "dob" | "gender" | "knowLanguages" | "qualification" | "consultingTwo" | "consultingOne" | "department" | "specialist" | "displayName" | "hospitalId" | "deleteDate" | "status"
>;

/* =======================
   MODEL CLASS
======================= */

class Doctor
  extends Model<IDoctor, DoctorCreationAttributes>
  implements IDoctor
{
  public id!: number;
  public readonly doctorId!: string;
  public doctorNumber!: number;
  public hospitalName!: string;
  public firstName!: string;
  public lastName!: string;
  public department?: string;
  public specialist?: string;
  public phone!: string;
  public email?: string;
  public password?: string;
  public fees?: number;
  public dob?: Date;
  public gender?: string;
  public knowLanguages?: string[];
  public qualification?: string;
  public consultingTwo?: IConsultingTwoTime;
  public consultingOne?: IConsultingOneTime;
  public bookingOpen!: boolean;
  public address!: IAddress;
  public displayName!: string;
  public joiningDate?: Date;
  public todayBookingAcceptCount!: number;
  public otp!: string;
  public otpExpiry!: Date;
  public outDoorConsulting?: IOutDoorConsulting;
  public hospitalId?: number;
  public roleId: number;
  public status?: string;
  public imageUrl?: string;
  public deleteDate?: Date;
  public experience?: string;
  public regNo?: string;
  public autoDecline?: number;
  public appointmentCount?: number;
  public fcmToken: FCMTOKEN[];
}

/* =======================
   INIT MODEL
======================= */

Doctor.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    doctorNumber: {
  type: DataTypes.INTEGER,
  allowNull: false,
},

doctorId: {
  type: DataTypes.VIRTUAL,
  get() {
    const num = this.getDataValue("doctorNumber");

    return num
      ? `#DR${String(num).padStart(4, "0")}`
      : "#DR0000";
  },
},
    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hospitalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },


    department: {
      type: DataTypes.STRING,
    },

    specialist: {
      type: DataTypes.STRING,
    },

    qualification: {
      type: DataTypes.STRING,
    },
    regNo: {
      type: DataTypes.STRING,
      allowNull: false
    },
     autoDecline: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
     appointmentCount: {
      type: DataTypes.INTEGER ,
      allowNull: true
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    
      fcmToken: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
        defaultValue: [],
    },


    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

      imageUrl: {
      type: DataTypes.STRING, // 🔥 store imageUrl + public_id
      allowNull: true
    },

    password: {
      type: DataTypes.STRING,
    },

    experience: {
       type: DataTypes.STRING,
       allowNull: true
    }, 

    fees: {
      type: DataTypes.DECIMAL(10, 2), 
    },

    gender: {
      type: DataTypes.STRING,
    },

    dob: {
      type: DataTypes.DATE,
    },

    knowLanguages: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },

    address: {
      type: DataTypes.JSONB,
      allowNull: false,
    },

    consultingTwo: {
      type: DataTypes.JSONB,
      allowNull: true
    },
     consultingOne: {
      type: DataTypes.JSONB,
      allowNull: true
    },
      outDoorConsulting: {
      type: DataTypes.JSON,
    },


    bookingOpen: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
     joiningDate: {
      type: DataTypes.DATE,
    },
      todayBookingAcceptCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
      roleId: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'PENDING',
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isDelete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deleteDate: {
      type: DataTypes.DATE,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otpExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    
    
  },
  {
    sequelize,
    modelName: "Doctor",
    tableName: "doctor",
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
    fields: ["hospitalId", "doctorNumber"],
  },
  {
    unique: true,
    fields: ["hospitalId", "phone"],
  },
  {
    unique: true,
    fields: ["hospitalId", "email"],
  },
],
  }
);

/* =======================
   HOOKS (SECURITY)
======================= */

Doctor.beforeCreate(async (doctor: Doctor) => {
  if (doctor.password) {
    doctor.password = await bcrypt.hash(doctor.password, 10);
  }
});

Doctor.beforeUpdate(async (doctor: Doctor) => {
  if (doctor.changed("password")) {
    doctor.password = await bcrypt.hash(doctor.password!, 10);
  }
});



export default Doctor;
