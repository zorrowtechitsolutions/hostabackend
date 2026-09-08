import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";

class TemplateItem extends Model {}

TemplateItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    canvasBg:
    {
      type: DataTypes.STRING,
      defaultValue: "FFFFFF"
    },

   templateType: {
      type: DataTypes.ENUM(
        "demo",
        "custom"
      ),
      defaultValue: "custom",
    },

    design: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: "TemplateItem",
    tableName: "template_items",
    timestamps: true,
  }
);

export default TemplateItem;









