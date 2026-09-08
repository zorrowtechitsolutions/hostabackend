"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("patient_vitals");
    if (!tableInfo.prescriptionId) {
      await queryInterface.addColumn("patient_vitals", "prescriptionId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable("patient_vitals");
    if (tableInfo.prescriptionId) {
      await queryInterface.removeColumn("patient_vitals", "prescriptionId");
    }
  }
};
