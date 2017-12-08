import { NgModule }      from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgaModule } from '../../theme/nga.module';

import { routing } from './tracks.routing';
import { Router, RouterModule }  from '@angular/router';

import { Tracks } from './tracks.component';
import { TrackList } from './components/trackList/trackList.component';
import { ModalModule, DropdownModule, TabsModule } from 'ng2-bootstrap/ng2-bootstrap';
import { DataTableModule,
AccordionModule,
DataListModule,
         RadioButtonModule,
        SharedModule,
        ListboxModule,
        OverlayPanelModule,
        ButtonModule,
        ToggleButtonModule,
        ContextMenuModule,
        CheckboxModule} from 'primeng/primeng';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgaModule,
    routing,
    DataTableModule,
    SharedModule,
    ListboxModule,
    OverlayPanelModule,
    AccordionModule,
    ButtonModule,
    ToggleButtonModule,
    ContextMenuModule,
    DataListModule,
    ModalModule,
    DropdownModule,
    TabsModule,
    CheckboxModule,
    RadioButtonModule
  ],
  declarations: [
    Tracks,
    TrackList,
  ]
})
export default class TracksModule {}
