"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("hospitals");

    if (!table.fcmToken) {
      await queryInterface.addColumn("hospitals", "fcmToken", {
         type: Sequelize.ARRAY(Sequelize.JSONB),
        allowNull: true,
          defaultValue: [],
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("hospitals");

    if (table.fcmToken) {
      await queryInterface.removeColumn("hospitals", "fcmToken");
    }
  },
};

