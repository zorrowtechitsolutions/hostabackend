'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('doctor_hospitals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      doctorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      hospitalId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ACTIVE',
      },

      joinedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      leftAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Prevent the same doctor from being added
    // to the same hospital more than once.
    await queryInterface.addConstraint('doctor_hospitals', {
      fields: ['doctorId', 'hospitalId'],
      type: 'unique',
      name: 'unique_doctor_hospital',
    });

    // Useful for membership lookups
    await queryInterface.addIndex('doctor_hospitals', ['doctorId'], {
      name: 'idx_doctor_hospitals_doctor_id',
    });

    await queryInterface.addIndex('doctor_hospitals', ['hospitalId'], {
      name: 'idx_doctor_hospitals_hospital_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('doctor_hospitals');
  },
};