import { SnykProject } from '../../types';
import { createProjObj, dbReadEntry, generateListItemMsgBlocks, projListFinaleBlocks, projListIntroBlocks } from '../utils';

export const projectListMsg = (projects: SnykProject[], org: string, orgId: string | boolean, orgEntryIndex: number) => {
  console.enter(`Entering projectListMsg()...`);
  console.problem(`counting projects... ${projects.length}`);

  // Initialize the blocks array for the returned message.
  let blocks: any[] = [];

  let projectBlocks: any[] = [];


  // Put together the blocks for each project.
  projects.map((project, index) => {
    if (project.org === org) {
      const projObj = createProjObj(project);
      const listItemBlocks = generateListItemMsgBlocks(projObj, orgEntryIndex, index);
      projectBlocks = projectBlocks.concat(listItemBlocks);
    }
  });

  console.log('ORG ID: ', orgId);
  if (typeof orgId === 'boolean') {
    throw 'Org ID was a boolean while building a message. That is not good.';
  }

  // If there is at least one project to return, construct the response
  // using positive intro/outro dialog and the list of projects.
  if (projectBlocks.length >= 1) {
    // Add the positive intro block(s) to the message.
    blocks = blocks.concat(projListIntroBlocks({sentiment: 'positive', org }));
    // Add the blocks for each project to the message.
    blocks = blocks.concat(projectBlocks)
    // Add the finale.
    blocks = blocks.concat(projListFinaleBlocks({sentiment: 'positive', orgId}));
  }

  // If there are no projects to return, construct the response using negative
  // intro/outro dialog.
  else {
    // Add the negative intro block(s) to the message.
    blocks = blocks.concat(projListIntroBlocks({sentiment: 'negative', org}));
    // Add the finale.
    blocks = blocks.concat(projListFinaleBlocks({sentiment: 'negative', orgId}));
  }

  return {
    blocks,
    response_type: 'ephemeral'
  };

};
