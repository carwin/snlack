import { SnykProject } from "./snykProject";

export interface SnykOrg {
  id: string;
  name: string;
  projects: SnykProject[];
}
