import * as Sequelize from 'sequelize'

async function up (utils: {
  transaction: Sequelize.Transaction
  queryInterface: Sequelize.QueryInterface
  sequelize: Sequelize.Sequelize
}): Promise<void> {
  // duanju (短剧工坊) link — password-proxy bridge: store the duanju session cookie
  // + username per BoomBoom user so the server can list/import that user's works.
  await utils.queryInterface.addColumn('user', 'duanjuSession', {
    type: Sequelize.TEXT,
    allowNull: true,
    defaultValue: null
  }, { transaction: utils.transaction })

  await utils.queryInterface.addColumn('user', 'duanjuUsername', {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: null
  }, { transaction: utils.transaction })

  // Attribution ("来源") for videos imported from an external platform, e.g. 'duanju'.
  await utils.queryInterface.addColumn('video', 'externalSource', {
    type: Sequelize.STRING,
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
