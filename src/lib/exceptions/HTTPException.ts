/**
 * HTTPException an extension of Error
 * has members
 * @param {Number} httpStatusCode
 * @param {String} message
 */
export class HTTPException extends Error {
  HTTPStatusCode: number;
  message: string;

  constructor(HTTPStatusCode: number, message: string) {
    super(message);
    this.HTTPStatusCode = HTTPStatusCode;
    this.message = message;
  }
}
