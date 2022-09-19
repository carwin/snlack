import { SnykIssueSeverityCount, SnykUserReference, SnykTag, SnykProjectAttributes } from './';

export interface SnykProject {
  name: string;
  org: string;
  orgId: string;
  id: string;
  created: string | Date;
  origin: string;
  type: string;
  readOnly: boolean;
  testFrequency: string;
  totalDependencies: number;
  issueCountsBySeverity: SnykIssueSeverityCount;
  imageId: string;
  imageTag: string;
  imageBaseImage: string;
  imagePlatform: string;
  imageCluster: string;
  remoteRepoUrl: string;
  lastTestedDate: string | Date;
  owner: SnykUserReference | null;
  browseUrl: string;
  importingUser: SnykUserReference | null;
  isMonitored: boolean;
  branch: string | undefined;
  targetReference: string;
  tags: SnykTag[];
  attributes: SnykProjectAttributes;
  issues: SnykIssue[];
}

export interface SnykIssue {
  id: string;
  issueType: string;
  cwe: string[];
  title: string;
  severity: string;
  ignored: boolean;
}
