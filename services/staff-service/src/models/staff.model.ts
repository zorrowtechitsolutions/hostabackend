import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import bcrypt from "bcryptjs";

/* =======================
   INTERFACES
======================= */

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

interface IStaff {
  id: number;
  hospitalId: number;
  staffNumber: number;
  staffId?: string;
  name: string;
  designation?: string;
  joiningDate?: Date;
  staffType?: string;
  jobType?: string;
  address: IAddress;
  phone: string;
  email?: string;
  password?: string;
  dob?: Date;
  gender?: string;
  knowLanguages?: string[];
  qualification?: string;
  isActive?: boolean;
  isDelete?: boolean;
  deleteDate?: Date;
  otp?: string;
  otpExpiry?: Date;
  roleId: number; 
  imageUrl: string;
  hospitalName: string;
  fcmToken: FCMTOKEN[];
  status?: string;

}

/* =======================
   CREATE TYPE
======================= */

type StaffCreationAttributes = Optional<
  IStaff,
  | "id"
  | "staffNumber"
  | "staffId"
  | "email"
  | "password"
  | "dob"
  | "gender"
  | "knowLanguages"
  | "qualification"
  | "designation"
  | "joiningDate"
  | "staffType"
  | "jobType"
  | "isActive"
  | "isDelete"
  | "deleteDate"
  | "otp"
  | "otpExpiry"
  | "status"
>;

/* =======================
   MODEL CLASS
======================= */

class Staff
  extends Model<IStaff, StaffCreationAttributes>
  implements IStaff
{
  public id!: number;
  public hospitalId!: number;
  public staffNumber!: number;
  public readonly staffId!: string;
  public name!: string;
  public designation?: string;
  public joiningDate?: Date;
  public staffType?: string;
  public jobType?: string;
  public phone!: string;
  public email?: string;
  public password?: string;
  public dob?: Date;
  public gender?: string;
  public knowLanguages?: string[];
  public qualification?: string;
  public address!: IAddress;
  public bookingOpen!: boolean;
  public isActive?: boolean;
  public isDelete?: boolean;
  public deleteDate?: Date;
  public otp?: string;
  public otpExpiry?: Date;
  public roleId!: number;   
  public imageUrl: string;
  public hospitalName: string;
  public fcmToken: FCMTOKEN[];
  public status?: string;

  // timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /* =======================
     INSTANCE METHOD
  ======================= */
  public async comparePassword(password: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(password, this.password);
  }
}

/* =======================
   INIT MODEL
======================= */

Staff.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
   

    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    staffNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    staffId: {
      type: DataTypes.VIRTUAL,
      get() {
        const num = this.getDataValue("staffNumber");
        return num
          ? `#STF${String(num).padStart(5, "0")}`
          : "#STF00000";
      },
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    designation: {
      type: DataTypes.STRING,
    },

    joiningDate: {
      type: DataTypes.DATE,
    },

    staffType: {
      type: DataTypes.STRING,
    },
      imageUrl: {
      type: DataTypes.STRING, // 🔥 store imageUrl + public_id
      allowNull: true
    },

    jobType: {
      type: DataTypes.STRING,
    },

    qualification: {
      type: DataTypes.STRING,
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
       hospitalName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    password: {
      type: DataTypes.STRING,
    },

    gender: {
      type: DataTypes.STRING,
    },

    dob: {
      type: DataTypes.DATE,
    },

    knowLanguages: {
      type: DataTypes.JSONB, // safer for PostgreSQL
    },
        roleId: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING,
      defaultValue: 'PENDING',
      allowNull: true,
    },

    address: {
      type: DataTypes.JSONB,
      allowNull: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
       fcmToken: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
        defaultValue: [],
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
    },
    otpExpiry: {
      type: DataTypes.DATE,
    },
   
  },
  {
    sequelize,
    modelName: "Staff",
    tableName: "staff",
    timestamps: true,

    defaultScope: {
      attributes: { exclude: ["password"] },
    },

    scopes: {
      withPassword: {
        attributes: { include: ["password"] },
      },
    },

    indexes: [
      {
        unique: true,
        fields: ["hospitalId", "staffNumber"],
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

// hash before create
Staff.beforeCreate(async (staff: Staff) => {
  if (staff.password) {
    staff.password = await bcrypt.hash(staff.password, 10);
  }
});

// hash before update
Staff.beforeUpdate(async (staff: Staff) => {
  if (staff.changed("password") && staff.password) {
    staff.password = await bcrypt.hash(staff.password, 10);
  }
});

export default Staff;
