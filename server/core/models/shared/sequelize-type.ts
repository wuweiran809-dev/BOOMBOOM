import { AttributesOnly } from '@boomboom/boomboom-typescript-utils'
import { Model } from 'sequelize-typescript'

export abstract class SequelizeModel<T> extends Model<Partial<AttributesOnly<T>>> {
  declare id: number
}
