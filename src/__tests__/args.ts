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

        type User @model {
          verif(where: String, after: String, before: String, first: String, last: String, orderBy: String, skip: String, data: String): Verif @field
        }

        type Verif @model {
          ok: Boolean @field
        }

        type Query {
          users: [User]
        }
    `,
    resolvers: {
      Query: {
        users: resolverPrismaSelect(null),
      },
    },
  });
  test.each(['where', 'after', 'before', 'first', 'last', 'orderBy', 'skip', 'data'])('%s', async item => {
    return tester({
      query: `
          query {
            users {
              verif(${item}: "ok") {
                ok
              }
            }
          }
        `,
      infoReturn: {
        verif: {
          select: {
            ok: true,
          },
          [item]: 'ok',
        },
      },
    });
  });
});
