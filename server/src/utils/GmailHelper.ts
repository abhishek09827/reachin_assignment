interface ParsedResponse {
    id: string;
    suggestedResponse: string;
  }
  

const getHtmlFromResponse = (parts: any[]) => {
    try {
      let htmlBody = parts.filter((part) => part.mimeType === 'text/html');
      return htmlBody;
    } catch (err) {
      console.error(err);
    }
  };
  
  // Function to get the body depending on the MIME type
  const getBodyDependingOnMimeType = (response: any) => {
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
          } else {
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
const getEmailTextData = (msg: any): string => {
    const messageBodyPart = getBodyDependingOnMimeType(msg.data);
  
    if (messageBodyPart && messageBodyPart.length > 0) {
      const decodedMessage = atob(messageBodyPart[0].body.data.replace(/-/g, '+').replace(/_/g, '/'));
      return decodedMessage;
    } else {
      throw new Error('No HTML part found in the message.');
    }
  };

const parseEmailResponse = (responseText: string): ParsedResponse => {

  const classificationMatch = responseText.match(/## Classification:\s*\*\*(.*?)\*\*/);
  const classification = classificationMatch ? classificationMatch[1].trim() : "Unknown";

  // Extract the JSON string
  const jsonStringMatch = responseText.match(/```json([\s\S]*?)```/);
  if (!jsonStringMatch) {
    throw new Error("No JSON found in response text");
  }
  console.log(jsonStringMatch);
  
  let jsonString = jsonStringMatch[1].trim();

  // Replace unescaped newlines with escaped newlines
  jsonString = jsonString.replace(/\n/g, '\\n').replace(/\\\\"/g, '\\"');

  // Parse the JSON string
  const parsedJson = JSON.parse(jsonString);
  const suggestedResponse = parsedJson["Suggested response"];

  // Replace the escaped newlines back to actual newlines in the suggested response
  const formattedSuggestedResponse = suggestedResponse.replace(/\\n/g, '\n');
    return {
      id: "",
      suggestedResponse: formattedSuggestedResponse,
    };
  };
  export { getHtmlFromResponse, getBodyDependingOnMimeType,getEmailTextData,parseEmailResponse };