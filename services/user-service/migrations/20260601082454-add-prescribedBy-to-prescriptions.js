"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("prescriptions");
    if (!tableInfo.prescribedBy) {
      await queryInterface.addColumn("prescriptions", "prescribedBy", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable("prescriptions");
    if (tableInfo.prescribedBy) {
      await queryInterface.removeColumn("prescriptions", "prescribedBy");
    }
  }
};