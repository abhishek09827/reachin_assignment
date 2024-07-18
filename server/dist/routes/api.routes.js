"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const api_controller_1 = require("../controllers/api.controller");
const apiRouter = (0, express_1.Router)();
exports.apiRouter = apiRouter;
apiRouter.route("/process-mails").get(api_controller_1.processGmail);
apiRouter.route("/process-outlook").get(api_controller_1.processOutlook);
//# sourceMappingURL=api.routes.js.map