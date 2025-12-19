import { tool } from "ai";
import { z } from "zod";
import { skills, type SkillName } from "../skills";

/**
 * Load Skill Tool
 *
 * Loads detailed database schema and business logic for a dataset.
 * Part of the progressive disclosure pattern - call this BEFORE writing SQL.
 */
const loadSkillParameters = z.object({
  skillName: z
    .enum(["indicators", "surveys"])
    .describe("Which dataset to load: 'indicators' for poverty status data, 'surveys' for survey volumes and dates"),
});

export const loadSkill = tool({
  description:
    "Load detailed database schema and business logic for a dataset. Call this BEFORE writing SQL queries to understand the table structure and rules.",
  inputSchema: loadSkillParameters,
  execute: async ({ skillName }) => {
    const skill = skills[skillName as SkillName];
    return {
      loaded: skillName,
      content: skill.content,
    };
  },
});
