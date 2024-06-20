import { Queue } from 'bullmq';
import { redisConfig } from './redisConfig';

// Creating a new queue
const emailQueue = new Queue('emailQueue', { connection: redisConfig });

export const scheduleEmail = async (jobData: any, delay: number) => {
    await emailQueue.add('sendEmail', jobData, {
        delay: delay, 
        attempts: 3,
        backoff: 3000
    });
};

export default emailQueue;
