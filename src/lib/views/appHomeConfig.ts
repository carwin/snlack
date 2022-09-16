/**
 * This action handles the view of the Slack application's Home when the user
 * has already configured Snyk authentication.
 *
 * @category Views
 * @group App
 *
 */
import { readFromDb } from "../utils";

export const appHomeConfigView = () => {

}

// const getConfigProjList = async () => {
//   const tempState = new Proxy(userState, stateHandler)
//   tempState.changeUser('U03SNLU01JA');

//   const userData = await dbReadEntry({table: 'users', key: 'slackUid', value: tempState.slackUid })
//   let projectBlocksCollection: any[] = [];

//   // @ts-ignore
//   userData.snykOrgs.map((org, index) => {
//     // projectCollection = projectCollection.concat(org.projects);
//     projectBlocksCollection = projectBlocksCollection.concat(generateOrgItemProjectsSelectOptions(org));
//   })

//   return projectBlocksCollection;
// }

//
// projectOpts = generateOrgItemProjectsSelectOptions()
// const projectOpts = await getConfigProjList();

export const appSettingsFormBlocks = [
  {
    type: "input",
    element: {
      type: "multi_channels_select",
      action_id: "channels",
      placeholder: {
        type: "plain_text",
        text: "Where should alerts be sent?"
      }
    },
    label: {
      type: "plain_text",
      text: "Channel(s)"
    }
  },
  {
    type: "input",
    element: {
      type: "multi_static_select",
      action_id: "option_1",
      placeholder: {
        type: "plain_text",
        text: "Choose projects..."
      },
      // @ts-ignore
      // options: getConfigProjList(),
      options: [
        {
          text: {
            type: 'plain_text',
            text: 'carwin/qmk:firmware'
          }
        }
      ]
    },
    label: {
      type: "plain_text",
      text: "Project Filters"
    }
  },
  {
    type: "input",
    element: {
      type: "multi_static_select",
      action_id: "option_2",
      placeholder: {
        type: "plain_text",
        text: "Get notified only when severity is..."
      },
      options: [
        {
          text: {
            type: 'plain_text',
            text: 'critical',

          },
          value: 'critical',

        },
        {
          text: {
            type: 'plain_text',
            text: 'high',

          },
          value: 'high',

        },
        {
          text: {
            type: 'plain_text',
            text: 'medium',
          },
          value: 'medium',
        },
        {
          text: {
            type: 'plain_text',
            text: 'low',
          },
          value: 'low',
        }
      ]
    },
    label: {
      type: "plain_text",
      text: "Issue Severity Filters"
    }
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        action_id: "add_option",
        text: {
          type: "plain_text",
          text: "Add another option  "
        }
      }
    ]
  },
];

const getProjectsFilterOptions = async () => {
  const db = readFromDb
}
