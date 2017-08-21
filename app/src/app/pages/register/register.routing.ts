import { Routes, RouterModule }  from '@angular/router';

import { Register } from './register.component';
import { RegisterCustomer } from './components/customers/customer.component';
import { RegisterEditor } from './components/editors/editor.component';

// noinspection TypeScriptValidateTypes
const routes: Routes = [
  {
    path: '',
    component: Register,
    children: [
      
      { path: '', redirectTo: 'editor', pathMatch: 'full' },
      { path: 'customer',  component: RegisterCustomer },
      { path: 'editor',  component: RegisterEditor },

    ]
  }
];


export const routing = RouterModule.forChild(routes);
