import path from "path";
import dotenv from "dotenv";

// Parsing the env file.
dotenv.config({ path: path.resolve(__dirname, "./.env") });

// Interface to load env variables
// Note these variables can possibly be undefined
// as someone could skip these varibales or not setup a .env file at all

interface ENV {
  REFRESH_TOKEN: string | undefined,
  REDIRECT_URI: string | undefined,
  CLIENT_SECRET: string | undefined,
  CLIENT_ID: string | undefined,
  GEMINI_API_KEY: string | undefined,
  OUTLOOK_REDIRECT_URI: string | undefined,
  OUTLOOK_TENANT_ID: string | undefined,
  OUTLOOK_CLIENT_ID: string | undefined,

}

interface Config {
    REFRESH_TOKEN: string ,
    REDIRECT_URI: string,
    CLIENT_SECRET: string,
    CLIENT_ID: string,
    GEMINI_API_KEY: string,
    OUTLOOK_REDIRECT_URI: string,
    OUTLOOK_TENANT_ID: string,
    OUTLOOK_CLIENT_ID: string,
}

// Loading process.env as ENV interface

const getConfig = (): ENV => {
  return {
    REFRESH_TOKEN: process.env.REFRESH_TOKEN,
    REDIRECT_URI: process.env.REDIRECT_URI,
    CLIENT_SECRET: process.env.CLIENT_SECRET ,
    CLIENT_ID: process.env.CLIENT_ID,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OUTLOOK_REDIRECT_URI: process.env.OUTLOOK_REDIRECT_URI,
    OUTLOOK_TENANT_ID: process.env.OUTLOOK_TENANT_ID,
    OUTLOOK_CLIENT_ID: process.env.OUTLOOK_CLIENT_ID,
  };
};

// Throwing an Error if any field was undefined we don't 
// want our app to run if it can't connect to DB and ensure 
// that these fields are accessible. If all is good return
// it as Config which just removes the undefined from our type 
// definition.

const getSanitzedConfig = (config: ENV): Config => {
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      throw new Error(`Missing key ${key} in config.env`);
    }
  }
  return config as Config;
};

const config = getConfig();

const sanitizedConfig = getSanitzedConfig(config);

export default sanitizedConfig;