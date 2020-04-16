import { testInfoFormater, resolverPrismaSelect } from './utils';
import * as PrismaGQL from '../index';

const infoSpy = jest.spyOn(PrismaGQL, 'prismaSelect');

describe('Prisma-gql', () => {
  beforeEach(() => {
    infoSpy.mockClear();
  });
  const tester = testInfoFormater({
    infoSpy,
    typeDefs: `
        scalar DateTime
        directive @model(name: String) on OBJECT
        directive @field(name: String) on FIELD_DEFINITION

        type User @model {
          verif(where: String, after: String, before: String, first: String, last: String, orderBy: String, skip: String): Verif @field
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
  test.each(['where', 'after', 'before', 'first', 'last', 'orderBy', 'skip'])('%s', async item => {
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
