import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_BUILD_NAME, APP_BUILD_VERSION } from './build-version';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly appName = APP_BUILD_NAME;
  protected readonly appVersion = APP_BUILD_VERSION;
  protected title = 'shell';
}
