const sequelize = require('../database.js')
const Sequelize = require('sequelize')

const City = sequelize.define('cities', {
  year: {
    type: Sequelize.INTEGER
  },
  name: {
    type: Sequelize.STRING
  },
  code: {
    type: Sequelize.STRING
  },
  url: {
    type: Sequelize.STRING
  },
  districtsCount: {
    type: Sequelize.INTEGER
  }
});

// force: true 如果表已经存在，将会丢弃表
City.sync({force: false})

module.exports = City
