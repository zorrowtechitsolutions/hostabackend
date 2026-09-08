"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("EmailNotifications", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      hospitalId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      roles: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      totalRecipients: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      successCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      failedCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "DRAFT",
        allowNull: true,
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      archivedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("EmailNotifications");
  },
};
