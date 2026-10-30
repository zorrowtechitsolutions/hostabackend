"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("users");
    if (tableInfo.fcmToken) {
      const typeStr = String(tableInfo.fcmToken.type || "");
      if (!typeStr.includes("ARRAY") && !typeStr.includes("JSON")) {
        await queryInterface.removeColumn("users", "fcmToken");
        await queryInterface.addColumn("users", "fcmToken", {
          type: Sequelize.ARRAY(Sequelize.JSONB),
          allowNull: false,
          defaultValue: [],
        });
      }
    } else {
      await queryInterface.addColumn("users", "fcmToken", {
        type: Sequelize.ARRAY(Sequelize.JSONB),
        allowNull: false,
        defaultValue: [],
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("users");
    if (tableInfo.fcmToken) {
      await queryInterface.removeColumn("users", "fcmToken");
      await queryInterface.addColumn("users", "fcmToken", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },
};