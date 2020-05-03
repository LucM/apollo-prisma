import { infoParser, IInfoField, IInfoNode, IInfoArgs } from 'graphql-info-parser';
import { GraphQLResolveInfo, GraphQLField, defaultFieldResolver } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';

const toCamel = (s: string) => {
  return s.replace(/([-_][a-z])/gi, $1 => {
    return $1
      .toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

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

function pickArgs(infoArgs: IInfoArgs, selectedArgs: Args[] = []): { [key: string]: any } {
  return selectedArgs
    .filter(arg => infoArgs[arg])
    .reduce((acc, arg) => {
      return {
        ...acc,
        [arg]: infoArgs[arg],
      };
    }, {});
}

const whereOperator = [
  'not_ends_with',
  'not_contains',
  'starts_with',
  'ends_with',
  'contains',
  'not_in',
  'not',
  'gte',
  'lte',
  'lt',
  'in',
  'gt',
];
// where: { email_starts_with, email_ends_with } => where: { email: { startsWith, endsWith }}
export function formatWhere(obj: { [key: string]: any }) {
  return Object.entries(obj).reduce((acc: { [key: string]: any }, [key, value]) => {
    for (const i in whereOperator) {
      const operator = whereOperator[i];
      const regex = new RegExp(`^.*_${operator}$`);
      if (regex.test(key)) {
        const fieldKey = key.substr(0, key.length - operator.length - 1);
        return {
          ...acc,
          [fieldKey]: {
            ...acc[fieldKey],
            [toCamel(operator)]: value,
          },
        };
      }
    }
    return {
      ...acc,
      [key]: value,
    };
  }, {});
}

export function formatOrderBy(key: any) {
  if (typeof key === 'string') {
    if (/^.*_ASC$/i.test(key)) {
      return { [key.substr(0, key.length - 4)]: 'asc' };
    }
    if (/^.*_DESC$/i.test(key)) {
      return { [key.substr(0, key.length - 5)]: 'desc' };
    }
  }
  return key;
}

function formatFields(fields: IInfoField[]): ISelect {
  return fields
    .filter(field => field.directivesField.field)
    .reduce((acc, field) => {
      const { name: key = field.name, select } = field.directivesField.field;
      return {
        ...acc,
        ...(select
          ? select.reduce((acc: { [key: string]: boolean }, f: string) => ({ ...acc, [f]: true }), {})
          : {
              [key as string]: field.fields
                ? {
                    select: formatFields(field.fields),
                    ...args
                      .filter(key => field.args[key])
                      .reduce((acc, key) => ({ ...acc, [key]: field.args[key] }), {}),
                  }
                : true,
            }),
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

class FieldDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { name } = this.args;
    if (!name) {
      return;
    }
    const { resolve = defaultFieldResolver } = field;
    field.resolve = (parent, args, ctx, info) => {
      const newParent = {
        ...parent,
        [field.name]: parent[name],
      };
      return resolve(newParent, args, ctx, info);
    };
  }
}

export const directivesTypeDefs = `
  directive @model(name: String) on OBJECT
  directive @field(name: String, select: [String]) on FIELD_DEFINITION
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
  log: boolean;

  constructor(prismaClient: any, log: boolean = false) {
    this.log = log;
    this.prismaClient = prismaClient;
    this.directivesTypeDefs = directivesTypeDefs;
  }

  get directives() {
    return {
      field: FieldDirective,
      ...['create', 'delete', 'update', 'findOne', 'findMany', 'deleteMany', 'updateMany', 'count'].reduce(
        (acc, item) => {
          return {
            ...acc,
            [item]: ComputeDirective(item),
          };
        },
        {},
      ),
    };
  }

  public select(info: GraphQLResolveInfo) {
    try {
      const node = infoParser(info);
      if (!node?.directivesObject.model || !node.fields) return null;
      return node.fields ? formatFields(node.fields) : {};
    } catch (err) {
      console.trace(err);
      return null;
    }
  }

  private async operation(fn: string, args: Args[], info: GraphQLResolveInfo) {
    const node = infoParser(info);
    if (!node?.directivesObject.model || !node.fields) return null;
    const entity = getEntity(node);

    try {
      const select = node.fields ? formatFields(node.fields) : {};
      const payload = {
        select,
        ...(Args.data && node.args.data ? { data: node.args.data } : {}),
        ...(Args.where && node.args.id ? { where: { id: node.args.id } } : { where: node.args.where }),
      };
      if (this.log) console.log(`${entity}.${fn} start`, JSON.stringify(payload, null, 2));
      const result = await this.prismaClient[entity][fn](payload);
      if (this.log) console.log(`${entity}.${fn} Ok`);
      return result;
    } catch (err) {
      if (this.log) console.log(`[${entity}.${fn}]: an error happened`);
      throw err;
    }
  }

  private async operations(fn: string, args: Args[], info: GraphQLResolveInfo) {
    const node = infoParser(info);
    if (!node?.directivesObject.model || !node.fields) return null;
    const entity = getEntity(node);
    try {
      const select = node.fields ? formatFields(node.fields) : {};
      const manyArgs = pickArgs(node.args, args);
      const payload = {
        select,
        ...manyArgs,
        ...(manyArgs.where ? { where: formatWhere(manyArgs.where) } : {}),
        ...(manyArgs.orderBy ? { orderBy: formatOrderBy(manyArgs.orderBy) } : {}),
      };
      if (this.log) console.log(`${entity}.${fn} start`, JSON.stringify(payload, null, 2));
      const result = await this.prismaClient[entity][fn](payload);
      if (this.log) console.log(`${entity}.${fn} Ok`);
      return result;
    } catch (err) {
      if (this.log) console.log(`[${entity}.${fn}]: an error happened`);
      throw err;
    }
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
