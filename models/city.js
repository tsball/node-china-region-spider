const sequelize = require('../database.js')
const Sequelize = require('sequelize')

const City = sequelize.define('cities', {
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
  url: {
    type: Sequelize.STRING
  },
  provinceId: {
    type: Sequelize.INTEGER
  },
  districtsCount: {
    type: Sequelize.INTEGER
  }
});

// force: true 如果表已经存在，将会丢弃表
City.sync({force: false})

module.exports = City
