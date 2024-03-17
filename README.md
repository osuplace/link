# Link

Link is a Discord Connection service to allow you to connect your osu! account to Discord.

## Installation

0. `git clone --recurse-submodules https://github.com/osuplace/link && cd link`
1. `yarn install` (install dependencies)
2. Build Auth.js:
	a. `cd auth.js`
	b. `pnpm install && pnpm build`
	c. This is gonna take like 5 minutes so go get a snack in the meantime :3
	d. Change all the dependencies that use `workspace:` in `packages/frameworks-express` and `packages/adapter-prisma` to use `file:` relative paths instead (i.e. `file:../core`).
3. Copy `.env.example` to `.env` and edit `.env` to configure the app
4. `yarn db:push` (push database schema)
5. `yarn build` (compile TypeScript)
6. `yarn register` (registers role metadata with Discord)
7. `yarn start`

Note: Unfortunately, because `@auth/express` uses an outdated version of `@auth/core` right now, there are a bunch of errors that you have to just ignore...

## Development 

Note: The `@auth/core` requirement should be the same version across Link, `@auth/express`, and `@auth/prisma-adapter`!

# License & Copyright

Copyright (c) 2024 April <april@dummy.cafe> 

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.