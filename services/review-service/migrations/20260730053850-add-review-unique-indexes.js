'use strict';

module.exports = {
  async up(queryInterface) {

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX review_user_doctor_unique
      ON review ("userId", "doctorId")
      WHERE "doctorId" IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX review_user_hospital_unique
      ON review ("userId", "hospitalId")
      WHERE "hospitalId" IS NOT NULL;
    `);

  },

  async down(queryInterface) {

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS review_user_doctor_unique;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS review_user_hospital_unique;
    `);

  }
};