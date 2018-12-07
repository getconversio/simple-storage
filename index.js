'use strict';

const crypto = require('crypto'),
  presignedRoutes = require('./express/presignedRoutes');

class NotFoundError extends Error { }

/**
 * Generates a random filename with extension
 * @param  {string} data file content in base64 format
 * @param  {string} extension
 * @return {Promise}
 */
const generateFilename = (data, extension) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    hash.setEncoding('hex');
    hash.write(data);
    hash.on('finish', () => resolve(hash.read() + '.' + extension));
    hash.on('error', reject);
    hash.end();
  });
};

/**
 * Splits the given data url into an array consisting of the extension name and
 * the data.
 */
const splitDataUrl = s => {
  const dataIndex = s.indexOf('data:');
  const base64Index = s.indexOf('base64,');
  if (dataIndex === -1 || base64Index === -1) return null;

  // Extract e.g. "image/png".
  const fileType = s.substring(dataIndex + 5, base64Index - 1);
  const extension = fileType.split('/')[1];

  // Find data at the begining of the string after the "base64," part.
  const data = s.substring(base64Index + 7);
  return [extension, data];
};

const isDataUrl = s => s.indexOf('data:') === 0 && s.includes('base64,');

class Storage {
  constructor(options) {
    this.options = options;

    /* eslint global-require: off */
    this.storage = new (require(`./storage/${options.storageType}`))(options);
    this.baseUrl = options.baseUrl;
  }

  /**
   * Upload some json as text to the selected storage.
   * @param  {String}        fileName Name for the JSON file.
   * @param  {Object|string} content  Either an object to be serialized or an already serialized
   *                                  string
   * @return {Promise}                Resolves to the filename.
   */
  async uploadJson(fileName, content) {
    if (typeof content === 'object') content = JSON.stringify(content);
    return await this.storage.upload(fileName, content, { base64: false });
  }

  async uploadData(filename, content) {
    return await this.storage.upload(filename, content, { base64: false });
  }

  /**
   * Upload a file to the selected storage
   * @param  {string} fileContent in data url format
   * @return {Promise} will be resolved with the md5 hash filename
   */
  async upload(fileContent) {
    const split = splitDataUrl(fileContent);

    if (split === null) {
      throw new Error('Invalid fileContent: ' + String(fileContent).substring(0, 200));
    }

    const extension = split[0];
    const data = split[1];

    const filename = await generateFilename(data, extension);

    if (await this.storage.exists(filename)) return;

    await this.storage.upload(filename, data);

    return filename;
  }

  /**
   * Reads a text file
   * @param  {String} file
   * @return {Promise}
   */
  async fetchText(path) {
    if (!await this.storage.exists(path)) throw new NotFoundError(`File ${path} not found.`);
    return await this.storage.fetchText(path);
  }

  async fetchStream(path) {
    if (!await this.storage.exists(path)) throw new NotFoundError(`File ${path} not found.`);
    return this.storage.fetchStream(path);
  }

  /**
   * Resolve a file to a path
   * @param  {String} file it might be a data url encoded or a filename
   * @return {String}
   */
  resolve(file) {
    return isDataUrl(file) ? file : this.options.basePublicUrl + '/' + file;
  }

  /**
   * Remove a file from the selected storage
   * @param  {string} file
   * @return {Promise}
   */
  async remove(...args) {
    return this.storage.remove(...args);
  }

  async copy(...args) {
    return this.storage.copy(...args);
  }

  async exists(...args) {
    return this.storage.exists(...args);
  }

  getPresignedPutUrl(...args) {
    return this.storage.getPresignedPutUrl(...args);
  }
}

module.exports = { Storage, NotFoundError, presignedRoutes };
