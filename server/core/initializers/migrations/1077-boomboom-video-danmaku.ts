import * as Sequelize from 'sequelize'

async function up (utils: {
  transaction: Sequelize.Transaction
  queryInterface: Sequelize.QueryInterface
  sequelize: Sequelize.Sequelize
}): Promise<void> {
  // BoomBoom danmaku (弹幕): scrolling bullet comments synced to playback time.
  await utils.queryInterface.createTable('videoDanmaku', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    message: {
      type: Sequelize.STRING,
      allowNull: false
    },
    time: {
      // seconds offset into the video where the danmaku appears
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    color: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '#ffffff'
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
      allowNull: true,
      references: { model: 'user', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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

  await utils.queryInterface.addIndex('videoDanmaku', [ 'videoId' ], { transaction: utils.transaction })
}

function down (options) {
  throw new Error('Not implemented.')
}

export {
  down,
  up
}
