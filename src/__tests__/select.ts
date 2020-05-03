import { apolloPrisma, testInfoFormater, resolverPrismaSelect } from './utils';

const infoSpy = jest.spyOn(apolloPrisma, 'select');

describe('Prisma-gql', () => {
  beforeEach(() => {
    infoSpy.mockClear();
  });
  const tester = testInfoFormater({
    infoSpy,
    typeDefs: `
        scalar DateTime
        ${apolloPrisma.directivesTypeDefs}

        type UserWithNoModel {
          firstName: String!
        }

        type User @model {
          firstName: String @field
          lastName: String @field(name: "last_name")
          avatar: String
          createdAt: DateTime @field(name: "dateCreation")
          posts: [Post] @field
          address: Address
        }

        type Post @model(name: "article") {
          title: String @field
        }

        type Address {
          street: String
        }

        type SimpleUser @model(name: "user") {
          firstName: String @field
        }

        type Query {
          users: [User]
          usersWithNoModel: [UserWithNoModel]
          simpleUsers: [SimpleUser]
        }
    `,
    resolvers: {
      Query: {
        users: resolverPrismaSelect(null),
        usersWithNoModel: resolverPrismaSelect(null),
        simpleUsers: resolverPrismaSelect(null),
      },
    },
  });
  test('no @model', async () => {
    return tester({
      query: `
          query {
            usersWithNoModel {
              firstName
            }
          }
        `,
      infoReturn: null,
    });
  });
  describe('with model', () => {
    test('with no @field', async () => {
      return tester({
        query: `
          query {
            users {
              avatar
            }
          }
        `,
        infoReturn: {},
      });
    });
    test('with @field', async () => {
      return tester({
        query: `
          query {
            users {
              firstName
            }
          }
        `,
        infoReturn: {
          firstName: true,
        },
      });
    });
    test('with @model(name)', async () => {
      return tester({
        query: `
          query {
            simpleUsers {
              firstName
            }
          }
        `,
        infoReturn: {
          firstName: true,
        },
      });
    });
    test('with @field(name)', async () => {
      return tester({
        query: `
          query {
            users {
              firstName
              createdAt
            }
          }
        `,
        infoReturn: {
          firstName: true,
          dateCreation: true,
        },
      });
    });
    test('with relation', async () => {
      return tester({
        query: `
          query {
            users {
              firstName
              posts {
                title
              }
            }
          }
        `,
        infoReturn: {
          firstName: true,
          posts: {
            select: {
              title: true,
            },
          },
        },
      });
    });
  });
  test('with relation without @model', async () => {
    return tester({
      query: `
          query {
            users {
              firstName
              address {
                street
              }
            }
          }
        `,
      infoReturn: {
        firstName: true,
      },
    });
  });
});
