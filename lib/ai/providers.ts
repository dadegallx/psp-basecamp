import { gateway } from "@ai-sdk/gateway";
import { customProvider } from "ai";

export const myProvider = customProvider({
  languageModels: {
    "chat-model": gateway.languageModel("google/gemini-2.5-flash"),
  },
});
