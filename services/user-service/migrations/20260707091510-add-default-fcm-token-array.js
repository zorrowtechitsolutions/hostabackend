"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("users");

    if (!table.fcmToken) {
      await queryInterface.addColumn("users", "fcmToken", {
             type: Sequelize.ARRAY(Sequelize.JSONB),
        allowNull: true,
          defaultValue: [],
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("users");

    if (table.fcmToken) {
      await queryInterface.removeColumn("users", "fcmToken");
    }
  },
};
