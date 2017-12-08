import { ErrorHandler, NgModule } from '@angular/core';
import { Inject } from "@angular/core";
import { Injectable } from "@angular/core";

import { GlobalState } from './global.state';

declare var Bugsnag;

export interface LoggingErrorHandlerOptions {
    rethrowError: boolean;
    unwrapError: boolean;
}

export var LOGGING_ERROR_HANDLER_OPTIONS: LoggingErrorHandlerOptions = {
    rethrowError: false,
    unwrapError: false
};

@Injectable()
export class BugSnagErrorHandler implements ErrorHandler {
 
  private options: LoggingErrorHandlerOptions;

  constructor(private _state: GlobalState, @Inject( LOGGING_ERROR_HANDLER_OPTIONS ) options: LoggingErrorHandlerOptions) {

        this._state = _state;
        this.options = options;

    }
    
  handleError(error) {
    var errorMsg;

    errorMsg = error;
    
        if(error.status == 503) {
      
      errorMsg = "The server experienced an unexpected error or is currently undergoing maintenance. Please try again in a minute. If this message persists, email us at store@crooklynclan.net with a brief summary of how you encountered the error and we will investigate as soon as possible.";
        
          
        }
        


    this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Error', detail: errorMsg});
                          this._state.notifyDataChanged('spinner.hide', {});

    
    Bugsnag.notifyException(error);
    console.error(error);
    console.trace();
    

  }
}
@NgModule({
  providers: [    {
        provide: LOGGING_ERROR_HANDLER_OPTIONS,
        useValue: LOGGING_ERROR_HANDLER_OPTIONS
    },
    {
        provide: ErrorHandler,
        useClass: BugSnagErrorHandler
    }]
})
export class BugSnagErrorHandlerModule {}
