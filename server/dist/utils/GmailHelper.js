"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmailTextData = exports.getBodyDependingOnMimeType = exports.getHtmlFromResponse = void 0;
const getHtmlFromResponse = (parts) => {
    try {
        let htmlBody = parts.filter((part) => part.mimeType === 'text/html');
        return htmlBody;
    }
    catch (err) {
        console.error(err);
    }
};
exports.getHtmlFromResponse = getHtmlFromResponse;
// Function to get the body depending on the MIME type
const getBodyDependingOnMimeType = (response) => {
    if (!!response) {
        let messageBodyPart;
        switch (response.payload.mimeType) {
            case 'multipart/alternative':
                messageBodyPart = getHtmlFromResponse(response.payload.parts);
                break;
            case 'multipart/related':
                messageBodyPart = getHtmlFromResponse(response.payload.parts[0].parts);
                break;
            case 'multipart/mixed':
                if (response.payload.parts[0].mimeType === 'multipart/related') {
                    messageBodyPart = getHtmlFromResponse(response.payload.parts[0].parts[0].parts);
                }
                else {
                    messageBodyPart = getHtmlFromResponse(response.payload.parts[0].parts);
                }
                break;
            default:
                messageBodyPart = [];
                break;
        }
        return messageBodyPart;
    }
};
exports.getBodyDependingOnMimeType = getBodyDependingOnMimeType;
const getEmailTextData = (msg) => {
    const messageBodyPart = getBodyDependingOnMimeType(msg.data);
    if (messageBodyPart && messageBodyPart.length > 0) {
        const decodedMessage = atob(messageBodyPart[0].body.data.replace(/-/g, '+').replace(/_/g, '/'));
        return decodedMessage;
    }
    else {
        throw new Error('No HTML part found in the message.');
    }
};
exports.getEmailTextData = getEmailTextData;
//# sourceMappingURL=GmailHelper.js.map