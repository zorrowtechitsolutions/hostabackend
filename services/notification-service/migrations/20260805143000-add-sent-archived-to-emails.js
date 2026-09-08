"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns exist first to avoid errors if they do
    const tableDesc = await queryInterface.describeTable("EmailNotifications");
    
    if (!tableDesc.sentAt) {
      await queryInterface.addColumn("EmailNotifications", "sentAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableDesc.archivedAt) {
      await queryInterface.addColumn("EmailNotifications", "archivedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("EmailNotifications", "sentAt");
    await queryInterface.removeColumn("EmailNotifications", "archivedAt");
  },
};
