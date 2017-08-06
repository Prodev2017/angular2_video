export class User {
  
  name: any = {first: null, last: null};
  address: any = {street1: null, street2: null, suburb: null, state: null, postcode: null};
  email: string;
  password: string;
  password_confirm: string;
  userJobs: Array<string>;
  stageName: string;
  yearStarted: string;

}
