import { SnykOrg, SnykAuthData }  from './';

// @TODO - This is the vision for combined user data after binding a Snyk
// account to a Slack account.  When determining whether or not a user already
// exists, we should take into account both the slackTeam.id and the
// slackUserId.
// @TODO - Perhaps extend SnykAuthData instead of replacing it?
//
// Envisioned shape of a SnlackUser object:
//
//     {
//       slackUserId: 'T03SSZZFPKH',
//       snykUserId: 'abcdefghijklmnop'
//        slackTeam: {
//          id: '0f0f02kllp',
//          name: 'Super Great Team',
//        },
//        snykOrgs: [
//          {
//            id: 'jfsajfasf20g0cvan20favv8',
//            name: 'Insecurity Inc.'
//          },
//          {
//            id: '8fhjf1000afvmpeo34kklHPPK',
//            name: 'Kuberneatos'
//          },
//        ],
//        snykAuthentication: {
//          authDate: '2022-08-08T10:17:02.150Z',
//          access_token: 'asdff02jws0fajf34jfadfj0j0af9j',
//          expires_in: 3600,
//          scope: 'org.read',
//          token_type: 'Bearer',
//          nonce: 'nonaf0f98nononono',
//          refresh_token: '0afs09j34jfha0fghsvasdofo2oaHapvvisis',
//        }
//     }
//
export interface SnlackUser {
  slackUserId: string;
  snykUserId: string;
  slackTeam: {
    id: string;
    name: string;
  }
  snykOrgs: SnykOrg[];
  snykAuthentication: {
    authDate: Date;
    access_token: string;
    expires_in: 3600;
    scope: string;
    token_type: string;
    nonce: string;
    refresh_token: string;
  }
}
