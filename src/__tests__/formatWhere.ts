import { formatWhere } from '../index';

const toCamel = (s: string) => {
  return s.replace(/([-_][a-z])/gi, $1 => {
    return $1
      .toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};
describe('formatWhere', () => {
  test('when where = {}, it must return {}', () => {
    expect(formatWhere({})).toStrictEqual({});
  });
  test('when where = { email }, it must return { email }', () => {
    expect(formatWhere({ email: 'lm@apollo-prisma.com' })).toStrictEqual({ email: 'lm@apollo-prisma.com' });
  });
  test('when where = { user_email }, it must return { user_email }', () => {
    expect(formatWhere({ user_email: 'lm@apollo-prisma.com' })).toStrictEqual({ user_email: 'lm@apollo-prisma.com' });
  });
  test('when where = { email_not_in }, it must return { email: { notIn } }', () => {
    expect(formatWhere({ email_not_in: ['lm@apollo-prisma.com'] })).toStrictEqual({
      email: { notIn: ['lm@apollo-prisma.com'] },
    });
  });
  test('when where = { email_starts_with, email_ends_with }, it must return { email: { starts_with, ends_with } }', () => {
    expect(formatWhere({ email_starts_with: ['lm'], email_ends_with: ['apollo-prisma.com'] })).toStrictEqual({
      email: { startsWith: ['lm'], endsWith: ['apollo-prisma.com'] },
    });
  });
  test('when there is all at the same time', () => {
    const obj = [
      'contains',
      'starts_with',
      'ends_with',
      'not_contains',
      'not_ends_with',
      'not_in',
      'not',
      'lte',
      'lt',
      'in',
      'gt',
      'gte',
    ].reduce((acc, operator) => ({ ...acc, [`email_${operator}`]: operator }), {});

    const result = {
      email: [
        'contains',
        'starts_with',
        'ends_with',
        'not_contains',
        'not_ends_with',
        'not_in',
        'not',
        'lte',
        'lt',
        'in',
        'gt',
        'gte',
      ].reduce((acc, operator) => ({ ...acc, [toCamel(operator)]: operator }), {}),
    };
    expect(formatWhere(obj)).toStrictEqual(result);
  });
});
