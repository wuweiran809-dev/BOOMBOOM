import { FindOptions, Transaction } from 'sequelize'
import { AllowNull, BelongsTo, Column, CreatedAt, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript'
import { SequelizeModel } from '../shared/index.js'
import { UserModel } from '../user/user.js'
import { VideoModel } from './video.js'

/*
  BoomBoom paid unlock: records which user unlocked which paid video.
*/
@Table({
  tableName: 'videoPurchase',
  indexes: [
    {
      fields: [ 'userId', 'videoId' ],
      unique: true
    },
    {
      fields: [ 'videoId' ]
    }
  ]
})
export class VideoPurchaseModel extends SequelizeModel<VideoPurchaseModel> {
  @AllowNull(false)
  @Column
  declare coinsPaid: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @ForeignKey(() => VideoModel)
  @Column
  declare videoId: number

  @BelongsTo(() => VideoModel, {
    foreignKey: {
      allowNull: false
    },
    onDelete: 'CASCADE'
  })
  declare Video: Awaited<VideoModel>

  @ForeignKey(() => UserModel)
  @Column
  declare userId: number

  @BelongsTo(() => UserModel, {
    foreignKey: {
      allowNull: false
    },
    onDelete: 'CASCADE'
  })
  declare User: Awaited<UserModel>

  static load (userId: number, videoId: number, transaction?: Transaction): Promise<VideoPurchaseModel> {
    const options: FindOptions = { where: { userId, videoId } }
    if (transaction) options.transaction = transaction

    return VideoPurchaseModel.findOne(options)
  }

  static listVideoIdsPurchasedByUser (userId: number): Promise<number[]> {
    return VideoPurchaseModel.findAll({ where: { userId }, attributes: [ 'videoId' ] })
      .then(rows => rows.map(r => r.videoId))
  }
}
