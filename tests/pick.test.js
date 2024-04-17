const { pick } = require('../functions');

describe('pick', () => {
  it('should return an object with the specified fields from the input object', () => {
    // Arrange
    const object = {
      name: 'Unnamed Product',
      code: 'No Code',
      category: 'No Category',
      price: 0,
      vat: 0,
      param: 'value',
    };
    const fields = ['name', 'code', 'category', 'price', 'vat'];

    // Act
    const result = pick(object, fields);

    // Assert
    expect(result).toEqual({
      name: 'Unnamed Product',
      code: 'No Code',
      category: 'No Category',
      price: 0,
      vat: 0,
    });
  });

  it('should return an object only with the fields that exist in the input object', () => {
    // Arrange
    const object = {
      name: 'Another Product',
      price: 10.99,
    };
    const fields = ['name', 'price', 'nonexistent'];

    // Act
    const result = pick(object, fields);

    // Assert
    expect(result).toEqual({
      name: 'Another Product',
      price: 10.99,
    });
  });

  it('should return an empty object if none of the specified fields exist', () => {
    // Arrange
    const object = {
      param: 'value',
    };
    const fields = ['name', 'price'];

    // Act
    const result = pick(object, fields);

    // Assert
    expect(result).toEqual({});
  });
});
