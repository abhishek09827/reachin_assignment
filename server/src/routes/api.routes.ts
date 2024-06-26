import { Router } from "express"
import {fetchEmails} from "../controllers/api.controller"

const apiRouter = Router()

apiRouter.route("/fetch-mails").get(fetchEmails)

 
export {apiRouter}
