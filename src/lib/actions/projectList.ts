import { App as Slack, RespondArguments } from '@slack/bolt';
import { state } from '../../App';
import { projectDetailsMsg } from '../messages';
import { dbReadEntry, createProjObj } from '../utils';
import { SnlackUser, DbTableEntry, SnykProject } from '../../types';

export const actionProjectListOverflow = (slack: Slack) => {
  slack.action('project_list_overflow_action', async ({ ack, body, respond, payload }) => {
    console.enter('Entering actionProjectListOverflow...');
    await ack();
    state.changeUser(body.user.id);

    // Split up the option value to make lookups easier.
    if (payload.type === 'overflow') {
      const parts: any = splitProjectListDetailsOverflowValue(payload.selected_option.value);
      console.log('Parts:', parts);

      // Get the project object again since apparently we can't pass it from
      // the initiating command (projectListMsg.ts)
      // @TODO This sucks, figure it out.
      try {
        const userEntry: DbTableEntry = await dbReadEntry({ table: 'users', key: 'slackUid', value: body.user.id }) as SnlackUser;

        // @ts-ignore
        const projectFocus = userEntry.snykOrgs[parts.entryOrgIndex].projects[parts.entryProjIndex] as SnykProject;

        console.log('PROJECT FOCUS', projectFocus);
        const projObj = createProjObj(projectFocus);

        const msg = projectDetailsMsg(projObj);

        await respond(msg as RespondArguments);


      }
      catch (error) {
        console.log('There was an error here.', error);
        throw 'Ouch, oof.';
          // throw error;
      }

    }

    console.log('payload type', payload.type);
// proj-list-refresh-action
  });
}

// Gets the important bits from the value of the selected option in the payload.
const splitProjectListDetailsOverflowValue = (option: string) => {
  const optionParts = option.split('--');
  const lookup = {
    projectSlugName: optionParts[1],
    entryOrgIndex: parseInt(optionParts[2]), // The index of the Org object within the User's snykOrgs array.
    entryProjIndex: parseInt(optionParts[3]) // The index of the project within the Org object within the User's snykOrgs array. Confused yet?
  }
  return lookup;
}
        // @ts-ignore
        // const userProjects = userEntry.snykOrgs[entryOrgIndex].projects as SnykProject[];
        // if (Array.isArray(userProjects) && userProjects.length >= parts.indexInUserEntry) {
        //   const project: SnykProject = userProjects[parts.indexInUserEntry];

        //   const projObj = createProjObj(project);

        //   const msg = projectDetailsMsg(projObj);

        //   await respond(msg as RespondArguments);

        // }
