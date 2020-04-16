import { infoParser, IInfoField, IInfoNode } from 'graphql-info-parser';
import { GraphQLResolveInfo } from 'graphql';

export interface ISelect {
  [key: string]: true & ISelect;
}

function formatFields(fields: IInfoField[]): ISelect {
  return fields
    .filter(field => field.directivesField.field)
    .reduce((acc, field) => {
      const { name: key = field.name } = field.directivesField.field;
      return {
        ...acc,
        [key as string]: field.fields
          ? {
              select: formatFields(field.fields),
              ...['where', 'after', 'before', 'first', 'last', 'orderBy', 'skip']
                .filter(key => field.args[key])
                .reduce((acc, key) => ({ ...acc, [key]: field.args[key] }), {}),
            }
          : true,
      };
    }, {});
}

export interface IPrismaSelect {
  select: ISelect;
}

export interface IPrismaQuery {
  [key: string]: IPrismaSelect;
}

export const prismaSelect = (info: GraphQLResolveInfo) => {
  const node = infoParser(info);
  if (!node?.directivesObject.model || !node.fields) return null;
  return node.fields ? formatFields(node.fields) : {};
};

export const prismaFindOne = (prisma: any) => (info: GraphQLResolveInfo) => {
  const node = infoParser(info);
  if (!node?.directivesObject.model || !node.fields) return null;
  const { name: key = node.type.toLowerCase() } = node.directivesObject.model;
  // Find Many.
  return prisma[name][node.isList ? 'findMany' : 'findOne'];
};

// -- Operation --
// count
// create
// delete
// deleteMany
// findOne
// findMany
// update
// updateMany
// upset
