const { Sequelize } = require('sequelize');
const config = require('./config/config.json').production;

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: 'postgres',
  dialectOptions: config.dialectOptions
});

async function check() {
  try {
    const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'blood_donors'");
    console.log('Columns in blood_donors:', results.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

check();
