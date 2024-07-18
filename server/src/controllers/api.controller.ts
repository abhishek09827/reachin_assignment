import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import config from '../config'
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { htmlToText } from 'html-to-text';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { InteractiveBrowserCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import {getEmailTextData, parseEmailResponse} from "../utils/GmailHelper"

dotenv.config();
const apiKey = config.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});
const generationConfig = {
  temperature: 0.5,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 1600,
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
// const interactiveBrowserCredential = new InteractiveBrowserCredential({
//   clientId: config.OUTLOOK_CLIENT_ID,
//   tenantId: config.OUTLOOK_TENANT_ID,
//   redirectUri: config.OUTLOOK_REDIRECT_URI,
// });
// const authProvider = new TokenCredentialAuthenticationProvider(interactiveBrowserCredential, {
//   scopes: ['Mail.Read', 'Mail.Send', 'offline_access'],
// });
// const outlookClient = Client.initWithMiddleware({ authProvider });
const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});
const emailQueue = new Queue('emailQueue', { connection: redisClient, });
const data: any[] = [];
interface Email {
  id: string;
  content: string;
  sender: string;
  category: string
}


// Schedule task to check emails periodically
async function processGmail(req: Request, res: Response){
  try {
    await emailQueue.add('checkEmails', {});
    const worker = new Worker('emailQueue', async (job) => {
      if (job.name === 'checkEmails') {
        const emails = await fetchEmails();
        for (const email of emails) {
          console.log(email);
          try {
            const replyContent = await generateReplyContent(email.content);
            console.log(replyContent);
            
            await sendMail(email.sender, replyContent, email.id);
            
            // Push data to response array
            data.push({
              id: email.id,
              to: email.sender,
              replyContent: replyContent
            });
          } catch (error) {
            console.error('Error sending email:', error);
            return new ApiResponse(500, null, 'Error sending email');
          }
        }
        // Close the queue after processing
        emailQueue.close();
        
        // Send response with data array
        return new ApiResponse(200, { data }, 'All emails sent successfully');
      }
    }, { connection: redisClient, });

    return res.status(200).json(new ApiResponse(200, {},"Mail sent successfully"))
  } catch (error) {
    console.error('Error adding job to the queue:', error);
  }
}

async function generateReplyContent(mssgData: string): Promise<any> {

        // Analyze the email content with the AI service
        console.log("in");
        
        const response = await chatSession.sendMessage(`Suggest an appropriate response based on the content of the email provided as Email content. Return only the required response :
          
          Email content: "${mssgData}"`);
          console.log(response.response.text());
          
          return response.response.text();
}
async function generateCategory(mssgData: string): Promise<string> {
          
  // Analyze the email content with the AI service
  const response = await chatSession.sendMessage(`Classify the following email content into one of the categories: Interested, Not Interested, More Information. Reply in one word string, which is Category
    Email content: "${mssgData}"`);
    const category = response.response.text().trim();
  console.log('Generated Category:', category);

  return category;
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

        // Get the email body content
        const emailText = msg.data.snippet || '';
        const headers = msg.data.payload?.headers || [];
        const sender = headers.find(header => header.name === 'From')?.value || 'Unknown Sender';
        const mssgData = getEmailTextData(msg);
        const category = await generateCategory(mssgData);
        
        return {
          id: message.id,
          content: htmlToText(mssgData, {
            wordwrap: 130,
            preserveNewlines: true
          }),
          sender: sender,
          category: category
        };
        
      }
      return null;
    });

    const emails = await Promise.all(emailPromises);
    const filteredEmails = emails.filter((email): email is Email => email !== null);

    const dataFilePath = path.join(__dirname, '../../../client/src/components/mail/data.tsx');
   

  // Read the existing file
  let existingData = [];
  if (fs.existsSync(dataFilePath)) {
    const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    const emailDataMatch = fileContent.match(/export const emailData = (\[.*?\]);/);
    if (emailDataMatch && emailDataMatch[1]) {
      existingData = JSON.parse(emailDataMatch[1]);
    }
  }

  // Append the new emails
  const updatedData = existingData.concat(filteredEmails);

  // Write the updated data back to the file
  const newFileContent = `export const emailData = ${JSON.stringify(updatedData, null, 2)};
export type MailData = (typeof emailData)[number];`;

  fs.writeFileSync(dataFilePath, newFileContent, 'utf8');
    

    // Write the emails to data.tsx
     
    
    return filteredEmails;
  } catch (error) {
    console.error('Error fetching emails:', error);
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
async function sendMailButton(req: Request, res: Response) {
  try {
    const { to, content, id } = req.body;
    console.log(content);

    const replyContent = await generateReplyContent(content);

    const accessToken = await oAuth2Client.getAccessToken();
    console.log(accessToken);

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const raw = createEmail(to, 'testid803@gmail.com', `Re: Reply to mail id : ${id}`, replyContent);
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: raw,
      },
    });

    return new ApiResponse(200, { "to": to, "data": replyContent }, "Mail sent successfully");
  } catch (error) {
    console.error('Error sending email:', error);
    return new ApiResponse(500, {}, "Failed to send email");
  }
}

function createEmail(to: string, from: string, subject: string, message: string): string {
  const str = [
    `Content-Type: text/plain; charset="UTF-8"\n`,
    `MIME-Version: 1.0\n`,
    `Content-Transfer-Encoding: 7bit\n`,
    `to: ${to}\n`,
    `from: ${from}\n`,
    `subject: ${subject}\n\n`,
    message,
  ].join('');

  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
// async function fetchOutlookEmails() {
//   try {
//     const messages = await outlookClient
//       .api('/me/messages')
//       .top(10)
//       .get();

//     const emailPromises = messages.value.map(async (message) => {
//       const emailText = message.body.content || '';
//       const sender = message.from.emailAddress.address || 'Unknown Sender';

//       const response = await chatSession.sendMessage(
//         `Classify the following email content into categories: Interested, Not Interested, More information.\n\nEmail content: "${emailText}"\n\nCategory:`);

//       const jsonResponse = JSON.parse(response.response.text());
//       const category = jsonResponse.response;

//       return {
//         id: message.id,
//         category,
//         content: emailText,
//         sender: sender
//       };
//     });

//     const emails = await Promise.all(emailPromises);
//     return emails;
//   } catch (error) {
//     console.error('Error fetching Outlook emails:', error);
//     throw error;
//   }
// }
// async function processOutlook(req: Request, res: Response){
//   try {
//     await emailQueue.add('checkEmailsOutlook', {});
//     const worker = new Worker('emailQueue', async (job) => {
//       if (job.name === 'checkEmailsOutlook') {
//         const emails = await fetchOutlookEmails();
//         for (const email of emails) {
//           console.log(email);
          
//           const replyContent = await generateReplyContent(email.content, email.category);
//           console.log(replyContent);
          
//           await sendMail(email.sender, replyContent, email.id);
//           return res.status(200).json(new ApiResponse(200, {},"Mail sent successfully"))
//         }
//       }
//     }, { connection: redisClient, });

//   } catch (error) {
//     console.error('Error adding job to the queue:', error);
//   }
// }
export {fetchEmails, sendMail, processGmail,sendMailButton}