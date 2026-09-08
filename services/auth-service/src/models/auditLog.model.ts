import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db';
import Auth from './auth.model';

export interface IAuditLog {
  id: number;
  authId?: number;
  name: string;
  role: string;
  department?: string;
  hospitalId?: number;
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  osVersion?: string;
  deviceType?: string;
  userAgent?: string;
  ipAddress?: string;
  registeredAddress?: string;
  loginTime: Date;
  lastActivity: Date;
  status: string; // 'Active', 'Inactive', 'Failed'
  riskLevel: string; // 'Low', 'Medium', 'High'
  sessionDuration?: string;
  loginMethod: string; // 'Password', 'OTP', etc.
  createdAt?: Date;
  updatedAt?: Date;
}

// Ensure these fields are optional upon creation since they are set by DB or explicitly marked nullable
type AuditLogCreationAttributes = Optional<IAuditLog, 'id' | 'authId' | 'department' | 'hospitalId' | 'browser' | 'browserVersion' | 'operatingSystem' | 'osVersion' | 'deviceType' | 'userAgent' | 'ipAddress' | 'registeredAddress' | 'loginTime' | 'lastActivity' | 'sessionDuration' | 'createdAt' | 'updatedAt'>;

class AuditLog extends Model<IAuditLog, AuditLogCreationAttributes> implements IAuditLog {
  public id!: number;
  public authId?: number;
  public name!: string;
  public role!: string;
  public department?: string;
  public hospitalId?: number;
  
  public browser?: string;
  public browserVersion?: string;
  public operatingSystem?: string;
  public osVersion?: string;
  public deviceType?: string;
  public userAgent?: string;
  public ipAddress?: string;
  public registeredAddress?: string;
  public loginTime!: Date;
  public lastActivity!: Date;
  public status!: string;
  public riskLevel!: string;
  public sessionDuration?: string;
  public loginMethod!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    authId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    browser: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    browserVersion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    operatingSystem: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    osVersion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deviceType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    registeredAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    loginTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    lastActivity: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Active',
    },
    riskLevel: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Low',
    },
    sessionDuration: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    loginMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Password',
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
  }
);

// Define associations
AuditLog.belongsTo(Auth, { foreignKey: 'authId', as: 'auth' });
Auth.hasMany(AuditLog, { foreignKey: 'authId', as: 'auditLogs' });

export default AuditLog;
