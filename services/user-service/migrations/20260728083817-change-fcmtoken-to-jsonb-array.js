"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove old varchar column
    await queryInterface.removeColumn("users", "fcmToken");

    // Add new JSONB array column
    await queryInterface.addColumn("users", "fcmToken", {
      type: Sequelize.ARRAY(Sequelize.JSONB),
      allowNull: false,
      defaultValue: [],
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove JSONB array column
    await queryInterface.removeColumn("users", "fcmToken");

    // Restore old varchar column
    await queryInterface.addColumn("users", "fcmToken", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};