"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOutlook = exports.processGmail = exports.sendMail = exports.fetchEmails = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const googleapis_1 = require("googleapis");
const dotenv_1 = __importDefault(require("dotenv"));
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = __importDefault(require("../config"));
const ApiResponse_1 = require("../utils/ApiResponse");
const generative_ai_1 = require("@google/generative-ai");
const azureTokenCredentials_1 = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const identity_1 = require("@azure/identity");
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const GmailHelper_1 = require("../utils/GmailHelper");
dotenv_1.default.config();
const apiKey = config_1.default.GEMINI_API_KEY;
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
const CLIENT_ID = config_1.default.CLIENT_ID;
const CLIENT_SECRET = config_1.default.CLIENT_SECRET;
const REDIRECT_URI = config_1.default.REDIRECT_URI;
const REFRESH_TOKEN = config_1.default.REFRESH_TOKEN;
const oAuth2Client = new googleapis_1.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const chatSession = model.startChat({
    generationConfig,
    history: [],
});
const interactiveBrowserCredential = new identity_1.InteractiveBrowserCredential({
    clientId: config_1.default.OUTLOOK_CLIENT_ID,
    tenantId: config_1.default.OUTLOOK_TENANT_ID,
    redirectUri: config_1.default.OUTLOOK_REDIRECT_URI,
});
const authProvider = new azureTokenCredentials_1.TokenCredentialAuthenticationProvider(interactiveBrowserCredential, {
    scopes: ['Mail.Read', 'Mail.Send', 'offline_access'],
});
const outlookClient = microsoft_graph_client_1.Client.initWithMiddleware({ authProvider });
const redisClient = new ioredis_1.default({
    host: 'localhost',
    port: 6380,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});
const emailQueue = new bullmq_1.Queue('emailQueue', { connection: redisClient, });
const data = [];
// Schedule task to check emails periodically
function processGmail(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield emailQueue.add('checkEmails', {});
            const worker = new bullmq_1.Worker('emailQueue', (job) => __awaiter(this, void 0, void 0, function* () {
                if (job.name === 'checkEmails') {
                    const emails = yield fetchEmails();
                    for (const email of emails) {
                        console.log(email);
                        try {
                            const replyContent = yield generateReplyContent(email.content, email.category);
                            console.log(replyContent);
                            yield sendMail(email.sender, replyContent, email.id);
                            // Push data to response array
                            data.push({
                                id: email.id,
                                to: email.sender,
                                replyContent: replyContent
                            });
                        }
                        catch (error) {
                            console.error('Error sending email:', error);
                            return new ApiResponse_1.ApiResponse(500, null, 'Error sending email');
                        }
                    }
                    // Close the queue after processing
                    emailQueue.close();
                    // Send response with data array
                    return new ApiResponse_1.ApiResponse(200, { data }, 'All emails sent successfully');
                }
            }), { connection: redisClient, });
            return res.status(200).json(new ApiResponse_1.ApiResponse(200, {}, "Mail sent successfully"));
        }
        catch (error) {
            console.error('Error adding job to the queue:', error);
        }
    });
}
exports.processGmail = processGmail;
function processOutlook(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield emailQueue.add('checkEmailsOutlook', {});
            const worker = new bullmq_1.Worker('emailQueue', (job) => __awaiter(this, void 0, void 0, function* () {
                if (job.name === 'checkEmailsOutlook') {
                    const emails = yield fetchOutlookEmails();
                    for (const email of emails) {
                        console.log(email);
                        const replyContent = yield generateReplyContent(email.content, email.category);
                        console.log(replyContent);
                        yield sendMail(email.sender, replyContent, email.id);
                        return res.status(200).json(new ApiResponse_1.ApiResponse(200, {}, "Mail sent successfully"));
                    }
                }
            }), { connection: redisClient, });
        }
        catch (error) {
            console.error('Error adding job to the queue:', error);
        }
    });
}
exports.processOutlook = processOutlook;
function generateReplyContent(emailContent, category) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield chatSession.sendMessage(`The following is an email classified as "${category}". Please provide a direct response.\n\nEmail content: "${emailContent}"\n\nIf the email mentions they are interested to know more, your reply should ask them if they are willing to hop on to a demo call by suggesting a time.\n\nResponse:`);
        return result.response.text();
    });
}
function fetchEmails() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oAuth2Client });
            const res = yield gmail.users.messages.list({
                userId: 'me',
            });
            const messages = res.data.messages || [];
            const emailPromises = messages.map((message) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                if (message.id) {
                    const msg = yield gmail.users.messages.get({
                        userId: 'me',
                        id: message.id,
                        format: 'full'
                    });
                    console.log(msg);
                    // Get the email body content
                    const emailText = msg.data.snippet || '';
                    const headers = ((_a = msg.data.payload) === null || _a === void 0 ? void 0 : _a.headers) || [];
                    const sender = ((_b = headers.find(header => header.name === 'From')) === null || _b === void 0 ? void 0 : _b.value) || 'Unknown Sender';
                    const mssgData = (0, GmailHelper_1.getEmailTextData)(msg);
                    console.log(mssgData);
                    // Analyze the email content with GeminiAPI
                    const response = yield chatSession.sendMessage(`Classify the following email content into categories: Interested, Not Interested, More information.\n\nEmail content: "${emailText}"\n\nCategory:`);
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
                        sender: sender
                    };
                }
                return null;
            }));
            const emails = yield Promise.all(emailPromises);
            return emails.filter((email) => email !== null);
        }
        catch (error) {
            console.error('Error fetching emails:', error);
            throw error;
        }
    });
}
exports.fetchEmails = fetchEmails;
function fetchOutlookEmails() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const messages = yield outlookClient
                .api('/me/messages')
                .top(10)
                .get();
            const emailPromises = messages.value.map((message) => __awaiter(this, void 0, void 0, function* () {
                const emailText = message.body.content || '';
                const sender = message.from.emailAddress.address || 'Unknown Sender';
                const response = yield chatSession.sendMessage(`Classify the following email content into categories: Interested, Not Interested, More information.\n\nEmail content: "${emailText}"\n\nCategory:`);
                const jsonResponse = JSON.parse(response.response.text());
                const category = jsonResponse.response;
                return {
                    id: message.id,
                    category,
                    content: emailText,
                    sender: sender
                };
            }));
            const emails = yield Promise.all(emailPromises);
            return emails;
        }
        catch (error) {
            console.error('Error fetching Outlook emails:', error);
            throw error;
        }
    });
}
function sendMail(to, replyContent, id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const accessToken = yield oAuth2Client.getAccessToken();
            const transport = nodemailer_1.default.createTransport({
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
            const result = yield transport.sendMail(mailOptions);
            return new ApiResponse_1.ApiResponse(200, { "to": to, "data": replyContent }, "Mail sent successfully");
        }
        catch (error) {
            return error;
        }
    });
}
exports.sendMail = sendMail;
//# sourceMappingURL=api.controller.js.map