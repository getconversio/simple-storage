'use strict';

const { exec } = require('child_process'),
  { promisify } = require('util'),
  { Readable } = require('stream'),
  { createReadStream, createWriteStream, copyFile, readFile, writeFile, exists, unlink } = require('fs');

class Local {
  constructor(options) {
    this.options = options;
  }

  getFullPath(filename) {
    return this.options.localDirectory + '/' + filename;
  }

  /**
   * Persist a file to disk. Creates folder if missing.
   *
   * @param  {string} filename
   * @param  {string}  data        file content
   * @param  {Object}  opts        customize behaviour
   * @param  {boolean} opts.base64 Whether content is base64, default true.
   * @return {Promise}             Resolves to file name.
   */
  async upload(filename, data, opts = { }) {
    const fullpath = this.getFullPath(filename);

    const [, destDir] = /^(.*)\/.+$/.exec(fullpath);

    await promisify(exec)(`mkdir -p ${destDir}`);

    if (data instanceof Readable) {
      await new Promise((resolve, reject) => {
        const fileStream = createWriteStream(fullpath);
        data.pipe(fileStream);
        data.on('error', err => reject(err));
        fileStream.on('finish', () => resolve());
      });
    } else {
      await promisify(writeFile)(fullpath, opts.base64 === false ? data : Buffer.from(data, 'base64'));
    }

    return filename;
  }

  /**
   * Check if a file exists on a local directory
   * @param  {string} filename
   * @return {Promise} will be resolved with a true/false value
   */
  async exists(filename) {
    return await promisify(exists)(this.getFullPath(filename));
  }

  /**
   * Reads a text file
   * @param  {String} file
   * @return {Promise}
   */
  async fetchText(filename) {
    const data = await promisify(readFile)(this.getFullPath(filename));
    return data.toString();
  }

  async fetchStream(filename) {
    return createReadStream(this.getFullPath(filename));
  }

  /**
   * Remove a file from a local directory
   * @param  {string} filename
   * @return {Promise}
   */
  async remove(filename) {
    await promisify(unlink)(this.getFullPath(filename));
  }

  /**
   * Dummy implementation to mimic S3
   * @param {String} key
   * @returns {Promise} resolves with the pre-signed url
   */
  async getPresignedPutUrl(key) {
    return this.options.baseUrl + this.options.apiPath + '/' + key;
  }

  async copy(source, dest) {
    await promisify(copyFile)(this.getFullPath(source), this.getFullPath(dest));
  }
}

module.exports = Local;
