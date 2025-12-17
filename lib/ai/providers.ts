import { gateway } from "@ai-sdk/gateway";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        "chat-model": gateway.languageModel("google/gemini-2.5-pro"),
        "chat-model-reasoning": gateway.languageModel("google/gemini-2.5-pro"),
        "title-model": gateway.languageModel("google/gemini-2.5-flash"),
        "artifact-model": gateway.languageModel("google/gemini-2.5-flash"),
      },
    });
