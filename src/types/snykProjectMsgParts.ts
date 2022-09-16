import { SnykIssueSeverityCount } from './';
import { SnykTag } from './snykTag';

export interface SnykProjectMsgParts {
  [key: string]: any;
  id: string;
  name: string;
  org: string;
  browseUrl: string;
  issuesCount: SnykIssueSeverityCount;
  importingUser: string | null;
  projType: string;
  isMonitored: string;
  origin: string;
  tags?: SnykTag[];
  readOnly: string;
  criticality?: string[];
  lifecycle?: string[];
  environment?: string[];
  testFrequency: string;
  imageTag?: string;
  imagePlatform?: string;
  imageId?: string;
  lastTestDate: string;
  depCount: number;
}
