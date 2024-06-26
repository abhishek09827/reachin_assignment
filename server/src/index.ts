import dotenv from 'dotenv';
import { app } from './app';
dotenv.config({
    path: './env'
});
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
app.listen(PORT, () => {
    console.log(`Connected to port: ${PORT}`);
});
