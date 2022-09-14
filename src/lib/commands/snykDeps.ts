import { RespondArguments, RespondFn, SlashCommand } from '@slack/bolt';
import slugify from 'slugify';
import { SnlackUser, SnykCommandParts, SnykOrg, SnykProject } from '../../types';
import { dbReadEntry, readFromDb } from '../utils';
import { validate as validateUUID } from 'uuid';
import { getSnykProjectDeps } from '../utils/getSnykProjectDeps';
import { SnykDependency } from '../../types/snykDependency';

export const snykDependencyListCommandHandler = async(rawCommand: SlashCommand, respond: RespondFn, {subcmd, param, param2, param3}: SnykCommandParts) => {
  const existingUserEntry: SnlackUser = await dbReadEntry({ table: 'users', key: 'slackUid', value: rawCommand.user_id }) as SnlackUser;
  let projectArgType: 'id' | 'name';
  let orgArgType: 'id' | 'name';
  let orgId: string;

  // List a project's dependencies
  if (subcmd === 'list') {

    // If the parameter is undefined, tell the user they have to pass a project for it to work.
    if (typeof param === 'undefined') await respond(snykDependencyMissingProjectArgMsg());

    // If param is defined:
    if (typeof param !== 'undefined') {
      // Start by figuring out the projectId,
      let projectId: string;

      // If the param value is indeed a UUID, we know we were correct above.
      projectArgType = validateUUID(param) ? 'id' : 'name';
      // orgArgType = validateUUID(param2) ? 'id' : 'name';

      // If the project argument type is 'name' / not a UUID, then we need to
      // look up the project's ID for the API call.
      if (projectArgType === 'name') {
        projectId = await getProjectIdByName(rawCommand.user_id, param) as string;
      }
      else {
        projectId = param;
      }

      // Now we need an organization ID to complete the API call to the
      // dependencies endpoint at Snyk. We'll have to do some looking up again,
      // unless the user was kind enough to provide param2, which is optional.

      let orgIndex: number = -1;
      existingUserEntry.snykOrgs?.map( (org, index) => {
        console.log(`Looping over orgs, round: ${index}\ncurrent org is ${org.name}\nIt's ID is ${org.id}`);
        // if (orgIndex === -1) {
          const pindex = org.projects.findIndex((project) => project.id === projectId);
          console.log(`Pindex is ${org.projects.findIndex((project) => project.id === projectId)}`);
          // if (typeof pindex !== 'number' || (typeof pindex === 'number' && pindex <= -1)) orgIndex = index;
          if (typeof pindex === 'number' && pindex >= -1) orgIndex = index;
        // }
      })

      if (orgIndex <= -1) await respond(`Unable to find a dependency list for a project identified by \`${param}\``);

      console.log('org index for this one is: ', orgIndex);

      const orgId = existingUserEntry?.snykOrgs?.[orgIndex].id;

      console.log('Gonna get raw deps from this org id:', orgId);
      const rawDeps = await getSnykProjectDeps(rawCommand.user_id, orgId!, projectId);
      let blocks: any[] = [];

      // Sort the dependencies pushing those with critical or high vulnerabilities to the top.
      // @TODO reformat this using a reducer once I'm convinced it does what it should.
      // const priorityDeps = rawDeps.sort((a: SnykDependency, b: SnykDependency) => {
      //   const totalA = (a.issuesCritical + a.issuesHigh + a.issuesMedium + a.issuesLow);
      //   const totalB = (b.issuesCritical + b.issuesHigh + b.issuesMedium + b.issuesLow);
      //   return totalB - totalA
      //   // b.issuesCritical - a.issuesCritical
      // });

      // console.log(priorityDeps);

      // Create a block for every dependency in the Project
      if (rawDeps && rawDeps.length > -1) rawDeps.map( (dep: SnykDependency) => blocks = blocks.concat(generateDepListItemBlock(dep)));

      // Handle instances where blocks might be empty.
      if (blocks.length === 0) await respond ('There are no interesting dependencies to view, or there was trouble while generating the message list blocks');

      // Manage truncation of message.
      if (blocks.length > 35) {
        blocks = blocks.slice(0,33);
      }

      // Add the Intro blocks
      const introBlocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Dependency List: ${param}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `It is very likely that this list is not a complete reflection of your project's dependencies. Due to Slack message limits, this list may be truncated. `
          }
        }
      ]

      // Since generateDepListItemBlock creates each group of list item blocks
      // with a `divider` at the end, pop off the last one since it is
      // superfluous.
      blocks = blocks.slice(0, blocks.length - 1);

      const finalBlocks = introBlocks.concat(blocks);

      // console.log('pre-final blocks, ', priorityDeps);

      // Set up the message:
      const msg: RespondArguments = {
        delete_original: false,
        replace_original: false,
        blocks: finalBlocks,
      }

      await respond(msg);
    }



  }

}


