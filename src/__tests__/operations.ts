import { PrismaSpy, apolloPrisma, testInfoFormater, resolverPrismaSelect } from './utils';

describe('operations', () => {
  beforeEach(() => {
    PrismaSpy.mockClear();
  });
  const tester = testInfoFormater({
    infoSpy: PrismaSpy,
    typeDefs: `
          ${apolloPrisma.directivesTypeDefs}

          directive @model(name: String) on OBJECT
          directive @field(name: String) on FIELD_DEFINITION

          type User @model {
            firstName: String @field
          }

          input FindManyWhereInput {
            test: String
          }

          input DataInput {
            firstName: String
          }

          type Query {
            findMany(where: FindManyWhereInput, first: Int, last: Int, skip: Int, after: Int, before: Int, orderBy: String): [User] @findMany
            updateMany(where: FindManyWhereInput, data: DataInput): [User] @updateMany
            deleteMany(where: FindManyWhereInput): [User] @deleteMany
            count(where: FindManyWhereInput): [User] @count
          }
      `,
    resolvers: {
      Query: {},
    },
    context: {
      apolloPrisma,
    },
  });

  test.each([
    [
      'findMany',
      'query { findMany(where: { test: "ok" }, first: 1, last: 2, skip: 3, after: 4, before: 5, orderBy: "ok") { firstName } }',
      {
        after: 4,
        before: 5,
        first: 1,
        last: 2,
        orderBy: 'ok',
        select: { firstName: true },
        skip: 3,
        where: { test: 'ok' },
      },
    ],
    [
      'updateMany',
      'query { updateMany(where: { test: "ok" }, data: { firstName: "ok" }) { firstName } }',
      { data: { firstName: 'ok' }, select: { firstName: true }, where: { test: 'ok' } },
    ],
    [
      'deleteMany',
      'query { deleteMany(where: { test: "ok" }) { firstName } }',
      { select: { firstName: true }, where: { test: 'ok' } },
    ],
    [
      'count',
      'query { count(where: { test: "ok" }) { firstName } }',
      { select: { firstName: true }, where: { test: 'ok' } },
    ],
  ])('%s', async (operation, query, infoReturn) => {
    await tester({
      query,
      infoReturn,
    });
  });
});
