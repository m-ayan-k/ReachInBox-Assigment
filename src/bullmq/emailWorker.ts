import { Worker } from 'bullmq';
import { redisConfig } from './redisConfig'; 
import { loadCredentials, sendMessage,addLabel } from '../services/gmailService';
import { google } from 'googleapis';

// creating a new worker
const emailWorker = new Worker('emailQueue', async job => {
    const {replyTo, replySubject, message, messageId,labelId } = job.data;

    console.log('data',job.data);

    const oAuth2Client = loadCredentials();
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    await addLabel(gmail,messageId,labelId );
    await sendMessage(gmail, replyTo, replySubject, message, messageId);
}, { connection: redisConfig });    

emailWorker.on('active', (job,prev) => {
    console.log(`Job ${job.id} is now active; previous status was ${prev}`);
});

emailWorker.on('completed', job => {
    console.log(`Job ${job.id} completed successfully!`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
});

emailWorker.on('stalled', (jobId, prev) => {
    console.warn(`Job ${jobId} stalled and will be reprocessed`);
});

emailWorker.on('progress', (job, progress) => {
    console.log(`Job ${job.id} is ${progress}% complete`);
});

emailWorker.on('error', err => {
    console.error(`Worker encountered an error: ${err.message}`);
});

// Notify when the worker is ready
emailWorker.on('ready', () => {
    console.log('Worker is ready and listening for jobs');
});

// Notify when the worker is closed
emailWorker.on('closing', (msg) => {
    console.log(`Worker has been closed, ${msg}`);
});

// Start listening for jobs
(async () => {
    console.log('Starting the email worker...');
    await emailWorker.waitUntilReady();
    console.log('Email worker is running');
})();


