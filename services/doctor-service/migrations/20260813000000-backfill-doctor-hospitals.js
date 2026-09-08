'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO doctor_hospitals
        ("doctorId", "hospitalId", "status", "joinedAt", "createdAt", "updatedAt")
      SELECT
        id,
        "hospitalId",
        'ACTIVE',
        COALESCE("joiningDate", NOW()),
        NOW(),
        NOW()
      FROM doctor
      WHERE "hospitalId" IS NOT NULL
      ON CONFLICT ("doctorId", "hospitalId") DO NOTHING
    `);
  },

  async down() {},
};
