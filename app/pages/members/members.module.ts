import { NgModule }      from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgaModule } from '../../theme/nga.module';

import { routing } from './members.routing';
import { Members } from './members.component';
import { MemberProfile } from './components/profile/profile.component';

import { TabsModule, DatepickerModule, ModalModule } from 'ng2-bootstrap/ng2-bootstrap';

import { AccordionModule, OverlayPanelModule,
         AutoCompleteModule, InputSwitchModule, DragDropModule, DropdownModule,
         CheckboxModule } from 'primeng/primeng';

import { SharedModule,
        MultiSelectModule,
        ListboxModule,
        ButtonModule,
        ToggleButtonModule,
        ContextMenuModule} from 'primeng/primeng';

import { FileUploadModule } from 'ng2-file-upload/ng2-file-upload';
import {DataTableVirtualScrollModule} from '../tracks/components/trackList/tableVirtualScroll';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgaModule,
    TabsModule,
    DatepickerModule,
    ModalModule,
    DataTableVirtualScrollModule,
    OverlayPanelModule,
    FileUploadModule,
    InputSwitchModule,
    AutoCompleteModule,
    DragDropModule,
    CheckboxModule,
    AccordionModule,
    SharedModule,
    MultiSelectModule,
    ListboxModule,
    DropdownModule,
    ButtonModule,
    ToggleButtonModule,
    ContextMenuModule,
    routing
  ],
  declarations: [
    Members,
    MemberProfile
  ]
})

export default class MembersModule {
}
