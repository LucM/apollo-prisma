import { infoParser, IInfoField, IInfoNode, IInfoArgs } from 'graphql-info-parser';
import { GraphQLResolveInfo, GraphQLField } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';

export interface ISelect {
  [key: string]: true & ISelect;
}

enum Args {
  where = 'where',
  after = 'after',
  before = 'before',
  first = 'first',
  last = 'last',
  orderBy = 'orderBy',
  skip = 'skip',
  data = 'data',
  create = 'create',
  update = 'update',
}

const args = [
  Args.where,
  Args.after,
  Args.before,
  Args.first,
  Args.last,
  Args.orderBy,
  Args.skip,
  Args.data,
  Args.create,
  Args.update,
];

function pickArgs(infoArgs: IInfoArgs, selectedArgs: Args[] = []) {
  return selectedArgs
    .filter(arg => infoArgs[arg])
    .reduce((acc, arg) => {
      return {
        ...acc,
        [arg]: infoArgs[arg],
      };
    }, {});
}

function checkArgs(operationArgs: IInfoArgs, checkArgs: Args[]) {
  //..
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
              ...args.filter(key => field.args[key]).reduce((acc, key) => ({ ...acc, [key]: field.args[key] }), {}),
            }
          : true,
      };
    }, {});
}

function getEntity(node: IInfoNode) {
  return node.directivesObject.model.name ? node.directivesObject.model.name : node.type.toLowerCase();
}

export interface IPrismaSelect {
  select: ISelect;
}

export interface IPrismaQuery {
  [key: string]: IPrismaSelect;
}

interface IApolloPrismaClient {
  [key: string]: {
    findOne: any;
    findMany: any;
    count: any;
    create: any;
    update: any;
    updateMany: any;
    upsert: any;
    delete: any;
    deleteMany: any;
  };
}

const ComputeDirective = (name: string) =>
  class extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
      field.resolve = async function(parent, args, ctx, info) {
        if (!ctx.apolloPrisma) {
          throw new Error('apolloPrisma must be placed into context');
        }

        return ctx.apolloPrisma[name](info);
      };
    }
  };

export const directivesTypeDefs = `
  directive @create on FIELD_DEFINITION
  directive @update on FIELD_DEFINITION
  directive @delete on FIELD_DEFINITION
  directive @findOne on FIELD_DEFINITION
  directive @findMany on FIELD_DEFINITION
  directive @updateMany on FIELD_DEFINITION
  directive @deleteMany on FIELD_DEFINITION
  directive @count on FIELD_DEFINITION
`;

export class ApolloPrisma {
  prismaClient: any;
  directivesTypeDefs: string;

  constructor(prismaClient: any) {
    this.prismaClient = prismaClient;
    this.directivesTypeDefs = directivesTypeDefs;
  }

  get directives() {
    return ['create', 'delete', 'update', 'findOne', 'findMany', 'deleteMany', 'updateMany', 'count', 'count'].reduce(
      (acc, item) => {
        return {
          ...acc,
          [item]: ComputeDirective(item),
        };
      },
      {},
    );
  }

  public select(info: GraphQLResolveInfo) {
    const node = infoParser(info);
    if (!node?.directivesObject.model || !node.fields) return null;
    return node.fields ? formatFields(node.fields) : {};
  }

  private async operation(fn: String, args: Args[], info: GraphQLResolveInfo) {
    const node = infoParser(info);
    if (!node?.directivesObject.model || !node.fields) return null;
    const entity = getEntity(node);
    const select = node.fields ? formatFields(node.fields) : {};

    const result = await this.prismaClient[entity].findOne({
      select,
      ...(Args.data && node.args.data ? { data: node.args.data } : {}),
      ...(Args.where && node.args.id ? { where: { id: node.args.id } } : {}),
    });
    return result;
  }

  private async operations(fn: String, args: Args[], info: GraphQLResolveInfo) {
    const node = infoParser(info);
    if (!node?.directivesObject.model || !node.fields) return null;
    const entity = getEntity(node);
    const select = node.fields ? formatFields(node.fields) : {};
    const manyArgs = pickArgs(node.args, args);
    const result = await this.prismaClient[entity].findOne({ select, ...manyArgs });
    return result;
  }

  public async create(info: GraphQLResolveInfo) {
    return this.operation('create', [Args.data], info);
  }

  public async update(info: GraphQLResolveInfo) {
    return this.operation('update', [Args.where, Args.data], info);
  }

  public async delete(info: GraphQLResolveInfo) {
    return this.operation('delete', [Args.where], info);
  }

  public async findOne(info: GraphQLResolveInfo) {
    return this.operation('findOne', [Args.where], info);
  }

  public async findMany(info: GraphQLResolveInfo) {
    return this.operations(
      'findMany',
      [Args.where, Args.orderBy, Args.skip, Args.after, Args.before, Args.first, Args.last],
      info,
    );
  }

  public async updateMany(info: GraphQLResolveInfo) {
    return this.operations('updateMany', [Args.where, Args.data], info);
  }

  // public async upsert(info: GraphQLResolveInfo) {
  //   return this.operation('upsert', [Args.where, Args.create, Args.update], info);
  // }

  public async deleteMany(info: GraphQLResolveInfo) {
    return this.operations('deleteMany', [Args.where], info);
  }

  public async count(info: GraphQLResolveInfo) {
    return this.operations('count', [Args.where], info);
  }
}
