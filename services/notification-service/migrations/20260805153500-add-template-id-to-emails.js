"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable("EmailNotifications");
    
    if (!tableDesc.templateId) {
      await queryInterface.addColumn("EmailNotifications", "templateId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("EmailNotifications", "templateId");
  },
};
