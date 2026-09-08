'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add doctorNumber temporarily as nullable
    await queryInterface.addColumn('doctor', 'doctorNumber', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // 2. Backfill existing doctors with hospital-scoped numbers
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [doctors] = await queryInterface.sequelize.query(
        `
        SELECT "id", "hospitalId"
        FROM "doctor"
        WHERE "hospitalId" IS NOT NULL
        ORDER BY "hospitalId" ASC, "id" ASC
        `,
        { transaction }
      );

      const counters = {};

      for (const doctor of doctors) {
        const hospitalId = doctor.hospitalId;

        if (!counters[hospitalId]) {
          counters[hospitalId] = 1;
        } else {
          counters[hospitalId] += 1;
        }

        await queryInterface.sequelize.query(
          `
          UPDATE "doctor"
          SET "doctorNumber" = :doctorNumber
          WHERE "id" = :doctorId
          `,
          {
            replacements: {
              doctorNumber: counters[hospitalId],
              doctorId: doctor.id,
            },
            transaction,
          }
        );
      }
    });

    // 3. Make doctorNumber NOT NULL
    await queryInterface.changeColumn('doctor', 'doctorNumber', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // 4. Ensure doctorNumber is unique within each hospital
    await queryInterface.addConstraint('doctor', {
      fields: ['hospitalId', 'doctorNumber'],
      type: 'unique',
      name: 'doctor_hospital_id_doctor_number_unique',
    });
  },

  async down(queryInterface) {
    // Remove unique constraint
    await queryInterface.removeConstraint(
      'doctor',
      'doctor_hospital_id_doctor_number_unique'
    );

    // Remove doctorNumber
    await queryInterface.removeColumn('doctor', 'doctorNumber');
  },
};