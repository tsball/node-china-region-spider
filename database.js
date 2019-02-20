const Sequelize = require('sequelize')
const sequelize = new Sequelize('database', 'username', 'password', {
  host: '127.0.0.1',
  dialect: 'sqlite', // 'mysql'|'sqlite'|'postgres'|'mssql',
  operatorsAliases: false,
  logging: false,

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },

  // 仅限 SQLite
  storage: 'data/database.sqlite'
})

sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.')
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err)
  })

module.exports = sequelize