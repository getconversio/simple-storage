'use strict';

const nock = require('nock'),
  S3 = require('./s3');

const s3 = new S3({
  s3: {
    bucketName: 'conversio-test'
  }
});

describe('storage/s3', () => {
  beforeEach(() => nock.cleanAll());

  describe('largeUpload', () => {
    it('takes a filename and buffer and uploads it', async () => {
      const s3call = nock('https://conversio-test.s3.amazonaws.com')
        .put('/data.csv', 'email\n')
        .reply(200);

      await s3.upload('data.csv', Buffer.from('email\n'));

      expect(s3call.isDone()).toEqual(true);
    });
  });

  describe('upload', () => {
    it('should take a file string and save it', async () => {
      const s3call = nock('https://conversio-test.s3.amazonaws.com')
        .put('/data.gif', '47494638396101000100800000ffffff00000021f904000e')
        .reply(200);

      await s3.upload('data.gif', 'R0lGODlhAQABAIAAAP///wAAACH5BAAOw==');

      expect(s3call.isDone()).toEqual(true);
    });

    it('supports uploading bare text', async () => {
      const content = JSON.stringify({ hi: 'there' });
      const s3call = nock('https://conversio-test.s3.amazonaws.com')
        .put('/data.json', content)
        .reply(200);

      await s3.upload('data.json', content, { base64: false });

      expect(s3call.isDone()).toEqual(true);
    });
  });

  describe('exists', () => {
    it('should return true if a file exists', async () => {
      nock('https://conversio-test.s3.amazonaws.com')
        .head('/foo')
        .reply(200);

      expect(await s3.exists('foo')).toEqual(true);
    });

    it('should return false if a file does not exists', async () => {
      nock('https://conversio-test.s3.amazonaws.com')
        .head('/bar')
        .reply(404);

      expect(await s3.exists('bar')).toEqual(false);
    });
  });

  describe('fetchText', () => {
    it('should return the content', async () => {
      nock('https://conversio-test.s3.amazonaws.com')
        .get('/foo')
        .reply(200, 'foo');

      expect(await s3.fetchText('foo')).toEqual('foo');
    });

    it('should throw an Error if file does not exists', async () => {
      nock('https://conversio-test.s3.amazonaws.com')
        .get('/foo')
        .reply(404);

      expect.assertions(1);

      try {
        await s3.fetchText('foo');
      } catch (e) {
        expect(e.code).toMatch('NotFound');
      }
    });
  });

  describe('remove', () => {
    it('should remove a file if exists', async () => {
      const s3call = nock('https://conversio-test.s3.amazonaws.com')
        .delete('/foo')
        .reply(200);

      await s3.remove('foo');

      expect(s3call.isDone()).toEqual(true);
    });

    it('should raise an error if the file does not exist', async () => {
      nock('https://conversio-test.s3.amazonaws.com')
        .delete('/bar')
        .reply(404);

      expect.assertions(1);

      try {
        await s3.remove('bar');
      } catch (e) {
        expect(e.code).toMatch('NotFound');
      }
    });
  });
});
