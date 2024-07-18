import { atom, useAtom } from "jotai"

import { MailData, emailData } from "./data"

type Config = {
  selected: MailData["id"] | null
}

const configAtom = atom<Config>({
  selected: emailData[0].id,
})

export function useMail() {
  return useAtom(configAtom)
}
