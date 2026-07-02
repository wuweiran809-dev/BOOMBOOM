import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript'
import { SequelizeModel } from '../shared/index.js'
import { UserModel } from '../user/user.js'
import { VideoModel } from './video.js'

/*
  BoomBoom danmaku (弹幕): a bullet comment shown over the player at a given
  playback time offset.
*/
@Table({
  tableName: 'videoDanmaku',
  indexes: [
    { fields: [ 'videoId' ] }
  ]
})
export class VideoDanmakuModel extends SequelizeModel<VideoDanmakuModel> {
  @AllowNull(false)
  @Column
  declare message: string

  @AllowNull(false)
  @Default(0)
  @Column(DataType.FLOAT)
  declare time: number

  @AllowNull(false)
  @Default('#ffffff')
  @Column
  declare color: string

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @ForeignKey(() => VideoModel)
  @Column
  declare videoId: number

  @BelongsTo(() => VideoModel, {
    foreignKey: { allowNull: false },
    onDelete: 'CASCADE'
  })
  declare Video: Awaited<VideoModel>

  @ForeignKey(() => UserModel)
  @AllowNull(true)
  @Column
  declare userId: number

  @BelongsTo(() => UserModel, {
    foreignKey: { allowNull: true },
    onDelete: 'SET NULL'
  })
  declare User: Awaited<UserModel>

  static listByVideo (videoId: number, limit = 800): Promise<VideoDanmakuModel[]> {
    return VideoDanmakuModel.findAll({
      where: { videoId },
      order: [ [ 'time', 'ASC' ] ],
      limit
    })
  }
}
