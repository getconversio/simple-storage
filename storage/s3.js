'use strict';

const AWS = require('aws-sdk');

class S3 {
  constructor(options) {
    this.options = options;

    AWS.config.update({
      region: options.s3.region,
      accessKeyId: options.s3.accessKey,
      secretAccessKey: options.s3.secretKey
    });

    this.s3 = new AWS.S3();
  }

  /**
   * Builds an options object for S3 requests
   * @param  {String} filename
   * @return {Object}
   */
  getOptions(filename) {
    return {
      Bucket: this.options.s3.bucketName,
      Key: filename
    };
  }

  /**
   * Uploads a file to s3
   * @param  {string}  filename
   * @param  {string}  data        file content
   * @param  {Object}  opts        customize behaviour
   * @param  {boolean} opts.base64 Whether content is base64, default true.
   * @return {Promise}             Resolves to file name.
   */
  async upload(filename, data, opts = {}) {
    const params = this.getOptions(filename);
    params.Body = opts.base64 === false ? data : Buffer.from(data, 'base64');
    params.ACL = 'public-read';

    await this.s3.putObject(params).promise();

    return filename;
  }

  /**
   * Uploads a large file to S3. Use this instead of upload to get automatically
   * managed multipart uploads from streams or blobs.
   *
   * @param  {String}  filename The uploaded file's name
   * @param  {Object}  body     Readable Stream, Blob, Buffer, Typed Array, String.
   * @return {Promise}          Resolves to filename.
   */
  async largeUpload(filename, body) {
    const params = this.getOptions(filename);
    const opts = {
      partSize: 10 * 1024 * 1024, // 10MB
      queueSize: 2                // Parallelism
    };
    params.Body = body;
    params.ACL = 'authenticated-read';

    const data = await this.s3.upload(params, opts).promise();

    return data.Key;
  }

  /**
   * Check if a file exists on s3
   * @param  {string} filename
   * @return {Promise} will be resolved with a true/false value
   */
  async exists(filename) {
    try {
      await this.s3.headObject(this.getOptions(filename)).promise();
      return true;
    } catch (e) {
      if (Number(e.statusCode) === 404) {
        return false;
      }

      throw e;
    }
  }

  /**
   * Remove a file from s3
   * @param  {string} filename
   * @return {Promise}
   */
  async remove(filename) {
    await this.s3.deleteObject(this.getOptions(filename)).promise();
  }

  async copy(source, dest) {
    await this.s3.copyObject(Object.assign(this.getOptions(dest), { CopySource: `/${this.options.s3.bucketName}/${source}` })).promise();
  }

  /**
   * Request a pre-signed url with a unique key for a put operation
   * @param {String|Number} key - A unique key to identify the upload
   * @param {Number} [opts.expires] - Number of seconds that the URL will last.
   *                                  Default is 900, aka 15mins.
   * @returns {String} the pre-signed url
   */
  getPresignedPutUrl(key, { expires = 900 } = { }) {
    const params = this.getOptions(key);
    params.Expires = expires;
    params.ContentType = 'multipart/form-data';

    return this.s3.getSignedUrl('putObject', params);
  }

  /**
   * Request a pre-signed url with a unique key for a get operation
   * @param {String|Number} key - A unique key to identify the upload
   * @param {Number} [opts.expires] - Number of seconds that the URL will last.
   *                                  Default is 900, aka 15mins.
   * @returns {String} the pre-signed url
   */
  getPresignedGetUrl(key, { expires = 900 } = { }) {
    const params = this.getOptions(key);
    params.Expires = expires;

    return this.s3.getSignedUrl('getObject', params);
  }

  /**
   * Gets a file from S3
   * @param {Object} params - the params to send with the request
   * @returns {Promise} resolves with the file data
   */
  async retrieve(params) {
    return await this.s3.getObject(params).promise();
  }

  async fetchText(filename) {
    const data = await this.s3.getObject(this.getOptions(filename)).promise();
    return data.Body.toString();
  }

  async fetchStream(filename) {
    return await this.s3.getObject(this.getOptions(filename)).createReadStream();
  }
}

module.exports = S3;
