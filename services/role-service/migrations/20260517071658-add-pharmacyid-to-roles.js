"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {

    // ✅ Check table exists
    const table = await queryInterface.describeTable("roles");

    // ✅ Add pharmacyId only if not exists
    if (!table.pharmacyId) {
      await queryInterface.addColumn("roles", "pharmacyId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {

    const table = await queryInterface.describeTable("roles");

    // ✅ Remove pharmacyId only if exists
    if (table.pharmacyId) {
      await queryInterface.removeColumn("roles", "pharmacyId");
    }
  },
};