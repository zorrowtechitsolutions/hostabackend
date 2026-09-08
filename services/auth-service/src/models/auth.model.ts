import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';
import bcrypt from 'bcryptjs';

interface FCMTOKEN {
  deviceId: string;
  fcmToken: string;
  platform: 'android' | 'ios' | 'web';
}

export interface IAuth {
  id: number;
  email?: string;
  phone?: string;
  password?: string;
  role: string;
  roleId?: number;
  superadminId?: number;
  doctorId?: number;
  staffId?: number;
  hospitalId?: number;
  hospitalName?: string;
  doctorName?: string;
  staffName?: string;
  doctor_fcmtoken?: FCMTOKEN[];
  staff_fcmtoken?: FCMTOKEN[];
  hospital_fcmtoken?: FCMTOKEN[];
  superadmin_fcmtoken?: FCMTOKEN[];
  notificationEnabled?: boolean; // <-- NEW FIELD
  createdAt?: Date;
  updatedAt?: Date;
  deleteDate?: Date;
  isActive?: boolean;
  isDelete?: boolean;
  otp?: string;
  otpExpiry?: Date;
}

type AuthCreationAttributes = Optional<IAuth, 'id' | 'email' | 'phone' | 'password' | 'roleId'  | 'superadminId' | 'doctorId' | 'staffId' | 'hospitalId' | 'hospitalName' | 'doctorName' | 'staffName' | 'doctor_fcmtoken' | 'staff_fcmtoken' | 'hospital_fcmtoken' | 'superadmin_fcmtoken'  | 'notificationEnabled'| 'deleteDate' | 'isActive' | 'isDelete' | 'otp' | 'otpExpiry'>;

class Auth extends Model<IAuth, AuthCreationAttributes> implements IAuth {
  public id!: number;
  public email?: string;
  public phone?: string;
  public password?: string;
  public role!: string;
  public roleId?: number;
  public superadminId?: number;
  public doctorId?: number;
  public staffId?: number;
  public hospitalId?: number;
  public hospitalName?: string;
  public doctorName?: string;
  public staffName?: string;
  public doctor_fcmtoken?: FCMTOKEN[];
  public staff_fcmtoken?: FCMTOKEN[];
  public hospital_fcmtoken?: FCMTOKEN[];
  public superadmin_fcmtoken?: FCMTOKEN[];
  public notificationEnabled?: boolean; 
  public readonly createdAt!: Date; 
  public readonly updatedAt!: Date;
  public deleteDate?: Date;
  public isActive?: boolean;
  public isDelete?: boolean;
  public otp?: string;
  public otpExpiry?: Date;
}

Auth.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roleId: {
  type: DataTypes.INTEGER,
  allowNull: true,
},
    superadminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    hospitalName: {   
      type: DataTypes.STRING,
      allowNull: true,
    },
    doctorName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    staffName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    doctor_fcmtoken: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      defaultValue: [],
    },
    staff_fcmtoken: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      defaultValue: [],
    },
    hospital_fcmtoken: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      defaultValue: [],
    },
    superadmin_fcmtoken: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      defaultValue: [],
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
    notificationEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true, // by default notifications will be enabled
    },  
  },
  {
    sequelize,
    modelName: 'Auth',
    tableName: 'auths',
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['password', 'otp', 'otpExpiry'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password', 'otp', 'otpExpiry'] },
      },
    },
  }
);

Auth.beforeCreate(async (auth: Auth) => {
  if (auth.password) {
    auth.password = await bcrypt.hash(auth.password, 10);
  }
});

Auth.beforeUpdate(async (auth: Auth) => {
  if (auth.changed('password') && auth.password) {
    auth.password = await bcrypt.hash(auth.password, 10);
  }
});

export default Auth;
