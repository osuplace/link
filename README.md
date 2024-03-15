# Link

Link is a Discord Connection service to allow you to connect your osu! account to Discord.

## Installation

1. `yarn install`
2. Copy `.env.example` to `.env` and edit `.env` to configure the app
3. `yarn build`
4. `yarn start`

## Development setup

This project uses Yarn plug-n-play, and comes with the required settings for VS Code. 

- If you're using VS Code, make sure to *allow VS Code to use the workspace's TypeScript version* (you should get a notification regarding this the first time you open a TypeScript file).
- If you're using a different editor, see the [Yarn Editor SDKs documentation](https://yarnpkg.com/getting-started/editor-sdks) and run the command you need (i.e. `yarn dlx @yarnpkg/sdks vim`).

Note: The `@auth/core` requirement should be the same version as the `@auth/core` requirement within `@auth/express`!

# License & Copyright

Copyright (c) 2024 April <april@dummy.cafe> 

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.