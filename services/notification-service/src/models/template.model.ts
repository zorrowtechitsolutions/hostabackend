import { DataTypes } from "sequelize";
import sequelize from "../config/db";

const EmailTemplate = sequelize.define("EmailTemplate", {
    hospitalId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    templateName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM("Active", "Inactive"),
        defaultValue: "Active"
    }
});

export default EmailTemplate;
