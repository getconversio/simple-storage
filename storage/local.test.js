'use strict';

const fs = require('fs'),
  Local = require('./local');

const local = new Local({ localDirectory: __dirname + '/../test' });

describe('storage/local', () => {
  beforeAll(() => fs.writeFileSync(__dirname + '/../test/foo', Buffer.from('foo')));
  afterAll(() => fs.unlinkSync(__dirname + '/../test/foo'));

  describe('exists', () => {
    it('should return true if a file exists', async () => {
      expect(await local.exists('foo')).toEqual(true);
    });

    it('should return false if a file does not exists', async () => {
      expect(await local.exists('bar')).toEqual(false);
    });
  });

  describe('fetchText', () => {
    it('should return the file content', async () => {
      expect(await local.fetchText('foo')).toMatchSnapshot();
    });

    it('should throw an Error if file does not exists', async () => {
      expect.assertions(1);

      try {
        await local.fetchText('bar');
      } catch (e) {
        expect(e.message).toMatch(/no such file or directory/);
      }
    });
  });
});
