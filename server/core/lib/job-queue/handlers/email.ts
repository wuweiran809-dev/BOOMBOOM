import { Job } from 'bullmq'
import { EmailPayload } from '@boomboom/boomboom-models'
import { logger } from '../../../helpers/logger.js'
import { Emailer } from '../../emailer.js'

export function processEmail (job: Job) {
  const payload = job.data as EmailPayload
  logger.info('Processing email in job %s.', job.id)

  return Emailer.Instance.sendMail(payload)
}
