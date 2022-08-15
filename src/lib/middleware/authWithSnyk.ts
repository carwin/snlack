// Check if the user is authorized with every request.
// Is this a good idea?
// @ts-ignore
export const checkAuthWithSnyk = async ({ payload, client, context, next }) => {
  const slackUserId = payload.user;
}
