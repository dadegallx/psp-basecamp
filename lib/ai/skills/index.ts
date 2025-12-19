/**
 * Skills Registry
 *
 * Skills are domain knowledge units loaded on-demand via the loadSkill tool.
 * Each skill contains database schema, business logic, and SQL guidance.
 */

import { indicatorsSkill } from "./indicators";
import { surveysSkill } from "./surveys";

export const skills = {
  indicators: indicatorsSkill,
  surveys: surveysSkill,
} as const;

export type SkillName = keyof typeof skills;

export type Skill = {
  name: string;
  description: string;
  content: string;
};
