import { SnykLicense } from "./snykLicense";

export interface SnykDependency {
  id: string,
  name: string,
  version: string,
  latestVersion: string,
  latestVersionPublishedDate: string,
  firstPublishedDate: string,
  issuesCritical: number,
  issuesHigh: number,
  issuesMedium: number,
  issuesLow: number,
  isDeprecated: string,
  deprecatedVersions: string[],
  licenses: SnykLicense[],
  dependenciesWithIssues: string[],
  type: string,
  projects: {
    name: string,
    id: string
  }[],
  copyright: string[],
  total: number
}
