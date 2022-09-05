import { readFromDb } from "../utils";

export const appHomeConfigView = () => {

}

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
      type: "plain_text_input",
      action_id: "option_1",
      placeholder: {
        type: "plain_text",
        text: "First option"
      }
    },
    label: {
      type: "plain_text",
      text: "Option 1"
    }
  },
  {
    type: "input",
    element: {
      type: "plain_text_input",
      action_id: "option_2",
      placeholder: {
        type: "plain_text",
        text: "How many options do they need, really?"
      }
    },
    label: {
      type: "plain_text",
      text: "Option 2"
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
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "Test block with multi static select"
    },
    accessory: {
      type: "multi_static_select",
      placeholder: {
        type: "plain_text",
        text: "Select options",
        emoji: true
      },
      "options": [
        {
          text: {
            type: "plain_text",
            text: "*this is plain_text text*",
            emoji: true
          },
          value: "value-0"
        },
        {
          text: {
            type: "plain_text",
            text: "*this is plain_text text*",
            emoji: true
          },
          "value": "value-1"
        },
        {
          text: {
            type: "plain_text",
            text: "*this is plain_text text*",
            emoji: true
          },
          value: "value-2"
        }
      ],
      action_id: "multi_static_select-action"
    }
  }
];

const getProjectsFilterOptions = async () => {
  const db = readFromDb
}
