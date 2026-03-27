import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"
import { SERVER_URL, WORKSPACE_DIR } from "./constants"

export const client = createOpencodeClient({
  baseUrl: SERVER_URL,
  directory: WORKSPACE_DIR,
})
