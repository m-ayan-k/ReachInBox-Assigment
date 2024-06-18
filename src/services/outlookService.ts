import { ConfidentialClientApplication, OnBehalfOfRequest } from '@azure/msal-node';
import { Client, ClientOptions,AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { generateReply, categorizeEmail } from './openAIService';
import { Request, Response } from "express";
import 'isomorphic-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';


dotenv.config();

const TOKEN_PATH = path.join(__dirname, '../../Outlooktoken.json');


const { CLIENT_ID, CLIENT_SECRET, TENANT_ID, REDIRECT_URI } = process.env;

const SCOPES = ['Mail.ReadWrite', 'Mail.Send', 'offline_access'];

const msalConfig: any = {
    auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        clientSecret: CLIENT_SECRET,
    },
};

const cca = new ConfidentialClientApplication(msalConfig);

const getAuthUrl = async () => {
    const authCodeUrlParameters: any = {
        scopes: SCOPES,
        redirectUri: REDIRECT_URI,
    };
    return await cca.getAuthCodeUrl(authCodeUrlParameters);
};

export const getToken = async (authCode: string) => {
    const tokenRequest: any = {
        code: authCode,
        scopes: ["https://graph.microsoft.com/.default"],
        redirectUri: REDIRECT_URI,
    };
    const response = await cca.acquireTokenByCode(tokenRequest);
    return response.accessToken;
};

const getAccessToken = (accessToken: string): AuthenticationProvider => {
    return {
        getAccessToken: async () => accessToken
    };
};

const getAuthenticatedClient = async () => {
    const token = loadCredentials();
    const tokenRequest: OnBehalfOfRequest = {
        oboAssertion: token.accessToken,
        scopes: SCOPES,
    };

    
    try {
        const tokenResponse = await cca.acquireTokenOnBehalfOf(tokenRequest);
        
        if(tokenResponse === null){
            throw new Error('Token not found.');
        }
        const client = Client.init({
            authProvider: (done) => {
                done(null, tokenResponse.accessToken);
            },
        });
        // console.log("client2",client);
        return client;
    } catch (error) {
        console.error('Error refreshing token', error);
        throw error;
    }
};

export const authenticateOutlook = async (req: Request, res: Response) => {
    try {
        const authUrl = await getAuthUrl();
        res.redirect(authUrl);
    } catch (error) {
        console.error('Error getting auth URL', error);
        res.status(500).send('Error getting auth URL');
    }
};

export const oauth2Callback = async (req: Request, res: Response) => {

    const code = req.query.code as string;
    if (code) {
        const tokenRequest = {
            code,
            scopes: SCOPES,
            redirectUri: 'http://localhost:3000/oauth2callback/outlook',
        };

        try {
            const tokenResponse = await cca.acquireTokenByCode(tokenRequest);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenResponse));
            res.send('Authentication successful! You can close this tab.');
        } catch (error) {
            console.error('Error during token acquisition', error);
            res.status(500).send('Error during token acquisition');
        }
    } else {
        res.send('No code provided');
    }
};

export const checkForNewEmails = async () => {

    const client = await getAuthenticatedClient();

    // console.log('cleint',typeof(client));

    const response = await client.api('/me/mailFolders/inbox/messages')
        .filter('isRead eq false')
        .top(10)
        .get();

    const messages = response.value;

    for (const message of messages.value) {
        const emailContent: string = message.bodyPreview;
        const category: string = await categorizeEmail(emailContent);

        await categorizeEmailInOutlook(client, message.id, category);
        const reply: string = await generateReply(emailContent);

        await sendReply(client, message, reply);
    }
};

const categorizeEmailInOutlook = async (client: Client, messageId: string, category: string) => {
    const categories: { [key: string]: string } = {
        'Interested': 'Interested',
        'Not Interested': 'Not Interested',
        'More Information': 'More Information',
    };

    if (categories[category]) {
        await client.api(`/me/messages/${messageId}`)
            .update({
                categories: [categories[category]],
            });
    } else {
        console.error('Unknown category');
    }
};

const sendReply = async (client: Client, message: any, reply: string) => {
    const replyMessage = {
        message: {
            subject: `Re: ${message.subject}`,
            body: {
                contentType: "Text",
                content: reply,
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: message.sender.emailAddress.address,
                    },
                },
            ],
        },
        saveToSentItems: true,
    };

    await client.api(`/me/messages/${message.id}/reply`).post(replyMessage);
};

const saveToken = (token: string) => {
    fs.writeFileSync(TOKEN_PATH, token);
};

const loadCredentials = () => {
    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        return token;
    } else {
        throw new Error('Token not found. Please authenticate first.');
    }
};
