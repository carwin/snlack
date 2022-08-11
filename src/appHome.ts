import {HomeView} from '@slack/bolt';
import { v4 as uuid4 } from 'uuid';
export const updateView = async(user: string) => {
  // Intro message -

  let blocks = [
    {
      type: 'section',
      block_id: 'homeblock1',
      text: {
        type: 'mrkdwn',
        text: `*Welcome ${user}!*\nThis is a home for the unofficial Snyk app.`
      },
      accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Authorize Snyk'
          },
        value: uuid4(),
          action_id: 'auth_snyk'

        // type: 'button',
        // action_id: 'auth_snyk',
        // text: {
        //   type: 'plain_text',
        //   text: 'Authorize to win',
        //   emoji: true
        // }
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: ':wave: Hey, Carwin is great...'
        }
      ]
    },
    {
      type: 'divider'
    }
  ];

  let view :HomeView = {
    type: 'home',
    // callback_id: 'home_view',
    // title: {
    //   type: 'plain_text',
    //   text: 'Keep notes!'
    // },
    blocks: blocks
  }

  // return JSON.stringify(view);
  return view;
}

/* Display App Home */

export const createHome = async (homeData: {user: string, data?: string}) => {
  console.log('User looking at home: ', homeData.user);
  if(homeData.data) {
    // Store in a local DB
    // db.push(`/${user}/data[]`, data, true);
  }

  const userView = await updateView(homeData.user);

  return userView;
};
