import * as Sequelize from 'sequelize'

async function up (utils: {
  transaction: Sequelize.Transaction
  queryInterface: Sequelize.QueryInterface
  sequelize: Sequelize.Sequelize
}): Promise<void> {
  // Per-video coin price (0 = free). Paid unlock for short-drama episodes.
  await utils.queryInterface.addColumn('video', 'coinPrice', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  }, { transaction: utils.transaction })

  // Records which user unlocked which paid video (real coin purchase)
  await utils.queryInterface.createTable('videoPurchase', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    coinsPaid: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    videoId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'video', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'user', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false
    }
  }, { transaction: utils.transaction })

  await utils.queryInterface.addIndex('videoPurchase', [ 'userId', 'videoId' ], {
    unique: true,
    transaction: utils.transaction
  })
}

function down (options) {
  throw new Error('Not implemented.')
}

export {
  down,
  up
}
