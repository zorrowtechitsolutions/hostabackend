'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Find all unique constraints/indexes on auths table
      const [constraints] = await queryInterface.sequelize.query(
        `
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = '"auths"'::regclass
            AND contype = 'u'
        `,
        { transaction }
      );

      for (const constraint of constraints) {
        // We drop all unique constraints on auths table
        await queryInterface.removeConstraint('auths', constraint.conname, { transaction }).catch(() => {});
      }

      // Also try to drop any unique indexes that might have been created instead of constraints
      const [indexes] = await queryInterface.sequelize.query(
        `
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = 'auths'
            AND (indexname LIKE '%email%' OR indexname LIKE '%phone%' OR indexname LIKE '%unique%')
        `,
        { transaction }
      );

      for (const idx of indexes) {
        if (idx.indexname !== 'auths_pkey') {
           await queryInterface.removeIndex('auths', idx.indexname, { transaction }).catch(() => {});
        }
      }
    });
  },

  async down(queryInterface) {
    // Cannot safely re-add global unique constraints if data violates it
  },
};
