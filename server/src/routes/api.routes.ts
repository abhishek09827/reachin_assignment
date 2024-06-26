import { Router } from "express"
import {processGmail, processOutlook} from "../controllers/api.controller"

const apiRouter = Router()

apiRouter.route("/process-mails").get(processGmail)
apiRouter.route("/process-outlook").get(processOutlook)
 
export {apiRouter}
