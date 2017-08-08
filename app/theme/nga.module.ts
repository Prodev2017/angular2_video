import { NgModule }      from '@angular/core';
import { CommonModule }  from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ModalModule, TabsModule } from 'ng2-bootstrap/ng2-bootstrap';
import { FileUploadModule } from 'ng2-file-upload/ng2-file-upload';
import { SpinnerModule,
        AutoCompleteModule,
        SharedModule,
        OverlayPanelModule,
        ButtonModule,
        ToggleButtonModule,
        ContextMenuModule,
        CheckboxModule } from 'primeng/primeng';

import {
  BaThemeConfig
} from './theme.config';

import {
  BaThemeConfigProvider
} from './theme.configProvider';

import {
  BaBackTop,
  BaCard,
  BaTable,
  BaCheckbox,
  BaContentTop,
  BaMsgCenter,
  BaMultiCheckbox,
  BaPageTop,
  TrackEditor,
  ReleaseEditor,
  MediaPlayer,
  SiteNav,
  StoreSelector
} from './components';

import { BaCardBlur } from './components/baCard/baCardBlur.directive';

import {
  BaScrollPosition,
  BaSlimScroll,
  BaThemeRun,
  Autofocus,
  Tooltipster,
  VideoJSPlayer,
} from './directives';

import {
  BaAppPicturePipe,
  BaKameleonPicturePipe,
  BaProfilePicturePipe,
  ApprovedTracksFilter,
  ApprovedTracksAndTracksInReleasesFilter,
  NeedsEditingTracksFilter,
  FilterTagOptionsForSetting,
  FilterAlreadySelectedGenres,
  SecondsToTime,
  ListLength
} from './pipes';

import {
  BaImageLoaderService,
  BaThemePreloader,
  BaThemeSpinner,
  UploadService,
  TagService,
  Genres,
  GigTypes,
  OriginalWorks,
  Releases,
  TrackService,
  EditorService,
  Account,
  Publish,
  KeyService
} from './services';

import {
  EmailValidator,
  EqualPasswordsValidator,
  UrlValidator,
  IfHasLengthValidator
} from './validators';
import {DataTableVirtualScrollModule} from '../pages/tracks/components/trackList/tableVirtualScroll';

const NGA_COMPONENTS = [
  BaBackTop,
  BaCard,
  BaTable,
  BaCheckbox,
  BaContentTop,
  StoreSelector,
  BaMsgCenter,
  BaMultiCheckbox,
  BaPageTop,
  TrackEditor,
  ReleaseEditor,
  MediaPlayer,
  SiteNav
];

const NGA_DIRECTIVES = [
  BaScrollPosition,
  BaSlimScroll,
  BaThemeRun,
  BaCardBlur,
  Autofocus,
  Tooltipster,
  VideoJSPlayer
];

const NGA_PIPES = [
  BaAppPicturePipe,
  BaKameleonPicturePipe,
  BaProfilePicturePipe,
  ApprovedTracksFilter,
  ApprovedTracksAndTracksInReleasesFilter,
  NeedsEditingTracksFilter,
  FilterTagOptionsForSetting,
  FilterAlreadySelectedGenres,
  SecondsToTime,
  ListLength
];

const NGA_SERVICES = [
  BaImageLoaderService,
  BaThemePreloader,
  BaThemeSpinner,
  UploadService,
  TagService,
  Genres,
  GigTypes,
  OriginalWorks,
  Releases,
  TrackService,
  EditorService,
  Account,
  Publish,
  KeyService
];

const NGA_VALIDATORS = [
  EmailValidator,
  EqualPasswordsValidator,
  UrlValidator,
  IfHasLengthValidator
];

@NgModule({
  declarations: [
    ...NGA_PIPES,
    ...NGA_DIRECTIVES,
    ...NGA_COMPONENTS
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ModalModule,
    SpinnerModule,
    AutoCompleteModule,
    DataTableVirtualScrollModule,
    SharedModule,
    OverlayPanelModule,
    ButtonModule,
    ToggleButtonModule,
    ContextMenuModule,
    FileUploadModule,
    CheckboxModule,
    TabsModule
  ],
  providers: [
    BaThemeConfigProvider,
    BaThemeConfig,
    ...NGA_VALIDATORS,
    ...NGA_SERVICES
  ],
  exports: [
    ...NGA_PIPES,
    ...NGA_DIRECTIVES,
    ...NGA_COMPONENTS
  ]
})
export class NgaModule {
}
