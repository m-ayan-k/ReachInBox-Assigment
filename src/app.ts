import express from 'express';
import bodyParser from 'body-parser';
import nodeCron from 'node-cron';
import path from 'path';
import { authenticateGmail, oauth2Callback as gmailOauth2Callback, checkForNewEmails as checkGmail } from './services/gmailService';
import { authenticateOutlook, oauth2Callback as outlookOauth2Callback, checkForNewEmails as checkOutlook } from './services/outlookService';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.get('/auth/gmail', authenticateGmail);
app.get('/oauth2callback/gmail', gmailOauth2Callback);

app.get('/auth/outlook', authenticateOutlook);
app.get('/oauth2callback/outlook', outlookOauth2Callback);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Initialize the cron job to check for new emails every minute
nodeCron.schedule('* * * * *', async () => {
    console.log('Checking for new emails...');
    try {
        await checkGmail();
    } catch (err) {
        console.error('Error checking Gmail:', err);
    }
    try {
        await checkOutlook();
    } catch (err) {
        console.error('Error checking Outlook:', err);
    }
});
