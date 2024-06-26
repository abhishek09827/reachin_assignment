declare global {
    namespace NodeJS {
      interface ProcessEnv {
        REFRESH_TOKEN: string,
        REDIRECT_URI: string,
        CLIENT_SECRET: string,
        CLIENT_ID: string,
        NODE_ENV: 'development' | 'production';
        PORT?: string;
      }
    }
  }
  
  export {}