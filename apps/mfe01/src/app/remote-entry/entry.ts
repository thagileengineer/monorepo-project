import { Component } from "@angular/core";
import { APP_BUILD_NAME, APP_BUILD_VERSION } from "./build-version";
import { NxWelcome } from "./nx-welcome";

@Component({
  imports: [NxWelcome],
  selector: "app-mfe01-entry",
  template: `
    <div class="mfe-version-banner" role="status">{{ appName }} · v{{ appVersion }}</div>
    <app-nx-welcome></app-nx-welcome>
  `,
  styles: [
    `
      .mfe-version-banner {
        font: 600 0.8125rem/1.3 system-ui, sans-serif;
        padding: 0.5rem 1rem;
        background: #0d3b2c;
        color: #e8fff4;
        border-bottom: 1px solid #1a6b4a;
      }
    `,
  ],
})
export class RemoteEntry {
  protected readonly appName = APP_BUILD_NAME;
  protected readonly appVersion = APP_BUILD_VERSION;
}
