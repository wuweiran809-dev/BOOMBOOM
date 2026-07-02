import * as Sequelize from 'sequelize'

async function up (utils: {
  transaction: Sequelize.Transaction
  queryInterface: Sequelize.QueryInterface
  sequelize: Sequelize.Sequelize
}): Promise<void> {
  // BoomBoom coin wallet — signup bonus of 300 coins (注册即送 300 金币)
  await utils.queryInterface.addColumn('user', 'coins', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 300
  }, { transaction: utils.transaction })

  // BoomBoom VIP membership expiration (null = not a VIP)
  await utils.queryInterface.addColumn('user', 'vipExpiration', {
    type: Sequelize.DATE,
    allowNull: true,
    defaultValue: null
  }, { transaction: utils.transaction })
}

function down (options) {
  throw new Error('Not implemented.')
}

export {
  down,
  up
}
