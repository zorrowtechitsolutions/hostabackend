import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

interface IDocument {
  id: number;
  patientId: number;
  userId: number;
  hospitalId: number;
  name: string;
  date: Date;
  imageUrl: string;
  isActive?: boolean;
}

type DocumentCreationAttributes = Optional<IDocument, "id" | "isActive">;

class Document extends Model<IDocument, DocumentCreationAttributes> implements IDocument {
  public id!: number;
  public patientId!: number;
  public name!: string;
  public date!: Date;
  public imageUrl!: string;
  public isActive?: boolean;
  public hospitalId!: number;
  public userId: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Document.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

       userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    

    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    imageUrl: {
      type: DataTypes.TEXT,
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
    modelName: "Document",
    tableName: "documents",
    timestamps: true,
    indexes: [{ fields: ["patientId"] }, { fields: ["date"] } , { fields: ["hospitalId"] }],
  }
);

export default Document;
