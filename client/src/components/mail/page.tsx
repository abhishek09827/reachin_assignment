import { Mail } from "./components/mail"
import { emailData } from "./data"

export default function MailPage() {
  return (
    <>
      <div className="md:hidden">
    
      </div>
      <div className="hidden flex-col md:flex">
        <Mail
          mails={emailData}
          navCollapsedSize={4}
        />
      </div>
    </>
  )
}
