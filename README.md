# Automated Email Response Tool

## Overview
This tool is designed to parse, categorize, and respond to emails in Google and Outlook accounts based on the context using AI. The tool utilizes OAuth for secure email access, OpenAI for context understanding and response generation, and BullMQ for task scheduling.

## Features
1. **OAuth Integration:**
   - Securely connect to Gmail and Outlook email accounts.
2. **Email Parsing:**
   - Automatically read and parse incoming emails.
3. **Context Understanding:**
   - Utilize OpenAI to understand the context of the emails.
4. **Email Categorization:**
   - Automatically categorize emails into:
     - Interested
     - Not Interested
     - More Information
5. **Automated Replies:**
   - Generate and send appropriate responses based on the email content.

## Live Demo
During the assignment review, the following features will be demonstrated:
1. **Connecting New Email Accounts:**
   - OAuth setup for both Google and Outlook.
2. **Sending Emails:**
   - Send an email to the connected accounts from another account.
3. **Reading Incoming Emails:**
   - Showcase the tool reading and parsing incoming emails.
4. **Categorizing Emails:**
   - Automatic categorization based on email content.
5. **Sending Automated Replies:**
   - Generating and sending appropriate responses based on the email context.

## Getting Started

### Prerequisites
- Node.js
- TypeScript
- Redis
- Google and Outlook OAuth credentials
- OpenAI API key

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/abhishek09827/reachin_assignment.git
   cd reachin_assignment

2. Install dependencies:
   ```bash
   cd server
   npm install
   
3. Create a .env file in the root directory and add the following environment variables::
   ```bash
   GEMINI_API_KEY=your_openai_api_key
   CLIENT_ID=your_google_client_id
   CLIENT_SECRET=your_google_client_secret
   REDIRECT_URI=your_google_redirect_uri
   REFRESH_TOKEN=your_google_refresh_token
   OUTLOOK_CLIENT_ID=your_outlook_client_id
   OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
   OUTLOOK_REDIRECT_URI=your_outlook_redirect_uri
   
4. Start the Redis server:
   ```bash
   redis-server --port 6378
   
5. Run the tool:
   ```bash
   npm run dev

The tool will automatically:

Check for new emails in the connected Google and Outlook accounts.
Parse and categorize the emails.
Generate and send appropriate responses.

## API Endpoints
/api/vi/process-mails: Connect to a Google email account using OAuth and send the generated responses.
/api/vi/process-outlook: Connect to a Google email account using OAuth and send the generated responses.

## Project Structure
```bash
server
├── src
│   ├── controllers
│   │   ├── api.controller.ts
│   ├── routes
│   │   ├── api.routes.ts
│   ├── utils
│   │   ├── ApiResponse.ts
│   │   ├── ApiError.ts
│   ├── app.ts
│   ├── index.ts
│   ├── .env
├── package.json
├── tsconfig.json
└── README.md