// @todo move to msgs
const snykDependencyMissingProjectArgMsg = (): RespondArguments => {

  return {
    delete_original: false,
    replace_original: false,
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'You must provide a Project argument to the dependency list command. For more details, try \`/snyk dependencies help\`.'
        }
      }
    ]
  }

}

const getProjectIdByName = async (slackUid: string, projName: string, orgId?: string) => {
  const db = await readFromDb();
  let orgIndex: number = -1;
  let projIndex: number = -1;
  let userIndex: number = -1;

  const userIndexMatch = (user: SnlackUser) => user.slackUid === slackUid;
  const orgIndexMatch = (org: SnykOrg) => org.id === org.id;

  userIndex = db.users.findIndex(userIndexMatch);

  // If the user has no Orgs, fail.
  if (typeof db.users[userIndex].snykOrgs === 'undefined' || db.users[userIndex].snykOrgs?.length === 0) return;

  // If the optional orgId was passed, things get a little easier.
  if (typeof orgId !== 'undefined') {
    console.log('orgId was passed to getprojectidbyname()')
    orgIndex = db.users[userIndex].findIndex(orgIndexMatch);
  }
  // I suppose we'll have to loop through each org's projects looking for the match.
  else {
    const steppedIndexSearch = getOrgProjIndexFromNameWhenOrgUnknown(db.users[userIndex].snykOrgs as SnykOrg[], projName);
    orgIndex = steppedIndexSearch.org;
    projIndex = steppedIndexSearch.proj;
  }


  // At this point we should have all the indices for the bits we want, let's
  // get that ID.
  const projectID = db?.users[userIndex]?.snykOrgs?.[orgIndex]?.projects?.[projIndex]?.id;

  return projectID;
}


// This is the best function name to date.
const getOrgProjIndexFromNameWhenOrgUnknown = (orgs: SnykOrg[], projectName: string): {proj: number, org: number} => {

  // db.users[userIndex].snykOrgs?.map( (org, index) => {
  let projIndex: number = -1;
  let orgIndex: number = -1;

  orgs.map( (org, index) => {

    // Only perform the following operation if we don't actually have a projIndex value yet.
    if (projIndex === -1 || typeof projIndex === 'undefined') {
      projIndex = org.projects.findIndex( (proj, subindex) => {
        // Exit straightaway if the project name doesn't match
        if (proj.name !== projectName) return false;

        // If we didn't hit that last condition, the parent loop's index
        // should be set to the orgIndex and we'll return true. That tells
        // findIndex that this sub-index is what it should assign to
        // projIndex.
        orgIndex = index;
        return true;
      });

    }

  });

  return { proj: projIndex, org: orgIndex }

}


const generateDepDetailBlock = (dep: SnykDependency) => {

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: dep.name
      }
    },
    {
      context: {
        elements: [
          {
            type: 'mrkdwn',
            text: `${dep.id}`
          }
        ]
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Type*: ${dep.type}`,
        }
      ]
    }
  ]

}


  const generateDepListItemBlock = (dep: SnykDependency) => {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Name*: \`${dep.name}\` ⸱ *Type*: ${dep.type} ⸱ *Version*: ${dep.version}`
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_critical: ${dep.issuesCritical}  high: ${dep.issuesHigh}  medium: ${dep.issuesMedium} low: ${dep.issuesLow}_`
          }
        ]
      },
      {
        type: 'divider'
      },
    ]
  }
