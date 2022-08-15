import {HomeView} from '@slack/bolt';
import { v4 as uuid4 } from 'uuid';

// Updates the contents of the Home tab.
// We can use this for modifying the details / content presented to users based
// on contexts like whether or not they've authorized with Snyk.
export const updateView = async(user: string) => {
  let blocks = [
    {
      type: 'section',
      block_id: 'homeblock1',
      text: {
        type: 'mrkdwn',
        text: `*Welcome @${user}!*\nThis is a home for the unofficial Snyk app.`
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Authorize Snyk'
          },
          value: uuid4(),
          url: 'http://localhost:3000/snyk/preauth',
          action_id: 'auth_snyk'
        },
      ]
    },
    {
      type: 'divider'
    }
  ];

  let view :HomeView = {
    type: 'home',
    blocks: blocks
  }

  return view;
}

// Display App Home
export const createHome = async({user, data}: {user: string, data?: string}) => {
  console.log('User looking at home: ', user);
  if(data) {
    // Store something in a local DB maybe...
    // Perhaps users will do more than just click the Auth button.
    // Should we perhaps provide App options here?
    //
    // something like... db.push(`/${user}/data[]`, data, true);
  }

  const userView = await updateView(user);

  return userView;
};
