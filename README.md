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

### Map with Prisma Model using directives

```graphql
directive @table(name: String) on OBJECT
directive @field(name: String) on FIELD_DEFINITION

type User @table(name: "user") {
  firstName: String @field
  lastName: String
  email: String @field(name: "email_adress")
  userActions: Posts @field
}

type Query {
  users: [User] @findMany
}
```
