import { SnlackUser, SnykAPIVersion, SnykOrg, SnykProject } from '../../types';
import { dbReadEntry } from './';
import { callSnykApi2 } from './callSnykApi';
import { EncryptDecrypt } from './encryptDecrypt';


interface V1ApiOrg {
  id: string;
  name: string;
}


// export const getSnykProjectDeps = async(slackCallerUid: string, orgId: string, projectId: string): Promise<unknown[]> => {
export const getSnykProjectDeps = async(slackCallerUid: string, orgId: string, projectId: string, perPage?: number, pageCur?: number): Promise<any> => {
  console.log('CALLED getSnykProjectDeps with projectId: ', projectId);
  const data = await dbReadEntry({table: 'users', key: 'slackUid', value: slackCallerUid }) as SnlackUser;
  if (!data || typeof data === 'undefined') return [];
  const userIndexMatch = (user: SnlackUser) => user.slackUid === slackCallerUid;
  const orgIndexMatch = (org: SnykOrg) => org.id === orgId;
  const projIndexMatch = (proj: SnykProject) => proj.id === projectId;

  const fetchPage = (typeof pageCur === undefined) ? 0 : pageCur! + 1;

  // const userIndex: number = data.users.findIndex(userIndexMatch);

  // if (typeof userIndex !== 'undefined') {

    const orgIndex = data.snykOrgs?.findIndex(orgIndexMatch);
    console.log(`orgIndex is.........${orgIndex}`)

    if (typeof orgIndex !== 'undefined') {

      const projIndex = data.snykOrgs?.[orgIndex]?.projects.findIndex(projIndexMatch);

      if (typeof projIndex !== 'undefined') {
        const eD = new EncryptDecrypt(process.env.SNYK_ENCRYPTION_SECRET as string);
        const access_token = eD.decryptString(data?.snykAccessToken as string);
        const token_type = data.snykTokenType;

        const snykAPIReqArgs = {
          tokenType: token_type as string,
          token: access_token,
          version: SnykAPIVersion.V1,
          // data: JSON.stringify({
          //   filters: {
          //     projects: [ projectId ]
          //   }
          // })
        }


        console.log('Filtering by projects: ', projectId);

        const postData = JSON.stringify(
          {
            "filters": {
              "projects": [projectId],
              // "severity": [
              //   "high",
              //   "critical",
              //   "medium",
              //   "low"
              // ],
            },
          }
        );
        // const requests = await callSnykApi2(snykAPIReqArgs)
        const depOutput = await callSnykApi2(snykAPIReqArgs)
          // .post(`/org/${orgId}/dependencies`, { "filters": { "projects": [ `"${projectId}"` ] } })
          .post(`/org/${orgId}/dependencies?sortBy=severity&page=${fetchPage}&perPage=${perPage || 10}`, postData)
          .then((deps) => deps.data.results)
          .catch( (error) => {
            console.log('callSnykApi from getSnykProjects() Promise has been rejected.');
            console.log('Maybe there was an error?', error);
          });

        console.log('////// RESULT /////')
        console.log(depOutput);


        // console.log('called api for proj deps', depOutput);
        return depOutput;

      // return Promise.all(requests);

      }

    // The proj index was undefiuned, there's no proj with that ID in our db!
      else {
        console.log('There is no project in that org with that ID on that user in our DB.');
      }


    }
    // The org index was undefiuned, there's no org with that ID in our db!
    else {
      console.log('There is no org with that ID on that user in our DB.');
    }

  // }
  // The user index was undefined, there's no user with that ID in our db!
  // else {
    // console.log('There is no user with that ID in our DB.');
  // }

}
