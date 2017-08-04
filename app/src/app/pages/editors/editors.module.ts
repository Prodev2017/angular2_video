import { NgModule }      from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgaModule } from '../../theme/nga.module';

import { routing } from './editors.routing';
import { Editors } from './editors.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { Uploader } from './components/uploader/uploader.component';
import { EditorProfile } from './components/profile/profile.component';
import { EditorTracksComponent } from './components/tracks/tracks.component';

import { TabsModule, DatepickerModule, ModalModule } from 'ng2-bootstrap/ng2-bootstrap';

import { AccordionModule, DataTableModule, OverlayPanelModule, 
         AutoCompleteModule, InputSwitchModule, DragDropModule, DropdownModule,
         CheckboxModule } from 'primeng/primeng';
         
import { SharedModule,
        MultiSelectModule,
        ListboxModule,
        ButtonModule,
        ToggleButtonModule,
        ContextMenuModule} from 'primeng/primeng';

import { FileUploadModule } from 'ng2-file-upload/ng2-file-upload';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgaModule,
    TabsModule,
    DatepickerModule,
    ModalModule,
    DataTableModule,
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
    EditorTracksComponent,
    Editors,
    Uploader,
    EditorProfile,
    WelcomeComponent
  ]
})

export default class EditorsModule {
}
