"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_routes_1 = require("./routes/api.routes");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
// Middleware and configuration settings
app.use((0, cors_1.default)({
    origin: process.env.ORIGIN,
    credentials: true
}));
app.use(express_1.default.json({ limit: "16kb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "16kb" }));
app.use(express_1.default.static("public"));
app.use((0, cookie_parser_1.default)());
// Routes declaration
app.use("/api/v1", api_routes_1.apiRouter);
//# sourceMappingURL=app.js.map