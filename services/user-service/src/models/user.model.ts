import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";



interface FCMTOKEN {
  deviceId: string;
  fcmToken: string;
  platform: "android" | "ios" | "web";
}

interface IUser {
  id: number;
  userId?: string; // Virtual ID
  name: string;
  email?: string;
  password?: string;
  phone?: string;
  imageUrl?: string;
  fcmToken?: FCMTOKEN[];
   joinAccountId?:number;
   relationType?:string;
  otp?: string;
  otpExpiry?: Date;
  roleId?: number;
  deleteDate?: Date;
  isActive?: boolean;
  isDelete?: boolean;
}




class User extends Model<IUser> implements IUser {
  public id!: number;
  public readonly userId!: string;
  public joinAccountId!:number;
  public name!: string;
  public email?: string;
  public password!: string;
  public phone!: string;
  public imageUrl!: string;
  public fcmToken!: FCMTOKEN[];
  public relationType!:string;
  public otp?: string;
  public otpExpiry?: Date;
  public roleId: number;
  public deleteDate?: Date;
  public isActive?: boolean;
  public isDelete?: boolean;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        if (!id) return null;
        return `#USR${String(id).padStart(5, "0")}`;
      },
    },

    joinAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,

      references: {
        model: "users",
        key: "id",
      },
      

      onDelete: "CASCADE",
    },

    relationType:{
      type:DataTypes.ENUM("mother","father","guardian"),
      allowNull: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    phone: {
      type: DataTypes.STRING,
      unique: true,
    },

    imageUrl: {
      type: DataTypes.STRING, // 🔥 store imageUrl + public_id
      allowNull: true
    },
    
        roleId: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      allowNull: true,
    },

    fcmToken: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
        defaultValue: [],
    },

    otp: {
      type: DataTypes.STRING,
    },

    otpExpiry: {
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
    }
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
  }
);

export default User;
