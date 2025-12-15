import { createGuestUser } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const [user] = await createGuestUser();
  const chatId = generateUUID();
  const messageId = generateUUID();

  // Build the ready-to-use cURL command
  const curlCommand = `curl --no-buffer -X POST http://localhost:3000/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "${chatId}",
    "message": {
      "id": "${messageId}",
      "role": "user",
      "parts": [{ "type": "text", "text": "Hello, what can you help me with?" }]
    },
    "selectedChatModel": "chat-model",
    "selectedVisibilityType": "private",
    "userId": "${user.id}"
  }'`;

  return Response.json({
    userId: user.id,
    chatId,
    messageId,
    curlCommand,
  });
}
