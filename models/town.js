const sequelize = require('../database.js')
const Sequelize = require('sequelize')

const Town = sequelize.define('towns', {
  year: {
    type: Sequelize.INTEGER,
    unique: 'compositeIndex'
  },
  name: {
    type: Sequelize.STRING
  },
  code: {
    type: Sequelize.STRING,
    unique: 'compositeIndex'
  },
  districtId: {
    type: Sequelize.INTEGER
  },
});

// force: true 如果表已经存在，将会丢弃表
Town.sync({force: false})

module.exports = Town