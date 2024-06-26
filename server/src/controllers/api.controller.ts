import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import config from '../config'
dotenv.config();

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
const openai = new OpenAIApi(new Configuration({
  apiKey: OPENAI_API_KEY,
}));

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
        });

        // Get the email body content
        const emailContent = msg.data.payload?.body?.data || '';
        const emailText = Buffer.from(emailContent, 'base64').toString('utf-8');

        // Analyze the email content with GeminiAPI
        const response = await openai.createCompletion({
          model: 'text-davinci-003',
          prompt: `Classify the following email content into categories: Interested, Not Interested, More information.\n\nEmail content: "${emailText}"\n\nCategory:`,
          max_tokens: 10,
        });

        const category = response.data.choices[0].text.trim();
        console.log(`Email ID: ${message.id}, Category: ${category}`);

        return {
          id: message.id,
          category,
          content: emailText,
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
      subject:`Re: Your email id : ${id}`,
      text: replyContent,
      html: '<h1>Hello from gmail email using API</h1>',
    };

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    return error;
  }
}

export {fetchEmails, sendMail}