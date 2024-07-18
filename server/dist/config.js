"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Parsing the env file.
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "./.env") });
// Loading process.env as ENV interface
const getConfig = () => {
    return {
        REFRESH_TOKEN: process.env.REFRESH_TOKEN,
        REDIRECT_URI: process.env.REDIRECT_URI,
        CLIENT_SECRET: process.env.CLIENT_SECRET,
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
const getSanitzedConfig = (config) => {
    for (const [key, value] of Object.entries(config)) {
        if (value === undefined) {
            throw new Error(`Missing key ${key} in config.env`);
        }
    }
    return config;
};
const config = getConfig();
const sanitizedConfig = getSanitzedConfig(config);
exports.default = sanitizedConfig;
//# sourceMappingURL=config.js.map