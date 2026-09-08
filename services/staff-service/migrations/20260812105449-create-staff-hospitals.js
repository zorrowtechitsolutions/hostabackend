'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff_hospitals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      staffId: {
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

    // Prevent duplicate staff-hospital memberships
    await queryInterface.addConstraint('staff_hospitals', {
      fields: ['staffId', 'hospitalId'],
      type: 'unique',
      name: 'unique_staff_hospital',
    });

    // Faster lookup by staff
    await queryInterface.addIndex('staff_hospitals', ['staffId'], {
      name: 'idx_staff_hospitals_staff_id',
    });

    // Faster lookup by hospital
    await queryInterface.addIndex('staff_hospitals', ['hospitalId'], {
      name: 'idx_staff_hospitals_hospital_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff_hospitals');
  },
};