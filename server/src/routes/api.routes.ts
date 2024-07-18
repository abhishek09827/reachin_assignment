import { Router } from "express"
import {processGmail,fetchEmails, sendMailButton} from "../controllers/api.controller"
const apiRouter = Router()
apiRouter.route("/process-mails").get(processGmail)
apiRouter.route("/fetchEmails").get(fetchEmails)
apiRouter.route("/sendMailButton").post(sendMailButton)
// apiRouter.route("/process-outlook").get(processOutlook)
export {apiRouter}
