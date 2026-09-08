'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('blood_donors', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      dateOfBirth: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      bloodGroup: {
        type: Sequelize.ENUM("O+", "O-", "AB+", "AB-", "A+", "A-", "B+", "B-"),
        allowNull: false,
      },
      address: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      }
    });
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.dropTable('blood_donors');
    } catch (e) {
      console.log('Skipping down migration: relation does not exist');
    }
  }
};
