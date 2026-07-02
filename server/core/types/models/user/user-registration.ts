import { UserRegistrationModel } from '@server/models/user/user-registration.js'
import { PickWith } from '@boomboom/boomboom-typescript-utils'
import { MUserId } from './user.js'

type Use<K extends keyof UserRegistrationModel, M> = PickWith<UserRegistrationModel, K, M>

// ############################################################################

export type MRegistration = Omit<UserRegistrationModel, 'User'>

// ############################################################################

export type MRegistrationFormattable =
  & MRegistration
  & Use<'User', MUserId>
