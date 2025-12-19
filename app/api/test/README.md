# Test Endpoints

Development-only endpoints for testing the chat API via cURL.

## Setup Endpoint

```
GET /api/test/setup
```

Creates a guest user and returns everything needed to test the chat API.

**Response:**
```json
{
  "userId": "7dc4348f-c18b-499b-8e05-3d307157f707",
  "chatId": "c8dfa9ad-c982-4ddb-8666-07baf27c36ea",
  "messageId": "991cc0d4-e805-42e1-b0ab-6ecfd6c0b96b",
  "curlCommand": "curl --no-buffer -X POST http://localhost:3000/api/chat ..."
}
```

## Usage

### 1. Get test credentials

```bash
curl -s http://localhost:3000/api/test/setup | jq .
```

### 2. Test the chat API

Copy the `curlCommand` from the response, or build your own:

```bash
curl --no-buffer -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<chatId>",
    "message": {
      "id": "<messageId>",
      "role": "user",
      "parts": [{ "type": "text", "text": "Your question here" }]
    },
    "selectedChatModel": "chat-model",
    "selectedVisibilityType": "private",
    "userId": "<userId>"
  }'
```

### 3. Continue the conversation

To send follow-up messages in the same chat session:

1. Keep the same `chatId` and `userId`
2. Generate a new `messageId` (any valid UUID)
3. Change the `text` to your new message

```bash
curl --no-buffer -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<same-chatId>",
    "message": {
      "id": "<new-uuid>",
      "role": "user",
      "parts": [{ "type": "text", "text": "Follow-up question" }]
    },
    "selectedChatModel": "chat-model",
    "selectedVisibilityType": "private",
    "userId": "<same-userId>"
  }'
```

## Options

| Field | Values | Description |
|-------|--------|-------------|
| `selectedChatModel` | `chat-model` | Model to use |
| `selectedVisibilityType` | `public`, `private` | Chat visibility |

## Notes

- Use `--no-buffer` to see streaming SSE output in real-time
- Each call to `/api/test/setup` creates a new guest user
- Reuse `userId` and `chatId` for multi-turn conversations
- This endpoint is disabled in production
