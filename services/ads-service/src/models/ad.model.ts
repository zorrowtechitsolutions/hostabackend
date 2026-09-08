import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

interface IAd {
  id: number;
  imageUrl: string;
  startDate: Date;
  endDate: Date;
  kilometer: number;
  hospitalId: number;
  isActive: boolean;
    latitude: number;
  longitude: number;
}

/** For creation (id optional) */
interface AdCreationAttributes extends Optional<IAd, "id"> {}

class Ad
  extends Model<IAd, AdCreationAttributes>
  implements IAd
{
  public id!: number;
  public imageUrl!: string;
  public startDate!: Date;
  public endDate!: Date;
  public kilometer!: number;
  public isActive!: boolean;
  public hospitalId!: number;
  public latitude!: number;
  public longitude!: number;

  /** timestamps */
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Ad.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
     
    },

    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
     hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    kilometer: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },


    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Ad",
    tableName: "ads",
    timestamps: true,
  }
);

export default Ad;