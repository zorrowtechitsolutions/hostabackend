'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add patientNumber column (nullable first so we can backfill)
    await queryInterface.addColumn('patients', 'patientNumber', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // 2. Backfill existing patients with sequential patientNumber per hospitalId
    // Uses a window function to assign ROW_NUMBER() partitioned by hospitalId, ordered by createdAt
    await queryInterface.sequelize.query(`
      UPDATE "patients"
      SET "patientNumber" = sub."rowNum"
      FROM (
        SELECT "id", ROW_NUMBER() OVER (
          PARTITION BY "hospitalId"
          ORDER BY "createdAt" ASC
        ) AS "rowNum"
        FROM "patients"
      ) AS sub
      WHERE "patients"."id" = sub."id";
    `);

    // 3. Make the column NOT NULL now that all rows have values
    await queryInterface.changeColumn('patients', 'patientNumber', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // 4. Add unique constraint (hospitalId, patientNumber) to prevent duplicates
    await queryInterface.addConstraint('patients', {
      fields: ['hospitalId', 'patientNumber'],
      type: 'unique',
      name: 'unique_hospital_patient_number',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('patients', 'unique_hospital_patient_number');
    await queryInterface.removeColumn('patients', 'patientNumber');
  },
};
