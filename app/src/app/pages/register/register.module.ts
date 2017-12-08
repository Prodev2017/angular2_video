import { NgModule }      from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgaModule } from '../../theme/nga.module';

import { Register } from './register.component';
import { RegisterCustomer } from './components/customers/customer.component';
import { RegisterEditor } from './components/editors/editor.component';

import { routing }       from './register.routing';


@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgaModule,
    routing
  ],
  declarations: [
    Register,
    RegisterCustomer,
    RegisterEditor
  ]
})
export default class RegisterModule {}
