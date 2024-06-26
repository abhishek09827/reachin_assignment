declare global {
    namespace NodeJS {
      interface ProcessEnv {
        REFRESH_TOKEN: string,
        REDIRECT_URI: string,
        CLIENT_SECRET: string,
        CLIENT_ID: string,
        GEMINI_API_KEY: string,
        OUTLOOK_REDIRECT_URI: string,
        OUTLOOK_TENANT_ID: string,
        OUTLOOK_CLIENT_ID: string,
        NODE_ENV: 'development' | 'production';
        PORT?: string;
      }
    }
  }

  export {}