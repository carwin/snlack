import { SnykProject, SnykProjectMsgParts } from '../../types';

export const createProjObj = (project: SnykProject) => {

  const projObj: SnykProjectMsgParts = {
    id: project.id,
    name: project.name,
    origin: project.origin,
    isMonitored: project.isMonitored.toString(),
    org: project.org,
    browseUrl: project.browseUrl,
    projType: project.type,
    readOnly: project.readOnly.toString(),
    issuesCount: project.issueCountsBySeverity,
    importingUser: project.importingUser?.name || null,
    testFrequency: project.testFrequency,
    lastTestDate: project.lastTestedDate.toString(),
    depCount: project.totalDependencies,
    tags: typeof project.tags !== 'undefined' && Array.isArray(project.tags) ? project.tags : undefined,
    imagePlatform: typeof project.imagePlatform !== 'undefined' ? project.imagePlatform : undefined,
    imageTag: typeof project.imagePlatform !== 'undefined' ? project.imageTag : undefined,
    imageId: typeof project.imageId !== 'undefined' ? project.imageId : undefined,
    criticality: typeof project.attributes.criticality !== 'undefined' && Array.isArray(project.attributes.criticality) ? project.attributes.criticality : undefined,
    lifecycle: typeof project.attributes.lifecycle !== 'undefined' && Array.isArray(project.attributes.lifecycle) ? project.attributes.lifecycle : undefined,
    environment: typeof project.attributes.environment !== 'undefined' && Array.isArray(project.attributes.environment) ? project.attributes.environment : undefined,
  }

  return projObj;

}
