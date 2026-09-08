"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("prescriptions");

    // Add userId if it doesn't exist
    if (!table.userId) {
      await queryInterface.addColumn("prescriptions", "userId", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1, // Provide a default to prevent existing records from failing
      });
    }

    // Change patientId to be optional
    if (table.patientId) {
      await queryInterface.changeColumn("prescriptions", "patientId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("prescriptions");

    // Revert patientId back to required
    if (table.patientId) {
      await queryInterface.changeColumn("prescriptions", "patientId", {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }

    // Remove userId
    if (table.userId) {
      await queryInterface.removeColumn("prescriptions", "userId");
    }
  },
};
