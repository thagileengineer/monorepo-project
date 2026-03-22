import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_BUILD_NAME, APP_BUILD_VERSION } from '../build-version';

@Component({
  selector: 'app-shell',
  imports: [RouterModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  protected readonly appName = APP_BUILD_NAME;
  protected readonly appVersion = APP_BUILD_VERSION;
}
