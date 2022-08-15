import { CustomRoute, SlackEvent } from '@slack/bolt';

interface SlackEventRequest {
  token: string,
  type: string
  event?: {},
  payload?: {},
  challenge?: string,
};

// This shouldn't be necessary in a Bolt application, but is perhaps necessary
// because we're stripping out the Receiver and combining Bolt with a regular
// Express app.
//
// @TODO: If we're going to handle /slack/events routes like this, we should do
//        signature verification.
//        See: https://api.slack.com/authentication/verifying-requests-from-slack
export const EventsController: CustomRoute = {
  path: '/slack/events',
  method: ['POST'],
  handler: (req, res) => {
    res.writeHead(200);
    console.log(`Received a GET request on ${req.url}:`);
    console.log(`Host: ${req.headers.host}`);
    // @ts-ignore
    console.log(`X-Slack-Request-Timestamp: ${req.headers['x-slack-request-timestamp']}`);
    console.log(`X-Slack-Signature: ${req.headers['x-slack-signature']}`);
    let body: string = '';
    req.on('data', chunk => {
      body += chunk.toString(); // convert Buffer to string
    });
    req.on('end', () => {
      const bodyJSON: SlackEventRequest = JSON.parse(body);
      // @ts-ignore
      if (bodyJSON.type === 'url_verification') {
        const challengeResponse = bodyJSON.challenge;
        res.end(challengeResponse);
      } else {
        console.log(bodyJSON);
        res.end('cool.');
      }
    });
  }
}
