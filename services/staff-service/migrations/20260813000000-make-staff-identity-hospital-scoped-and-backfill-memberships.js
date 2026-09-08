'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [constraints] = await queryInterface.sequelize.query(
        `
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = '"staff"'::regclass
            AND contype = 'u'
            AND conname IN ('staff_phone_key', 'staff_email_key', 'staff_phone_unique', 'staff_email_unique')
        `,
        { transaction }
      );

      for (const constraint of constraints) {
        await queryInterface.removeConstraint('staff', constraint.conname, { transaction });
      }

      await queryInterface.removeIndex('staff', 'staff_phone_unique', { transaction }).catch(() => {});
      await queryInterface.removeIndex('staff', 'staff_email_unique', { transaction }).catch(() => {});

      await queryInterface.addConstraint('staff', {
        fields: ['hospitalId', 'phone'],
        type: 'unique',
        name: 'staff_hospital_phone_unique',
        transaction,
      });

      await queryInterface.addConstraint('staff', {
        fields: ['hospitalId', 'email'],
        type: 'unique',
        name: 'staff_hospital_email_unique',
        transaction,
      });

      await queryInterface.sequelize.query(
        `
          INSERT INTO staff_hospitals
            ("staffId", "hospitalId", "status", "joinedAt", "createdAt", "updatedAt")
          SELECT
            id,
            "hospitalId",
            'ACTIVE',
            COALESCE("joiningDate", NOW()),
            NOW(),
            NOW()
          FROM staff
          WHERE "hospitalId" IS NOT NULL
          ON CONFLICT ("staffId", "hospitalId") DO NOTHING
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint('staff', 'staff_hospital_phone_unique', { transaction }).catch(() => {});
      await queryInterface.removeConstraint('staff', 'staff_hospital_email_unique', { transaction }).catch(() => {});

      await queryInterface.addIndex('staff', ['phone'], {
        unique: true,
        name: 'staff_phone_unique',
        transaction,
      });

      await queryInterface.addIndex('staff', ['email'], {
        unique: true,
        name: 'staff_email_unique',
        transaction,
      });
    });
  },
};
