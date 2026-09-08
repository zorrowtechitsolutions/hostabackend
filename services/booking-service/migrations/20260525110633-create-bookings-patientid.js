"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("bookings");

    if (!table.patientId) {
      await queryInterface.addColumn("bookings", "patientId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("bookings");

    if (table.patientId) {
      await queryInterface.removeColumn("bookings", "patientId");
    }
  },
};