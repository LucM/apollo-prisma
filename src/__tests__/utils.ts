import { makeExecutableSchema, IResolvers, ITypeDefinitions } from 'graphql-tools';
import { graphql } from 'graphql';
import { GraphQLResolveInfo } from 'graphql';
import { ApolloPrisma } from '../index';

export const PrismaSpy = jest.fn().mockImplementation(result => result);

const prismaClient = {
  findOne: PrismaSpy,
  findMany: PrismaSpy,
  count: PrismaSpy,
  create: PrismaSpy,
  update: PrismaSpy,
  updateMany: PrismaSpy,
  upsert: PrismaSpy,
  delete: PrismaSpy,
  deleteMany: PrismaSpy,
};

export const apolloPrisma = new ApolloPrisma({ user: prismaClient, post: prismaClient });

export const testInfoFormater = ({
  infoSpy,
  resolvers,
  typeDefs,
  context,
}: {
  infoSpy: any;
  resolvers: IResolvers<any, any> | Array<IResolvers<any, any>>;
  typeDefs: ITypeDefinitions;
  context?: any;
}) => async ({ query, infoReturn, variables }: { infoReturn: any; query: any; variables?: any }): Promise<void> => {
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      ...apolloPrisma.directives,
    },
  });

  await graphql(schema, query, null, context, variables);
  expect(infoSpy).toHaveReturnedWith(infoReturn);
};

export const resolverPrismaSelect = (toReturn: any) => (
  parent: any,
  args: any,
  ctx: any,
  info: GraphQLResolveInfo,
): any => {
  try {
    apolloPrisma.select(info);
  } catch (err) {
    throw err;
  }
  return toReturn;
};
