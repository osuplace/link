# osu.place Link

> Easily connect osu! accounts to your Discord server!

osu.place Link is a Discord third-party app that provides a Linked Role connection to allow you to link your osu! account to Discord, use it as a requirement for a Linked Role, and show it on your Server Profile.

If you're looking to use this in your own Discord server, you **don't need to host it yourself**! Just visit [link.osu.place](https://link.osu.place/) and add it to your server, then [add a linked role](https://support.discord.com/hc/en-us/articles/10388356626711-Connections-Linked-Roles-Admins).

## Installation + Development

0. `git clone --recurse-submodules https://github.com/osuplace/link && cd link`
1. Build Auth.js:
	1. `cd auth.js`
	2. `pnpm install && pnpm build`
	3. This is gonna take like 5 minutes so go get a snack in the meantime :3
	4. Change all the dependencies that use `workspace:` in `packages/frameworks-express` and `packages/adapter-prisma` to use `file:` relative paths instead (i.e. `file:../core`).
2. `yarn install` (install dependencies)
3. Copy `.env.example` to `.env` and edit `.env` to configure the app
4. Set up the database:
	- In **development**, use `yarn db:dev` to generate the Prisma client and deploy the schema to your local database.
		1. If you make changes to the Prisma schema, run `yarn db:dev` again to regenerate the client and deploy the changes to your local database
		2. Then, before committing changes that modify the database schema, use `yarn db:commit` to generate migration files
		- Remember, you can use `yarn db:studio` to open Prisma Studio, a GUI to view and edit the database.
	- In **production**, use `yarn db:prod` to generate the Prisma client and deploy the migration files.
5. `yarn build` (compile TypeScript)
	1. You might see some errors within `@auth`, but those don't actually affect anything for us, so just ignore them.
6. `yarn register` (registers role metadata with Discord)
7. `yarn start`

# License & Copyright

Copyright (c) 2024 April <april@dummy.cafe> 

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.