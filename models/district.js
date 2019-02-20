const sequelize = require('../database.js')
const Sequelize = require('sequelize')

const District = sequelize.define('districts', {
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
  cityId: {
    type: Sequelize.INTEGER
  },
  townsCount: {
    type: Sequelize.INTEGER
  }
});

// force: true 如果表已经存在，将会丢弃表
District.sync({force: false})

module.exports = District