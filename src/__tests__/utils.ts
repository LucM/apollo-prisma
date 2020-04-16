import { makeExecutableSchema, IResolvers, ITypeDefinitions } from 'graphql-tools';
import { graphql } from 'graphql';
import { GraphQLResolveInfo } from 'graphql';
import { prismaSelect } from '../index';

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
    prismaSelect(info);
  } catch (err) {
    throw err;
  }
  return toReturn;
};
