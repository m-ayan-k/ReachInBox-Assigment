import express from 'express';
import bodyParser from 'body-parser';
import nodeCron from 'node-cron';
import { authenticateGmail, oauth2Callback, checkForNewEmails } from './services/gmailService';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.get('/auth/gmail', authenticateGmail);
app.get('/oauth2callback', oauth2Callback);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Initialize the cron job to check for new emails every minute
nodeCron.schedule('* * * * *', async () => {
    console.log('Checking for new emails...');
    await checkForNewEmails().catch(err => {
        console.error('Error checking for new emails:', err);
    });
});
