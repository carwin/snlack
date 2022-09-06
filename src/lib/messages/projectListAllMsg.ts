// @TODO - could probably combine this with projectListMsg()
import { SnlackUser, SnykOrg, SnykProject } from '../../types';
import { createProjObj, dbReadEntry, generateListItemMsgBlocks, projListFinaleBlocks, projListIntroBlocks } from '../utils';

export const projectListAllMsg = async (projects: SnykProject[], slackUid: string) => {
  console.enter(`Entering projectListAllMsg()...`);
  console.problem(`counting projects... ${projects.length}`);

  const existingData: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: slackUid }) as SnlackUser;

  // Initialize the blocks array for the returned message.
  let blocks: any[] = [];

  let projectBlocks: any[] = [];

  // Put together the blocks for each project.
  projects.map((project) => {
    console.log('We have a match for - ', project.name);
    const projObj = createProjObj(project);

    // If there's no existing entry for this user or if the user's entry has no
    // projects in any of the items in its snykOrgs array:
    if (typeof existingData === 'undefined'
       || typeof existingData.snykOrgs === 'undefined') {
      // @TODO Handle a case where the calling user has no db entry.
    }

    // If the user has an entry in the local db:
    else {
      // const orgIndexInUserEntry =
      const orgMatch = (org: SnykOrg) => org.id === project.orgId;
      const orgIndex = existingData.snykOrgs.findIndex(orgMatch);

      const projMatch = (proj: SnykProject) => project.id === proj.id;
      const projIndex = existingData.snykOrgs[orgIndex].projects.findIndex(projMatch);

      const listItemBlocks = generateListItemMsgBlocks(projObj, orgIndex, projIndex)

      projectBlocks = projectBlocks.concat(listItemBlocks);
    }

  });

  // If there is at least one project to return, construct the response
  // using positive intro/outro dialog and the list of projects.
  if (projectBlocks.length >= 1) {
    // Add the positive intro block(s) to the message.
    blocks = blocks.concat(projListIntroBlocks({sentiment: 'positive', org: 'All'}));
    // Add the blocks for each project to the message.
    blocks = blocks.concat(projectBlocks)
    // Add the finale.
    blocks = blocks.concat(projListFinaleBlocks({sentiment: 'positive', orgId: 'All'}));
  }

  // If there are no projects to return, construct the response using negative
  // intro/outro dialog.
  else {
    // Add the negative intro block(s) to the message.
    blocks = blocks.concat(projListIntroBlocks({sentiment: 'negative', org: 'All'}));
    // Add the finale.
    blocks = blocks.concat(projListFinaleBlocks({sentiment:'negative', orgId: 'All'}));
  }

  console.log(`Here are the blocks we'll be sending back: ${blocks}`);

  // Handle the message limit which we are likely to hit with large organizations:
  const blocksString = blocks.toString();
  console.log('blocks length', blocks.length);
  if (blocksString.length >= 39000 || blocks.length >= 45) {

    const tooManyBlocksBlocks = [
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: '... and more!'
        }
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_This list has been truncated due to Slack's message limit. Try narrowing your search using an Organization name._\n\`\`\`/snyk project list MyOrgName\`\`\`\nTry the \`/project list help\` command for more information about the available options.`
        }
      }
    ];

    blocks = blocks.slice(0, 25);
    blocks = blocks.concat(tooManyBlocksBlocks);
  }

  return {
    blocks,
    response_type: 'ephemeral'
  };

};

