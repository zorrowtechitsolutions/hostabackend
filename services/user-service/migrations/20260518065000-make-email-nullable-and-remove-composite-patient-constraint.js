'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Make email nullable in users table
    await queryInterface.changeColumn('users', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // 2. Make password nullable in users table
    await queryInterface.changeColumn('users', 'password', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // 3. Drop unique composite constraint from patients table if it exists
    try {
      await queryInterface.removeConstraint('patients', 'unique_user_hospital_patient');
    } catch (err) {
      console.log("Migration log: unique_user_hospital_patient constraint was not found or already dropped.");
    }

    // 4. Drop unique composite index from patients table if it exists
    try {
      await queryInterface.removeIndex('patients', 'unique_user_hospital_patient');
    } catch (err) {
      console.log("Migration log: unique_user_hospital_patient index was not found or already dropped.");
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert nullable columns
    await queryInterface.changeColumn('users', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn('users', 'password', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // Re-add unique constraint
    await queryInterface.addConstraint('patients', {
      fields: ['userId', 'hospitalId'],
      type: 'unique',
      name: 'unique_user_hospital_patient'
    });
  }
};
