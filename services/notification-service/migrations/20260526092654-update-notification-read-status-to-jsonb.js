"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("notifications");

    const columnsToDrop = [
      "userReadBy",
      "hospitalReadBy",
      "labReadBy",
      "staffReadBy",
      "pharmacyReadBy",
      "doctorReadBy",
      "superAdminReadBy",
    ];

    for (const col of columnsToDrop) {
      if (tableInfo[col]) {
        await queryInterface.removeColumn("notifications", col);
      }
    }

    const columnsToAdd = [
      "userReadStatus",
      "hospitalReadStatus",
      "labReadStatus",
      "staffReadStatus",
      "pharmacyReadStatus",
      "doctorReadStatus",
      "superAdminReadStatus",
    ];

    for (const col of columnsToAdd) {
      if (!tableInfo[col]) {
        await queryInterface.addColumn("notifications", col, {
          type: Sequelize.JSONB,
          defaultValue: {},
          allowNull: false,
        });
      }
    }
    
    // Also, superAdminIds might be missing from previous migrations
    if (!tableInfo.superAdminIds) {
      await queryInterface.addColumn("notifications", "superAdminIds", {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        defaultValue: [],
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("notifications");
    
    const columnsToDrop = [
      "userReadStatus",
      "hospitalReadStatus",
      "labReadStatus",
      "staffReadStatus",
      "pharmacyReadStatus",
      "doctorReadStatus",
      "superAdminReadStatus",
      "superAdminIds"
    ];

    for (const col of columnsToDrop) {
      if (tableInfo[col]) {
        await queryInterface.removeColumn("notifications", col);
      }
    }
  },
};
