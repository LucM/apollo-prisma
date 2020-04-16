import { PrismaSpy, apolloPrisma, testInfoFormater } from './utils';

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

          input DataInput {
            firstName: String
          }

          type Query {
            create(data: DataInput): User @create
            update(id: Int, data: DataInput): User @update
            delete(id: Int): User @delete
            findOne(id: Int): User @findOne
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
      'create',
      'query { create(data: { firstName: "foo" }) { firstName }}',
      { data: { firstName: 'foo' }, select: { firstName: true } },
    ],
    [
      'update',
      'query { update(id: 42, data: { firstName: "foo" }) { firstName }}',
      { data: { firstName: 'foo' }, select: { firstName: true }, where: { id: 42 } },
    ],
    ['delete', 'query { delete(id: 42) { firstName }}', { select: { firstName: true }, where: { id: 42 } }],
    ['findOne', 'query { findOne(id: 42) { firstName }}', { select: { firstName: true }, where: { id: 42 } }],
  ])('%s', async (operation, query, infoReturn) => {
    await tester({
      query,
      infoReturn,
    });
  });
});
