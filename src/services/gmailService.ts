import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { generateReply,categorizeEmail } from './openAIService';
import {Request, Response } from "express";


const SCOPES = ['https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.labels'];

const TOKEN_PATH = path.join(__dirname, '../../token.json');

const getOAuth2Client = () => {
    const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials.json'), 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.web;
    return new google.auth.OAuth2(client_id, client_secret, process.env.REDIRECT_URI || redirect_uris[0]);
};

export const authenticateGmail = (req : Request, res: Response) => {
    const oAuth2Client = getOAuth2Client();

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    res.redirect(authUrl);
};

export const oauth2Callback = async (req : Request, res: Response) => {
    const code = req.query.code as string;
    if (code) {
        const oAuth2Client = getOAuth2Client();
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        res.send('Authentication successful! You can close this tab.');
    } else {
        res.send('No code provided');
    }
};

const loadCredentials = () => {
    const oAuth2Client = getOAuth2Client();
    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        oAuth2Client.setCredentials(token);
    } else {
        throw new Error('Token not found. Please authenticate first.');
    }
    return oAuth2Client;
};

export const checkForNewEmails = async () => {
    const oAuth2Client = loadCredentials();
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const res = await gmail.users.messages.list({ userId: 'me', q: 'is:unread', maxResults: 1 });

    console.log("unread message",res);
    const messages = res.data.messages || [];
    for (const message of messages) {
        const email = await getMessage(gmail, message.id);
        const emailContent = email.snippet;

        const category = await categorizeEmail(emailContent);

        const labelId = await getLabelId(gmail, category);

        await addLabel(gmail, message.id, labelId);

        const reply = await generateReply(emailContent);

        const senderEmail = email.payload.headers.find((header:any) => header.name === 'From').value;

        const subject = email.payload.headers.find((header:any) => header.name === 'Subject').value;

        const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

        await sendMessage(gmail, senderEmail, replySubject, reply, message.id);
    }
};

const getMessage = async (gmail: any, messageId: any) => {
    const res = await gmail.users.messages.get({ userId: 'me', id: messageId });
    return res.data;
};

const sendMessage = async (gmail: any, replyTo: string, replySubject: string, message: string, messageId: any) => {

    // const raw = `To: ${replyTo}\r\nSubject: ${replySubject}\r\n\r\n${message}`;

    const rawMessage = [
        `From: me`,
        `To: ${replyTo}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${messageId}`,
        `References: ${messageId}`,
        '',
        message,
    ].join('\n');

    const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });

    await gmail.users.messages.send({
        userId: 'me',
        resource: {
            raw: encodedMessage,
            threadId: messageId,
        }
    });

};


const addLabel = async (gmail: any, messageId: any, labelId: any) => {
    try {
        const response = await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
                addLabelIds: [labelId],
                removeLabelIds: ['INBOX'],
            },
        });
        console.log(`Email ${messageId} moved to label with ID: ${labelId}`);
    } catch (error) {
        console.error('Error while moving email to label:', error);
    }
};

const getLabelId = async (gmail: any, category: string) => {
    try {
        const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
        const labels = labelsResponse.data.labels;

        console.log('category',category);
        
        const categoryPatterns = {
            'Interested': /interested/i,
            'Not Interested': /not interested/i,
            'More Information': /more information/i,
        };

        let labelName = '';
        for (const [name, pattern] of Object.entries(categoryPatterns)) {
            if (pattern.test(category)) {
                labelName = name;
                break;
            }
        }

        if (!labelName) {
            throw new Error('Unknown category');
        }

        const existingLabel = labels.find((label: any) => label.name === labelName);
        if (existingLabel) {
            // console.log(`Label '${labelName}' already exists with ID:`, existingLabel.id);
            return existingLabel.id;
        } else {
            const createLabelResponse = await gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    name: labelName,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show',
                },
            });
            const createdLabel = createLabelResponse.data;
            // console.log(`label '${labelName}' created with ID:`, createdLabel.id);
            return createdLabel.id;
        }
    } catch (error) {
        console.error('Error while checking or creating label:', error);
        throw error;
    }
};  

