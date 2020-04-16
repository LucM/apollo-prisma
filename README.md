# Apollo-prisma ![](https://github.com/LucM/apollo-prisma/workflows/CI/badge.svg)

[TODO: Insert description]

## Install

### with npm

```
npm install --save apollo-prisma
```

### with yarn

```
yarn add apollo-prisma
```

## Usage

```graphql
directive @model(name: String) on OBJECT
directive @field(name: String) on FIELD_DEFINITION
directive @findOne on FIELD_DEFINITION
directive @findMany on FIELD_DEFINITION
directive @create on FIELD_DEFINITION
directive @update on FIELD_DEFINITION
directive @delete on FIELD_DEFINITION

type User @model {
   id: ID! @field
   firstName: String @field
   lastName: String @field
   posts: [Post] @field
   isOnline: Boolean @field(name: 'online')
}
type Post @model {
   title: String @field
   content: String @field
}
input InputWhereUsers {
   online: Boolean
}

type Query {
   user(id: Id!): User @findOne
   users(where: InputWhereUsers, first: Int): [User] @findMany
}

input InputCreateUser {
  firstName: String!
  lastName: String!
}

input InputUpdateUser {
  firstName: String
  lastName: String
}

type Mutation {
   createUser(data: InputCreateUser): User @create
   updateUser(id: ID!, data: InputUpdateUser): User @create
   deleteUser(id: ID!): User @create
}
```

```ts
import { GraphQLServer } from 'graphql-yoga';
import { ApolloPrismaDirectives, ApolloPrismaContext } from 'apollo-prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

new GraphQLServer({
   typeDefs: './schema.graphql',
   resolvers: {},
   context: { ...ApolloPrismaContext(prisma) },
   directives: { ...ApolloPrismaDirectives },
}).start(() => console.log('server started');
```

## Resolvers

```ts
const User = {

  posts: (parents, args, ctx, info) => {
    // Add Verification
    return ctx.apolloPrisma.findMany(info);
  }

  posts: (parents, args, ctx, info) => {
    // Add Verification
    return ctx.prisma.findMany({
      where: {id: 23},
      select: ctx.apolloPrisma.select(info);
    })
  }
}

```
