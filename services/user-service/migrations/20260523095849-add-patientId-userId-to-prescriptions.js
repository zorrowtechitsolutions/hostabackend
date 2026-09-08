"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("prescriptions");

    // Add patientId
    if (!table.patientId) {
      await queryInterface.addColumn("prescriptions", "patientId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    // Add userId
    if (!table.userId) {
      await queryInterface.addColumn("prescriptions", "userId", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }

    // Add bookingId
    if (!table.bookingId) {
      await queryInterface.addColumn("prescriptions", "bookingId", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("prescriptions");

    if (table.patientId) {
      await queryInterface.removeColumn("prescriptions", "patientId");
    }

    if (table.userId) {
      await queryInterface.removeColumn("prescriptions", "userId");
    }

    
    if (table.bookingId) {
      await queryInterface.removeColumn("prescriptions", "bookingId");
    }
  },
};