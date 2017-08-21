import { NgModule }      from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgaModule } from '../../theme/nga.module';

import { routing } from './tracks.routing';

import { Tracks } from './tracks.component';
import { TrackList } from './components/trackList/trackList.component';
import { ModalModule, DropdownModule, TabsModule } from 'ng2-bootstrap/ng2-bootstrap';
import {
DataListModule,
         RadioButtonModule,
        SharedModule,
        ListboxModule,
        OverlayPanelModule,
        ButtonModule,
        ToggleButtonModule,
        ContextMenuModule,
        CheckboxModule} from 'primeng/primeng';
import {DataTableVirtualScrollModule} from './components/trackList/tableVirtualScroll';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgaModule,
    routing,
    DataTableVirtualScrollModule,
    SharedModule,
    ListboxModule,
    OverlayPanelModule,
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
  ],
  exports: [
    NgaModule
  ]
})
export default class TracksModule {}
