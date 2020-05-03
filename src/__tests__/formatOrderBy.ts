import { formatOrderBy } from '../index';

describe('formatWhere', () => {
  test('when orderBy: {} return {}', () => {
    expect(formatOrderBy({})).toStrictEqual({});
  });
  test('when orderBy: foo_ASC return { foo: "asc"}', () => {
    expect(formatOrderBy('foo_ASC')).toStrictEqual({ foo: 'asc' });
  });
  test('when orderBy: foo_DESC return { foo: "desc" }', () => {
    expect(formatOrderBy('foo_DESC')).toStrictEqual({ foo: 'desc' });
  });
  test('when orderBy: foo_asc return { foo: "asc"}', () => {
    expect(formatOrderBy('foo_asc')).toStrictEqual({ foo: 'asc' });
  });
  test('when orderBy: foo_des return { foo: "desc" }', () => {
    expect(formatOrderBy('foo_desc')).toStrictEqual({ foo: 'desc' });
  });
});
