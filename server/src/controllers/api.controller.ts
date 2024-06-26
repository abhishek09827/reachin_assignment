import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import config from '../config'
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { InteractiveBrowserCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';

dotenv.config();
const apiKey = config.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
});
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};
// These id's and secrets should come from .env file.
const CLIENT_ID = config.CLIENT_ID as string;
const CLIENT_SECRET = config.CLIENT_SECRET as string;
const REDIRECT_URI = config.REDIRECT_URI as string;
const REFRESH_TOKEN = config.REFRESH_TOKEN as string;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const chatSession = model.startChat({
  generationConfig,
  history: [
  ],
});

const interactiveBrowserCredential = new InteractiveBrowserCredential({
  clientId: config.OUTLOOK_CLIENT_ID,
  tenantId: config.OUTLOOK_TENANT_ID,
  redirectUri: config.OUTLOOK_REDIRECT_URI,
});

const authProvider = new TokenCredentialAuthenticationProvider(interactiveBrowserCredential, {
  scopes: ['Mail.Read', 'Mail.Send', 'offline_access'],
});

const outlookClient = Client.initWithMiddleware({ authProvider });
const redisClient = new Redis({
  host: 'localhost',
  port: 6380,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});
const emailQueue = new Queue('emailQueue', { connection: redisClient, });

// Schedule task to check emails periodically
async function processGmail(){
  try {
    await emailQueue.add('checkEmails', {});
  } catch (error) {
    console.error('Error adding job to the queue:', error);
  }
}
async function processOutlook(){
  try {
    await emailQueue.add('checkEmailsOutlook', {});
  } catch (error) {
    console.error('Error adding job to the queue:', error);
  }
}

const worker = new Worker('emailQueue', async (job) => {
  if (job.name === 'checkEmails') {
    const emails = await fetchEmails();
    for (const email of emails) {
      console.log(email);
      
      const replyContent = await generateReplyContent(email.content, email.category);
      console.log(replyContent);
      
      await sendMail(email.sender, replyContent, email.id);
    }
  }
  if (job.name === 'checkEmailsOutlook') {
    const emails = await fetchOutlookEmails();
    for (const email of emails) {
      console.log(email);
      
      const replyContent = await generateReplyContent(email.content, email.category);
      console.log(replyContent);
      
      await sendMail(email.sender, replyContent, email.id);
    }
  }
}, { connection: redisClient, });

async function generateReplyContent(emailContent: string, category: string): Promise<string> {
  const result = await chatSession.sendMessage(`The following is an email classified as "${category}". Please provide a direct response.\n\nEmail content: "${emailContent}"\n\nIf the email mentions they are interested to know more, your reply should ask them if they are willing to hop on to a demo call by suggesting a time.\n\nResponse:`);
  return result.response.text();
}

async function fetchEmails() {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const res = await gmail.users.messages.list({
      userId: 'me',
    });

    const messages = res.data.messages || [];
    const emailPromises = messages.map(async (message) => {
      if (message.id) {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        console.log(msg);
        // Get the email body content
        const emailText = msg.data.snippet || '';
        const headers = msg.data.payload?.headers || [];
        const sender = headers.find(header => header.name === 'From')?.value || 'Unknown Sender';

        // const emailText = Buffer.from(emailContent, 'base64').toString('utf-8');

        // Analyze the email content with GeminiAPI
        const response = await chatSession.sendMessage(`Classify the following email content into categories: Interested, Not Interested, More information.\n\nEmail content: "${emailText}"\n\nCategory:`);
        const category = response.response.text();
        console.log(response);
        
        console.log(`Email ID: ${message.id}, Category: ${category}`);
        console.log({
          id: message.id,
          category,
          content: emailText,
        });
        
        return {
          id: message.id,
          category,
          content: emailText,
          sender:sender
        };
      }
      return null;
    });

    const emails = await Promise.all(emailPromises);
    return emails.filter((email) => email !== null);
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}
async function fetchOutlookEmails() {
  try {
    const messages = await outlookClient
      .api('/me/messages')
      .top(10)
      .get();

    const emailPromises = messages.value.map(async (message) => {
      const emailText = message.body.content || '';
      const sender = message.from.emailAddress.address || 'Unknown Sender';

      const response = await chatSession.sendMessage(
        `Classify the following email content into categories: Interested, Not Interested, More information.\n\nEmail content: "${emailText}"\n\nCategory:`);

      const jsonResponse = JSON.parse(response.response.text());
      const category = jsonResponse.response;

      return {
        id: message.id,
        category,
        content: emailText,
        sender: sender
      };
    });

    const emails = await Promise.all(emailPromises);
    return emails;
  } catch (error) {
    console.error('Error fetching Outlook emails:', error);
    throw error;
  }
}
async function sendMail(to: string, replyContent: string, id: string) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'testid803@gmail.com',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: 'testid803@gmail.com',
      to: to,
      subject: `Re: Reply to mail id : ${id}`,
      text: `Subject: Reply to mail id : ${id}\n\n${replyContent}`,
      html: `<p>Subject: Reply to mail id : ${id}\n\n${replyContent}</p>`
    };

    const result = await transport.sendMail(mailOptions);
    return new ApiResponse(200, {"to" : to, "data": replyContent},"Mail sent successfully");
  } catch (error) {
    return error;
  }
}

export {fetchEmails, sendMail, processGmail, processOutlook}