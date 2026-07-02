import * as Sequelize from 'sequelize'

async function up (utils: {
  transaction: Sequelize.Transaction
  queryInterface: Sequelize.QueryInterface
  sequelize: Sequelize.Sequelize
}): Promise<void> {
  // BoomBoom drama grouping: episodes that belong to the same 短剧 share a
  // seriesName (null = standalone / single-episode). The player groups the
  // episode strip by this, so different dramas no longer mix together.
  await utils.queryInterface.addColumn('video', 'seriesName', {
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
