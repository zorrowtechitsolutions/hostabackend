const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DATABASE_URL || 'postgres://hostabackend_owner:npg_f5qKpJR1sWdt@ep-dark-snowflake-a1qr5p7e-pooler.ap-southeast-1.aws.neon.tech/auth_db?sslmode=require');
s.query('SELECT id, email, phone, role, "roleId", "doctorId", "staffId", "hospitalId", "hospitalName", "doctorName", "staffName" FROM auths ORDER BY id DESC LIMIT 5')
  .then(r => { console.log(JSON.stringify(r[0], null, 2)); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
