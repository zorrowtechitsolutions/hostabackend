'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add staffNumber column (nullable first so we can backfill)
    await queryInterface.addColumn('staff', 'staffNumber', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 2. Get existing staff ordered by hospitalId and id
      const [staffRows] = await queryInterface.sequelize.query(
        `
        SELECT "id", "hospitalId"
        FROM "staff"
        WHERE "hospitalId" IS NOT NULL
        ORDER BY "hospitalId" ASC, "id" ASC
        `,
        { transaction }
      );

      const counters = {};

      // 3. Backfill staffNumber per hospital
      for (const row of staffRows) {
        const hospitalId = row.hospitalId;

        if (!counters[hospitalId]) {
          counters[hospitalId] = 1;
        } else {
          counters[hospitalId]++;
        }

        await queryInterface.sequelize.query(
          `
          UPDATE "staff"
          SET "staffNumber" = :staffNumber
          WHERE "id" = :id
          `,
          {
            replacements: {
              staffNumber: counters[hospitalId],
              id: row.id,
            },
            transaction,
          }
        );
      }

      // 4. Make staffNumber NOT NULL
      await queryInterface.changeColumn(
        'staff',
        'staffNumber',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction }
      );

      // 5. Remove old stored staffId column (now virtual)
      await queryInterface.removeColumn('staff', 'staffId', { transaction });

      // 6. Add unique constraint on [hospitalId, staffNumber]
      await queryInterface.addConstraint('staff', {
        fields: ['hospitalId', 'staffNumber'],
        type: 'unique',
        name: 'staff_hospital_id_staff_number_unique',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove the unique constraint
    await queryInterface.removeConstraint(
      'staff',
      'staff_hospital_id_staff_number_unique'
    );

    // Re-add the stored staffId column
    await queryInterface.addColumn('staff', 'staffId', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: true,
    });

    // Remove staffNumber
    await queryInterface.removeColumn('staff', 'staffNumber');
  },
};
